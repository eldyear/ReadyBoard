import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { Zap, MonitorPlay, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react'

interface Order { id: string; counter_number: number; items: string[]; status: 'preparing' | 'ready' | 'archived' }

interface Props {
    boardId: string
    boardName?: string
}

const API = import.meta.env.VITE_API_BASE_URL || '/api'
const WS_BASE = import.meta.env.VITE_WS_BASE_URL || '/ws'

export default function BaristaPanel({ boardId, boardName }: Props) {
    const [orders, setOrders] = useState<Order[]>([])
    const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
    const [showClearModal, setShowClearModal] = useState(false)
    const [boards, setBoards] = useState<{id: string, name: string}[]>([])
    const [activeBoardId, setActiveBoardId] = useState<'all' | string>(boardId || 'all')

    useEffect(() => {
        const token = localStorage.getItem('rb_token')
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
        fetch(`${API}/boards`, { headers })
            .then(r => r.json())
            .then(d => setBoards(Array.isArray(d) ? d : []))
            .catch(() => {})
    }, [])

    // ── Load initial orders ────────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem('rb_token')
        const hdrs: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
        if (activeBoardId === 'all') {
            if (boards.length === 0) return
            Promise.all(boards.map(b => fetch(`${API}/orders?board_id=${b.id}`, { headers: hdrs }).then(r => r.json())))
                .then(results => {
                    const combined = results.flatMap(d => Array.isArray(d) ? d : [])
                    setOrders(combined)
                }).catch(() => {})
        } else {
            fetch(`${API}/orders?board_id=${activeBoardId}`, { headers: hdrs })
                .then(r => r.json())
                .then(d => setOrders(Array.isArray(d) ? d : []))
                .catch(() => { })
        }
    }, [activeBoardId, boards])

    // ── WebSocket live updates ─────────────────────────────────
    useEffect(() => {
        if (!activeBoardId) return
        if (activeBoardId === 'all' && boards.length === 0) return

        const boardIdsToConnect = activeBoardId === 'all' ? boards.map(b => b.id) : [activeBoardId]
        
        let activeSockets: WebSocket[] = []
        let retryTimers: ReturnType<typeof setTimeout>[] = []
        
        let connectedCount = 0
        setWsStatus('connecting')

        boardIdsToConnect.forEach((bId, idx) => {
            let ws: WebSocket
            let retryTimer: ReturnType<typeof setTimeout>
            let backoff = 1000

            const connect = () => {
                const proto = location.protocol === 'https:' ? 'wss' : 'ws'
                const url = WS_BASE.startsWith('/')
                    ? `${proto}://${location.host}${WS_BASE}?board_id=${bId}`
                    : `${WS_BASE}?board_id=${bId}`
                
                ws = new WebSocket(url)
                activeSockets[idx] = ws
                
                ws.onopen = () => { 
                    connectedCount++
                    if (connectedCount > 0) setWsStatus('connected')
                    backoff = 1000 
                }
                ws.onmessage = e => {
                    try {
                        const event = JSON.parse(e.data)
                        if (event.type === 'board_update' || event.type === 'BOARD_CONFIG_UPDATED') return
                        setOrders(prev => {
                            if (event.status === 'archived') return prev.filter(o => o.id !== event.order_id)
                            const exists = prev.find(o => o.id === event.order_id)
                            if (exists) return prev.map(o => o.id === event.order_id ? { ...o, status: event.status } : o)
                            return [...prev, { id: event.order_id, counter_number: event.counter_number, items: event.items || [], status: event.status }]
                        })
                    } catch { }
                }
                ws.onclose = () => {
                    connectedCount = Math.max(0, connectedCount - 1)
                    if (connectedCount === 0) setWsStatus('disconnected')
                    retryTimer = setTimeout(connect, backoff)
                    retryTimers[idx] = retryTimer
                    backoff = Math.min(backoff * 2, 30_000)
                }
                ws.onerror = () => ws.close()
            }
            connect()
        })

        return () => { 
            retryTimers.forEach(t => clearTimeout(t))
            activeSockets.forEach(ws => ws?.close()) 
        }
    }, [activeBoardId, boards])

    const updateStatus = async (id: string, status: 'ready' | 'archived') => {
        const token = localStorage.getItem('rb_token')
        const hdrs: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
        try {
            const res = await fetch(`${API}/orders/${id}/status`, {
                method: 'PUT',
                headers: hdrs,
                body: JSON.stringify({ status })
            })
            if (!res.ok) throw new Error('Failed')
            setOrders(prev => status === 'archived'
                ? prev.filter(o => o.id !== id)
                : prev.map(o => o.id === id ? { ...o, status } : o)
            )
        } catch (e) {
            console.error('Network error', e)
        }
    }

    const clearAllOrders = async () => {
        const token = localStorage.getItem('rb_token')
        const hdrs: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
        await Promise.all(orders.map(o =>
            fetch(`${API}/orders/${o.id}/status`, {
                method: 'PUT',
                headers: hdrs,
                body: JSON.stringify({ status: 'archived' })
            })
        ))
        setOrders([])
        setShowClearModal(false)
    }

    const preparing = orders.filter(o => o.status === 'preparing')
    const ready = orders.filter(o => o.status === 'ready')

    return (
        <div style={{ backgroundColor: '#fff', color: '#000', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
            {/* Clear Modal */}
            <AnimatePresence>
                {showClearModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setShowClearModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            style={{ background: '#fff', padding: '2.5rem', border: '1px solid #000', width: '100%', maxWidth: '400px' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ width: '64px', height: '64px', backgroundColor: '#ff3b30', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                <AlertTriangle color="#fff" size={32} />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.05em', margin: '0 0 0.5rem' }}>Clear Queue?</h3>
                            <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(0,0,0,0.6)', margin: '0 0 2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                                System will archive <strong style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 6px', color: '#000' }}>{orders.length}</strong> active orders. Destructive action.
                            </p>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button onClick={() => setShowClearModal(false)} style={{ flex: 1, padding: '1rem', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', cursor: 'pointer' }}>ABORT</button>
                                <button onClick={clearAllOrders} style={{ flex: 1, padding: '1rem', border: '1px solid #ff3b30', background: '#ff3b30', color: '#fff', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', cursor: 'pointer' }}>EXECUTE</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
                <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ width: '64px', height: '64px', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Zap color="#fff" size={24} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.05em', margin: 0 }}>
                                {activeBoardId === 'all' ? 'MASTER TERMINAL' : (boards.find(b => b.id === activeBoardId)?.name || boardName || 'TERMINAL')}
                            </h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '4px' }}>
                                <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(0,0,0,0.4)', margin: 0 }}>Live KDS</p>
                                <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', padding: '2px 6px', border: '1px solid #000', background: wsStatus === 'connected' ? '#000' : '#fff', color: wsStatus === 'connected' ? '#fff' : '#000' }}>
                                    {wsStatus === 'connected' ? 'LIVE' : wsStatus === 'connecting' ? 'CONNECTING...' : 'OFFLINE'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ position: 'relative' }}>
                            <select 
                                value={activeBoardId} 
                                onChange={e => setActiveBoardId(e.target.value)}
                                style={{
                                    padding: '1rem 2.5rem 1rem 1rem',
                                    border: '1px solid #000',
                                    background: '#fff',
                                    fontWeight: 900,
                                    fontSize: '10px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.2em',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    appearance: 'none',
                                    minWidth: '200px'
                                }}
                            >
                                <option value="all">All Boards</option>
                                {boards.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                            <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '8px' }}>▼</div>
                        </div>
                        {orders.length > 0 && (
                            <button onClick={() => setShowClearModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 1.5rem', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', cursor: 'pointer' }}>
                                <Trash2 size={16} /> PURGE
                            </button>
                        )}
                    </div>
                </header>

                <div style={{ border: '1px solid #000', background: '#fff', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #000', background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.05em', margin: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Zap size={24} /> QUEUE PROTOCOL
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', border: '1px solid rgba(0,0,0,0.1)', padding: '0.5rem 1rem', background: '#fff' }}>
                                {preparing.length} PREPARING / {ready.length} READY
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(0,0,0,0.4)' }}>
                                ← SWIPE →
                            </span>
                        </div>
                    </div>

                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, background: '#fff' }}>
                        <AnimatePresence mode="popLayout">
                            {[...preparing, ...ready].map(order => (
                                <SwipeableOrderCard
                                    key={order.id}
                                    order={order}
                                    onReady={() => updateStatus(order.id, 'ready')}
                                    onArchive={() => updateStatus(order.id, 'archived')}
                                />
                            ))}
                        </AnimatePresence>

                        {orders.length === 0 && (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.4, paddingTop: '4rem' }}>
                                <div style={{ width: '80px', height: '80px', background: '#f9f9f9', border: '1px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                    <MonitorPlay size={32} />
                                </div>
                                <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em' }}>AWAITING INPUT</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function SwipeableOrderCard({ order, onReady, onArchive }: { order: Order; onReady: () => void; onArchive: () => void }) {
    const x = useMotionValue(0)

    const bg = useTransform(x,
        [-150, -50, 0, 50, 150],
        ['#ff3b30', '#fffafa', '#f9f9f9', '#f0fff0', '#22c55e']
    )

    const leftHintOpacity = useTransform(x, [20, 80], [0, 1])
    const rightHintOpacity = useTransform(x, [-20, -80], [0, 1])

    const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
        if (info.offset.x > 80 && order.status !== 'ready') onReady()
        else if (info.offset.x < -80) onArchive()
    }

    const isReady = order.status === 'ready'

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            style={{ position: 'relative', overflow: 'hidden', border: '1px solid #000', marginBottom: '0.5rem' }}
        >
            {/* Swipe direction hints */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', pointerEvents: 'none' }}>
                <motion.div style={{ opacity: leftHintOpacity, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#000' }}>
                    <CheckCircle2 size={16} /> MARK READY
                </motion.div>
                <motion.div style={{ opacity: rightHintOpacity, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#fff' }}>
                    PURGE <Trash2 size={16} />
                </motion.div>
            </div>

            <motion.div
                drag="x"
                dragConstraints={{ left: -100, right: isReady ? 0 : 100 }}
                onDragEnd={handleDragEnd}
                style={{ x, background: bg, cursor: 'grab', display: 'flex', alignItems: 'stretch', minHeight: '90px' }}
                whileTap={{ cursor: 'grabbing' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
                <div style={{ padding: '1.5rem', display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        {/* Counter number */}
                        <div style={{ width: '64px', height: '64px', flexShrink: 0, background: isReady ? '#000' : '#fff', color: isReady ? '#fff' : '#000', border: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 900 }}>
                            {order.counter_number}
                        </div>

                        {/* Items list */}
                        {order.items && order.items.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '1rem', borderLeft: '1px dashed rgba(0,0,0,0.3)', minWidth: 0 }}>
                                <ul style={{ margin: 0, padding: 0, listStyle: 'none', maxHeight: '50px', overflowY: 'auto', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', lineHeight: 1.2 }}>
                                    {order.items.slice(0, 4).map((item, idx) => (
                                        <li key={idx} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            <span style={{ opacity: 0.5, marginRight: '4px' }}>&gt;</span> {item}
                                        </li>
                                    ))}
                                    {order.items.length > 4 && (
                                        <li style={{ opacity: 0.7, fontStyle: 'italic', marginTop: '2px', fontSize: '9px', fontFamily: 'sans-serif' }}>
                                            + {order.items.length - 4} MORE
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Status badge */}
                    <span style={{
                        fontSize: '10px', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase',
                        padding: '0.5rem 1rem',
                        border: isReady ? '1px solid #16a34a' : '1px solid #000',
                        background: isReady ? '#dcfce7' : '#000',
                        color: isReady ? '#16a34a' : '#fff',
                        flexShrink: 0,
                    }}>
                        {isReady ? 'READY FOR PICKUP' : 'AWAITING PROCESS'}
                    </span>
                </div>
            </motion.div>
        </motion.div>
    )
}
