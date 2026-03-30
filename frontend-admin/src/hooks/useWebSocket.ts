import { useEffect, useRef, useState, useCallback } from 'react'

type WSStatus = 'connecting' | 'connected' | 'disconnected'

interface UseWebSocketOptions {
    boardId: string
    onMessage?: (data: unknown) => void
    enabled?: boolean
}

const WS_BASE = import.meta.env.VITE_WS_BASE_URL || '/ws'

export function useWebSocket({ boardId, onMessage, enabled = true }: UseWebSocketOptions) {
    const wsRef = useRef<WebSocket | null>(null)
    const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const backoffRef = useRef(1000)
    const [status, setStatus] = useState<WSStatus>('disconnected')

    const connect = useCallback(() => {
        if (!enabled || !boardId) return

        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
        const host = window.location.hostname
        const wsUrl = WS_BASE.startsWith('/')
            ? `${protocol}://${host}${WS_BASE}?board_id=${boardId}`
            : `${WS_BASE}?board_id=${boardId}`

        setStatus('connecting')
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
            setStatus('connected')
            backoffRef.current = 1000 // reset backoff on success
        }

        ws.onmessage = (e) => {
            try {
                const parsed = JSON.parse(e.data)
                onMessage?.(parsed)
            } catch { /* ignore malformed */ }
        }

        ws.onclose = () => {
            setStatus('disconnected')
            // Exponential backoff: 1s → 2s → 4s → 8s → max 30s
            if (enabled) {
                retryRef.current = setTimeout(() => {
                    backoffRef.current = Math.min(backoffRef.current * 2, 30_000)
                    connect()
                }, backoffRef.current)
            }
        }

        ws.onerror = () => ws.close()
    }, [boardId, enabled, onMessage])

    useEffect(() => {
        connect()
        return () => {
            if (retryRef.current) clearTimeout(retryRef.current)
            wsRef.current?.close()
        }
    }, [connect])

    return { status }
}
