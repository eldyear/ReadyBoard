import { useEffect, useRef } from 'react'
// framer-motion removed

interface Order {
    id: string
    order_number?: string
    counter_number: string
    items?: string[]
    status: string
}

interface Props {
    orders: Order[]
    layoutPreset?: string
    menuConfig?: any
}

// Deterministic Hash omitted (obsolete)

export default function CustomThemeEngine({ orders, layoutPreset, menuConfig }: Props) {
    const iframeRef = useRef<HTMLIFrameElement>(null)

    // Bridge: send data to the iframe whenever orders change or when it loads
    const syncData = () => {
        if (layoutPreset === 'custom' && iframeRef.current?.contentWindow) {
            const bridgeOrders = orders.map(o => ({
                ...o,
                order_number: o.order_number || o.counter_number || o.id.slice(-4),
                items: o.items || []
            }))
            iframeRef.current.contentWindow.postMessage({
                type: 'READYBOARD_SYNC',
                payload: bridgeOrders
            }, '*')
        }
    }

    useEffect(() => {
        syncData()
    }, [orders, layoutPreset])

    if (layoutPreset === 'custom') {
        const rawHtml = menuConfig?.custom_html || '<div style="color:black;text-align:center;padding:2rem;font-family:monospace;font-weight:900;">NO CUSTOM HTML CONFIGURED / ADMIN PANEL NEEDED</div>'

        const sdkScript = `
    <script>
window.ReadyBoard = {
    onUpdate: (callback) => {
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'READYBOARD_SYNC') {
                callback(event.data.payload);
            }
        });
    }
};
        </script >
    `
        const injectedSrc = `${sdkScript} \n${rawHtml} `

        return (
            <iframe
                ref={iframeRef}
                onLoad={syncData}
                srcDoc={injectedSrc}
                style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    width: '100vw',
                    height: '100vh',
                    border: 'none',
                    background: 'white',
                    zIndex: 9999
                }}
            />
        )
    }

    return null
}
