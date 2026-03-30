import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { MonitorPlay, Zap, ArrowRight, Trash2, CheckCircle2, Maximize2, Minimize2, AlertTriangle } from 'lucide-react'
import SelectDropdown from '../components/SelectDropdown'
interface Board { id: string; name: string; slug: string }
interface Order { id: string; order_number?: string; counter_number: string; items?: string[]; status: 'preparing' | 'ready' }

const API = import.meta.env.VITE_API_BASE_URL || '/api'

// ── Base64 encoded short 440Hz beep (WAV, ~0.2s) ──────────────
const BEEP_B64 = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUoGAAAAAAAAAAAAAAAAAAAA//8AAAAA/v8CAAAA/////wAA//8AAAAA/v8CAAQAAQD+/wAA//8CAAQAAAD+/wQAAgD8/wQABAD8/wQABAD8/wYABAD6/woABgD2/wwACgD0/w4ADAD0/w4ADAD0/xAACgD0/xIADADy/xIADgDy/xIADgDy/xIADgDw/xQAEADw/xQAEADu/xYAEgDu/xYAEgDu/xgAEADu/xgAEADs/xgAEgDs/xoAEgDq/xwAFADq/xwAFADo/xwAFgDo/x4AFgDm/yAAmgDm/yAAFgDk/yIAGADk/yIAGADi/yQAGgDg/yQAHADg/yYAGgDg/ygAGgDe/ygAHADc/yoAHgDa/ywAIADY/y4AIgDW/y4AJADW/y4AIgDW/zAAIgDU/zAAJADS/zIAJADQ/zQAJgDO/zYAKADM/zgAKgDI/zoALgDG/zwALgDE/z4AMADC/0AAMADC/0AAMADC/0AAMADALL...'

function playBeep() {
    try {
        const audio = new Audio(BEEP_B64)
        audio.volume = 0.4
        audio.play().catch(() => {/* Ignore autoplay policy rejections */ })
    } catch {/* Ignore */ }
}

export default function BaristaPanel() {
    const { token } = useAuth()
    const [boards, setBoards] = useState<Board[]>([])
    const [boardId, setBoardId] = useState('')
    const [orders, setOrders] = useState<Order[]>([])
    const [input, setInput] = useState('')
    const [isFocusMode, setIsFocusMode] = useState(false)
    const [isMuted] = useState(false)
    const [showClearModal, setShowClearModal] = useState(false)
    const prevOrderIdsRef = useRef<Set<string>>(new Set())

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    // ── Focus mode body class ──────────────────────────────────
    useEffect(() => {
        if (isFocusMode) {
            document.body.classList.add('focus-mode-active')
        } else {
            document.body.classList.remove('focus-mode-active')
        }
        return () => document.body.classList.remove('focus-mode-active')
    }, [isFocusMode])

    // ── Fetch boards on mount ──────────────────────────────────
    useEffect(() => {
        fetch(`${API}/boards`, { headers })
            .then(r => r.json())
            .then(d => { if (Array.isArray(d)) { setBoards(d); if (d.length) setBoardId(d[0].id) } })
    }, [])

    // ── Fetch orders when board changes ───────────────────────
    useEffect(() => {
        if (!boardId) return
        fetch(`${API}/orders?board_id=${boardId}`, { headers })
            .then(r => r.json())
            .then(d => setOrders(Array.isArray(d) ? d : []))
    }, [boardId])

    // ── Audio beep on new orders  ──────────────────────────────
    useEffect(() => {
        const newIds = new Set(orders.map(o => o.id))
        const hasNew = orders.some(o => !prevOrderIdsRef.current.has(o.id))
        if (hasNew && prevOrderIdsRef.current.size > 0 && !isMuted) {
            playBeep()
        }
        prevOrderIdsRef.current = newIds
    }, [orders, isMuted])

    const refreshOrders = useCallback(() => {
        if (!boardId) return
        fetch(`${API}/orders?board_id=${boardId}`, { headers })
            .then(r => r.json())
            .then(d => setOrders(Array.isArray(d) ? d : []))
    }, [boardId, token])

    const addOrder = async () => {
        if (!input || !boardId) return

        try {
            const res = await fetch(`${API}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ board_id: boardId, counter_number: input }),
            })
            if (res.ok) {
                setInput('')
                refreshOrders()
            } else {
                console.error('Failed to create order:', res.status)
            }
        } catch (err) {
            console.error('Network error during order creation:', err)
        }
    }

    const updateStatus = async (id: string, status: 'ready' | 'archived') => {
        try {
            const res = await fetch(`${API}/orders/${id}/status`, {
                method: 'PUT', headers,
                body: JSON.stringify({ status }),
            })
            if (!res.ok) {
                console.error('Failed to update order status:', res.status)
                return
            }
            setOrders(prev => status === 'archived'
                ? prev.filter(o => o.id !== id)
                : prev.map(o => o.id === id ? { ...o, status } : o)
            )
        } catch (error) {
            console.error('Network error during update:', error)
        }
    }

    const clearAllOrders = async () => {
        // Archive all orders sequentially
        await Promise.all(orders.map(o =>
            fetch(`${API}/orders/${o.id}/status`, {
                method: 'PUT', headers,
                body: JSON.stringify({ status: 'archived' }),
            })
        ))
        setOrders([])
        setShowClearModal(false)
    }

    const preparing = orders.filter(o => o.status === 'preparing')
    const ready = orders.filter(o => o.status === 'ready')
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓']
    const handleKey = (k: string) => {
        if (k === '⌫') { setInput(p => p.slice(0, -1)); return }
        if (k === '✓') { addOrder(); return }
        if (input.length < 3) setInput(p => p + k)
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    }
    const itemVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    }

    return (
        <>
            {/* Clear All Confirmation Modal */}
            <AnimatePresence>
                {showClearModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowClearModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white border border-black p-10 max-w-sm w-full"
                        >
                            <div className="w-16 h-16 bg-[#ff3b30] flex items-center justify-center mb-6">
                                <AlertTriangle className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="font-black text-2xl uppercase tracking-tighter mb-2">Clear Queue?</h3>
                            <p className="text-[10px] text-black/60 font-black uppercase tracking-[0.2em] mb-8 border-b border-black/10 pb-6">
                                System will archive <strong className="text-black bg-black/5 px-2">{orders.length}</strong> active orders. Destructive action.
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowClearModal(false)}
                                    className="btn-ghost flex-1"
                                >
                                    ABORT
                                </button>
                                <button
                                    onClick={clearAllOrders}
                                    className="btn-primary flex-1 bg-[#ff3b30] text-white hover:bg-black border border-[#ff3b30] hover:border-black"
                                >
                                    EXECUTE
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="max-w-4xl mx-auto space-y-6"
            >
                {/* ── Header ────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-black/10 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-black flex items-center justify-center">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-black text-3xl sm:text-4xl uppercase tracking-tighter">Barista Terminal</h1>
                            <p className="text-[10px] mt-1 text-black/40 font-black uppercase tracking-[0.2em]">High velocity order entry system</p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Clear All */}
                        {orders.length > 0 && (
                            <button
                                onClick={() => setShowClearModal(true)}
                                className="flex items-center gap-2 px-4 py-3 border transition-colors text-[10px] font-black uppercase tracking-[0.2em] bg-white border-black/10 hover:bg-[#ff3b30] hover:text-white hover:border-[#ff3b30]"
                                title="Clear all orders"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">PURGE</span>
                            </button>
                        )}

                        {/* Focus Mode Toggle */}
                        <button
                            onClick={() => setIsFocusMode(!isFocusMode)}
                            className={`flex items-center gap-2 px-4 py-3 border transition-colors text-[10px] font-black uppercase tracking-[0.2em] ${isFocusMode
                                ? 'bg-black border-black text-white'
                                : 'bg-white border-black/10 text-black hover:border-black'}`}
                        >
                            {isFocusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            <span className="hidden sm:inline">FOCUS</span>
                        </button>

                        {/* Board selector */}
                        {boards.length > 0 && (
                            <div className="relative min-w-[200px]">
                                <SelectDropdown
                                    className="pl-8" // Add padding to make room for the icon
                                    value={boardId}
                                    onChange={v => setBoardId(v)}
                                    options={boards.map(b => ({ label: b.name, value: b.id }))}
                                    placeholder="SELECT BOARD"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Ограничиваем общую высоту, чтобы футер не улетал вниз */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[calc(100vh-180px)] items-start">

                    {/* Left: Keypad (делаем его плотнее) */}
                    <div className="lg:col-span-5 flex flex-col gap-4 h-full">
                        {/* Stats - уменьшаем padding */}
                        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
                            <div className="bg-white border border-black p-4 text-center">
                                <div className="text-3xl font-black uppercase tracking-tighter">{preparing.length}</div>
                                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-black/40">Preparing</div>
                            </div>
                            <div className="bg-[#f9f9f9] border border-black p-4 text-center">
                                <div className="text-3xl font-black uppercase tracking-tighter">{ready.length}</div>
                                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ff3b30]">Ready</div>
                            </div>
                        </motion.div>

                        {/* Keypad - уменьшаем высоты кнопок */}
                        <motion.div variants={itemVariants} className="bg-white border border-black p-5 flex-1 flex flex-col shadow-2xl shadow-black/5">
                            <div className="bg-[#f9f9f9] border border-black/10 text-center text-5xl font-black mb-4 h-20 flex items-center justify-center tracking-tighter shadow-inner">
                                {input || <span className="text-black/20 font-mono">---</span>}
                            </div>
                            <div className="grid grid-cols-3 gap-2 flex-1">
                                {keys.map(k => (
                                    <motion.button
                                        key={k}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleKey(k)}
                                        className={`flex items-center justify-center text-2xl font-black uppercase transition-all shadow-md shadow-black/5 hover:shadow-lg hover:shadow-black/10
                                            ${k === '✓' ? 'bg-[#ff3b30] text-white' : 'bg-white text-black border border-black/10 hover:border-black'}`}
                                    >
                                        {k === '✓' ? <ArrowRight className="w-6 h-6" /> : k}
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right: Active Orders */}
                    <div className="lg:col-span-7 xl:col-span-7">
                        <motion.div
                            variants={itemVariants}
                            /* Фиксируем высоту: экран минус отступы сверху */
                            className="bg-white border border-black p-0 h-[calc(100vh-180px)] flex flex-col overflow-hidden"
                        >
                            <div className="px-8 py-6 border-b border-black flex items-center justify-between bg-[#f9f9f9] shrink-0">
                                <h2 className="font-black uppercase tracking-tighter text-2xl flex items-center gap-4">
                                    <Zap className="w-6 h-6 text-black" />
                                    QUEUE PROTOCOL
                                </h2>
                                <span className="text-[10px] font-black text-black uppercase tracking-[0.2em] border border-black/10 px-4 py-2 bg-white">
                                    SCROLL TO VIEW ↓
                                </span>
                            </div>

                            {/* ВОТ ЭТОТ БЛОК ТЕПЕРЬ СКРОЛЛИТСЯ */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white scrollbar-thin scrollbar-thumb-black">
                                <AnimatePresence mode="popLayout">
                                    {[...preparing, ...ready].map((order) => (
                                        <SwipeableOrderCard
                                            key={order.id}
                                            order={order}
                                            onReady={() => updateStatus(order.id, 'ready')}
                                            onArchive={() => updateStatus(order.id, 'archived')}
                                        />
                                    ))}
                                </AnimatePresence>

                                {orders.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-black/40 space-y-6 pt-16">
                                        <MonitorPlay className="w-8 h-8 opacity-50" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">EMPTY QUEUE</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </>
    )
}

function SwipeableOrderCard({ order, onReady, onArchive }: {
    order: Order; onReady: () => void; onArchive: () => void
}) {
    const x = useMotionValue(0)

    const bg = useTransform(x,
        [-150, -50, 0, 50, 150],
        [
            '#ff3b30', // left (archive)
            '#fffafa',
            '#ffffff', // center
            '#f0fff0',
            '#22c55e'  // right (ready)
        ]
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
            className="relative overflow-hidden bg-[#f9f9f9] border border-black"
        >
            {/* Drag direction hints */}
            <div className="absolute inset-0 flex items-center justify-between px-8 pointer-events-none">
                <motion.div style={{ opacity: leftHintOpacity }} className="flex items-center gap-3 text-black font-black uppercase tracking-[0.2em] text-[10px]">
                    <CheckCircle2 className="w-4 h-4" /> MARK READY
                </motion.div>
                <motion.div style={{ opacity: rightHintOpacity }} className="flex items-center gap-3 text-white font-black uppercase tracking-[0.2em] text-[10px]">
                    PURGE <Trash2 className="w-4 h-4" />
                </motion.div>
            </div>

            <motion.div
                drag="x"
                dragConstraints={{ left: -100, right: isReady ? 0 : 100 }}
                onDragEnd={handleDragEnd}
                style={{ x, background: bg }}
                whileTap={{ cursor: 'grabbing' }}
                className="relative border text-black p-6 cursor-grab flex items-center justify-between min-h-[90px]"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
                <div className="relative z-10 flex items-center gap-6">
                    <div className={`w-16 h-16 flex items-center justify-center border font-black text-3xl
                        ${isReady
                            ? 'bg-black border-black text-white'
                            : 'bg-white border-black text-black'}`
                    }>
                        {order.counter_number}
                    </div>
                </div>

                <div className="relative z-10 shrink-0">
                    <span className={`
                        ${isReady
                            ? 'bg-[#ff3b30]/10 text-[#ff3b30]' // 10% прозрачности красного на фон
                            : 'bg-black/5 text-black/40'      // Легкий серый для режима ожидания
                        } 
                        /* Убираем border (если он был в badge-ready) и настраиваем стиль */
                        text-[13px] 
                        px-5 py-2.5 
                        font-black 
                        tracking-[0.15em] 
                        inline-block
                        min-w-[160px] 
                        text-center
                        rounded-sm /* Можно добавить совсем легкое скругление для мягкости */
                    `}>
                        {isReady ? 'READY FOR PICKUP' : 'AWAITING PROCESS'}
                    </span>
                </div>
            </motion.div>
        </motion.div>
    )
}
