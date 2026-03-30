import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import StandardBoard from '../components/StandardBoard'
import ProBoard from '../components/ProBoard'
import type { LayoutPreset } from '../components/StandardBoard'
import NewReadyToast from '../components/NewReadyToast'
import TickerFooter from '../components/TickerFooter'
import BaristaPanel from '../components/BaristaPanel'

interface Order {
    id: string
    order_number?: string
    counter_number: string
    items: string[]
    status: 'preparing' | 'ready' | 'archived'
}

interface BoardConfig {
    id: string
    user_id: string
    name: string
    display_mode: 'standard' | 'pro'
    linked_categories?: string[]
    menu_config: {
        ticker_text?: string
        ticker_speed?: number
        ticker_color?: string
        menu_items?: { name: string; price: string; image?: string }[]
        background_image?: string
        bg_type?: string
        bg_value?: string
        text_color?: string
        font_size_scale?: number
        ready_color?: string
        preparing_color?: string
        chime_enabled?: boolean
        layout_preset?: LayoutPreset
        hide_menu?: boolean
        main_text?: string
        main_text_color?: string
    }
}

type MC = Exclude<BoardConfig['menu_config'], undefined>
function parseMC(raw: MC | string | null | undefined): MC {
    if (!raw) return {} as MC
    if (typeof raw === 'string') {
        try { return JSON.parse(raw) as MC } catch { return {} as MC }
    }
    return raw
}

const API = import.meta.env.VITE_API_BASE_URL || '/api'
const WS_BASE = import.meta.env.VITE_WS_BASE_URL || '/ws'

function useDisplayWebSocket(boardId: string, userId: string, linkedCategories: string[] | undefined, onEvent: (e: any) => void) {
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')

    useEffect(() => {
        if (!boardId) return
        let ws: WebSocket
        let retryTimer: ReturnType<typeof setTimeout>
        let backoff = 1000

        const connect = () => {
            const proto = location.protocol === 'https:' ? 'wss' : 'ws'
            const params = new URLSearchParams({ board_id: boardId })
            if (userId) params.append('user_id', userId)
            if (linkedCategories && linkedCategories.length > 0) {
                params.append('linked_categories', linkedCategories.join(','))
            }
            
            const url = WS_BASE.startsWith('/')
                ? `${proto}://${location.host}${WS_BASE}?${params.toString()}`
                : `${WS_BASE}?${params.toString()}`

            setStatus('connecting')
            ws = new WebSocket(url)
            ws.onopen = () => { setStatus('connected'); backoff = 1000 }
            ws.onmessage = e => {
                try { onEvent(JSON.parse(e.data)) } catch { }
            }
            ws.onclose = () => {
                setStatus('disconnected')
                retryTimer = setTimeout(connect, backoff)
                backoff = Math.min(backoff * 2, 30_000)
            }
            ws.onerror = () => ws.close()
        }

        connect()
        return () => { clearTimeout(retryTimer); ws?.close() }
    }, [boardId, userId, linkedCategories, onEvent])

    return status
}

export default function BoardDisplay() {
    // Check URL pattern: /:id, /:boardId?mode=barista or /barista/:boardId or ?id=... or legacy ?board_id=...
    const { boardId: paramBoardId, id: paramId } = useParams()
    const [searchParams] = useSearchParams()

    // Resolve ID
    const boardId = paramBoardId || paramId || searchParams.get('id') || searchParams.get('board_id') || ''

    // Resolve mode
    const pathMode = window.location.pathname.startsWith('/barista') ? 'barista' : ''
    const mode = pathMode || searchParams.get('mode') || ''

    const [board, setBoard] = useState<BoardConfig | null>(null)
    const [orders, setOrders] = useState<Order[]>([])
    const [toastOrder, setToastOrder] = useState<number | null>(null)
    const [isOnline, setIsOnline] = useState(navigator.onLine)
    const chimeRef = { current: typeof AudioContext !== 'undefined' ? new AudioContext() : null }

    useEffect(() => {
        const onOnline = () => setIsOnline(true)
        const onOffline = () => setIsOnline(false)
        window.addEventListener('online', onOnline)
        window.addEventListener('offline', onOffline)
        return () => {
            window.removeEventListener('online', onOnline)
            window.removeEventListener('offline', onOffline)
        }
    }, [])

    useEffect(() => {
        if (!boardId) return
        fetch(`${API}/boards/public/${boardId}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) return
                setBoard(data)
                localStorage.setItem(`rb_board_backup_${boardId}`, JSON.stringify(data))
            })
            .catch(() => {
                try {
                    const cached = localStorage.getItem(`rb_board_backup_${boardId}`)
                    if (cached) setBoard(JSON.parse(cached))
                } catch { }
            })
    }, [boardId])

    if (mode === 'barista' && boardId) {
        return <BaristaPanel boardId={boardId} boardName={board?.name} />
    }

    useEffect(() => {
        if (!board?.id) return
        fetch(`${API}/orders?board_id=${board.id}`)
            .then(r => r.json())
            .then(d => {
                const arr = Array.isArray(d) ? d : []
                setOrders(arr)
                localStorage.setItem('rb_orders_backup', JSON.stringify(arr))
            })
            .catch(() => {
                // If offline or backend unreachable, try rehydrating gracefully
                try {
                    const cached = localStorage.getItem('rb_orders_backup')
                    if (cached) setOrders(JSON.parse(cached))
                } catch { }
            })
    }, [board?.id])

    useEffect(() => {
        if (!board?.menu_config) return
        const mc = parseMC(board.menu_config)
        const root = document.documentElement

        if (mc.ready_color) root.style.setProperty('--clr-ready', mc.ready_color)
        if (mc.preparing_color) root.style.setProperty('--clr-preparing', mc.preparing_color)
        if (mc.font_size_scale) root.style.setProperty('--font-scale', String(mc.font_size_scale))
        if (mc.text_color) root.style.setProperty('--clr-text', mc.text_color)

        if (mc.bg_type === 'color') {
            root.style.setProperty('--clr-bg', mc.bg_value || '#0A0A0F')
            root.style.setProperty('--bg-image', 'none')
        } else if (mc.bg_type === 'gradient') {
            root.style.setProperty('--bg-image', mc.bg_value || 'none')
        } else if (mc.bg_type === 'image') {
            root.style.setProperty('--bg-image', `url(${mc.bg_value})`)
        }
    }, [board])

    const playChime = useCallback(() => {
        const ctx = chimeRef.current
        if (!ctx) return
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.setValueAtTime(880, ctx.currentTime)
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.5)
    }, [])

    const handleEvent = useCallback((event: any) => {
        if (event.type === 'TERMINAL_UNPAIR') {
            console.log('Unpair command received from Admin')
            localStorage.removeItem('rb_terminal_id')
            window.location.href = '/tv'
            return
        }

        if (event.type === 'board_update' || event.type === 'BOARD_CONFIG_UPDATED') {
            setBoard(event.board)
            return
        }

        setOrders(prev => {
            let next = prev
            if (event.status === 'archived') {
                next = prev.filter(o => o.id !== event.order_id)
            } else {
                const exists = prev.find(o => o.id === event.order_id)
                if (exists) {
                    next = prev.map(o => o.id === event.order_id ? { ...o, status: event.status } : o)
                } else {
                    next = [...prev, { id: event.order_id, counter_number: event.counter_number, items: event.items || [], status: event.status }]
                }
            }
            // Snapshot backup payload
            localStorage.setItem('rb_orders_backup', JSON.stringify(next))
            return next
        })

        if (event.status === 'ready') {
            setToastOrder(event.counter_number)
            if (board?.menu_config?.chime_enabled !== false) playChime()
            setTimeout(() => setToastOrder(null), 4000)
        }
    }, [board, playChime])

    const wsStatus = useDisplayWebSocket(board?.id || '', board?.user_id || '', board?.linked_categories, handleEvent)

    if (!boardId) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '1.5rem', fontFamily: 'Inter, sans-serif', color: '#000', backgroundColor: '#fff' }}>
            Board ID not provided. Available routes: <br /><br />
            <code style={{ background: '#f0f0f0', padding: '0.5rem', margin: '0 0.5rem' }}>/board_id</code> (Customer Display) <br /><br />
            <code style={{ background: '#f0f0f0', padding: '0.5rem', margin: '0 0.5rem' }}>/barista/board_id</code> (Kitchen/Barista System)
        </div>
    )

    const preparing = orders.filter(o => o.status === 'preparing')
    const ready = orders.filter(o => o.status === 'ready')
    const mc = parseMC(board?.menu_config)

    return (
        <div className="board-wrapper relative">
            {(!isOnline || wsStatus !== 'connected') && (
                <div className="absolute top-4 left-4 z-50 bg-black/80 backdrop-blur-md text-white px-4 py-2 border border-white/20 flex items-center gap-3 shadow-2xl">
                    <div className="w-2 h-2 rounded-full bg-[#ff3b30] animate-pulse" />
                    <span className="font-mono text-[10px] uppercase font-black tracking-widest text-white/90">
                        {isOnline ? '[ WS_DISCONNECTED ]' : '[ SYSTEM_OFFLINE // CACHE_FLIGHT ]'}
                    </span>
                </div>
            )}
            <div className={`connection-badge connection-badge--${wsStatus} hidden`}>
                {wsStatus === 'connected' ? '● LIVE' : wsStatus === 'connecting' ? '○ CONNECTING' : '✕ OFFLINE'}
            </div>

            {!board ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                    Loading board...
                </div>
            ) : board.display_mode === 'pro' ? (
                <ProBoard
                    preparing={preparing}
                    ready={ready}
                    menuItems={mc.menu_items || []}
                    backgroundImage={mc.background_image || ''}
                    layoutPreset={mc.layout_preset}
                    hideMenu={mc.hide_menu}
                    menuConfig={mc}
                />
            ) : (
                <StandardBoard
                    preparing={preparing}
                    ready={ready}
                    layoutPreset={mc.layout_preset}
                    menuConfig={mc}
                />
            )}

            <TickerFooter
                text={mc.ticker_text || ''}
                speed={mc.ticker_speed}
                color={mc.ticker_color}
                mainText={mc.main_text}
                mainTextColor={mc.main_text_color}
            />

            {toastOrder !== null && <NewReadyToast orderNumber={toastOrder} />}
        </div>
    )
}
