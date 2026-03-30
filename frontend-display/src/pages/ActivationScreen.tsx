import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import BoardDisplay from './BoardDisplay'

const API = import.meta.env.VITE_API_BASE_URL || '/api'

export default function ActivationScreen() {
    const [searchParams] = useSearchParams()
    const id = searchParams.get('id')

    const [pairingCode, setPairingCode] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [linked, setLinked] = useState<boolean>(false)
    const [isLoadingCode, setIsLoadingCode] = useState<boolean>(true)
    const navigate = useNavigate()

    if (id) {
        return <BoardDisplay />
    }

    useEffect(() => {
        const fetchCode = async () => {
            try {
                // Generate a simple fingerprint (or just use random string for display)
                const fingerprint = Math.random().toString(36).substring(2, 10)

                const res = await fetch(`${API}/pairing/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fingerprint })
                })

                if (res.ok) {
                    const data = await res.json()
                    setPairingCode(data.pairing_code)
                } else {
                    setError('FAILED TO GENERATE CODE')
                }
            } catch (err) {
                console.error("Error fetching pairing code:", err)
                setError('NETWORK ERROR')
            } finally {
                setIsLoadingCode(false)
            }
        }

        fetchCode()

        // Refresh code every 9 minutes (expires in 10 mins)
        const interval = setInterval(fetchCode, 9 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (!pairingCode) return

        // 2. Connect to WebSockets to listen for TERMINAL_LINKED
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'

        // Use the Nginx reverse proxy endpoint or Vite proxy endpoint on the same host
        let wsUrl = `${wsProtocol}//${window.location.host}/ws?board_id=${pairingCode}`

        if (import.meta.env.VITE_WS_URL) {
            wsUrl = `${import.meta.env.VITE_WS_URL}?board_id=${pairingCode}`
        } else if (import.meta.env.VITE_WS_BASE_URL) {
            wsUrl = `${wsProtocol}//${window.location.host}${import.meta.env.VITE_WS_BASE_URL}?board_id=${pairingCode}`
        }

        const ws = new WebSocket(wsUrl)

        ws.onopen = () => console.log('Listening for activation event...')

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                if (data.type === 'TERMINAL_LINKED' && data.board_id) {
                    console.log('Terminal linked successfully. Transitioning...')
                    setLinked(true)
                    localStorage.setItem('rb_terminal_id', data.board_id)
                    setTimeout(() => {
                        navigate(`/${data.board_id}`, { replace: true })
                    }, 1000)
                }
            } catch (err) {
                console.error('Error parsing WS message', err)
            }
        }

        ws.onerror = (err) => {
            console.error('WebSocket error', err)
            setError('WS CONNECTION LOST. RECONNECTING...')
        }

        ws.onclose = () => {
            console.log('WebSocket closed. Retrying in 3s...')
            setTimeout(() => window.location.reload(), 3000)
        }

        return () => ws.close()
    }, [pairingCode, navigate])

    return (
        <div className="activation-screen">
            <div className="activation-container">

                <div className="activation-corner activation-corner--tl" />
                <div className="activation-corner activation-corner--tr" />
                <div className="activation-corner activation-corner--bl" />
                <div className="activation-corner activation-corner--br" />

                <h1 className="activation-title">
                    Activate Terminal
                </h1>

                <p className="activation-subtitle">
                    Visit <strong>readyboard.com/activate</strong> and enter the code below
                </p>

                {error ? (
                    <div className="activation-error">
                        {error}
                    </div>
                ) : (
                    <div className={`activation-code-box ${linked ? 'activation-code-box--linked' : ''}`}>
                        {linked ? 'SYSTEM_LINKED' : (isLoadingCode ? '...' : (pairingCode || '----'))}
                    </div>
                )}

                <div className="activation-waiting">
                    <div className="activation-waiting-line" />
                    <p className="activation-waiting-text">
                        Waiting for connection...
                    </p>
                    <div className="activation-dots">
                        <div className="activation-dot" />
                        <div className="activation-dot" />
                        <div className="activation-dot" />
                    </div>
                </div>
            </div>

            <div className="activation-version">
                ReadyBoard Terminal OS v1.0
            </div>
        </div>
    )
}
