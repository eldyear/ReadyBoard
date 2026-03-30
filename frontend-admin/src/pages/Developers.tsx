import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Key, Webhook, Code2, PlaySquare, BookOpen, Copy, CheckCircle2, Zap, Trash2, Send, Lock } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const API = import.meta.env.VITE_API_BASE_URL || '/api'

interface Board {
    id: string;
    name: string;
    slug: string;
    display_mode: string;
    is_active: boolean;
}

const TABS = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'apikeys', label: 'API Keys', icon: Key },
    { id: 'ingest', label: 'Order Ingest API', icon: Send },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
    { id: 'custom_html', label: 'Custom HTML Guide', icon: Code2 },
]

export default function Developers() {
    const { token } = useAuth()
    const [activeTab, setActiveTab] = useState('overview')
    const [boards, setBoards] = useState<Board[]>([])
    const [apiKey, setApiKey] = useState('')
    const [loading, setLoading] = useState(true)
    const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({})
    const [toastMessage, setToastMessage] = useState('')

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    const fetchConfig = () => {
        Promise.all([
            fetch(`${API}/auth/me`, { headers }).then(r => r.json()),
            fetch(`${API}/boards`, { headers }).then(r => r.json())
        ])
            .then(([userData, boardsData]) => {
                if (userData && userData.api_key) setApiKey(userData.api_key)
                setBoards(Array.isArray(boardsData) ? boardsData : [])
            })
            .finally(() => setLoading(false))
    }

    useEffect(fetchConfig, [])

    const showToast = (msg: string) => {
        setToastMessage(msg)
        setTimeout(() => setToastMessage(''), 3000)
    }

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopiedMap(prev => ({ ...prev, [id]: true }))
        setTimeout(() => setCopiedMap(prev => ({ ...prev, [id]: false })), 2000)
        showToast('Copied to clipboard')
    }

    const handleGenerateKey = async () => {
        try {
            const res = await fetch(`${API}/auth/api-key`, { method: 'POST', headers })
            if (res.ok) {
                const data = await res.json()
                setApiKey(data.api_key)
                showToast('Master API Key Generated Successfully')
            }
        } catch (e) { }
    }

    const handleRevokeKey = async () => {
        if (!window.confirm("WARNING: This will immediately break any POS integrations relying on this Master Key. Proceed?")) return
        try {
            const res = await fetch(`${API}/auth/api-key`, { method: 'DELETE', headers })
            if (res.status === 204 || res.ok) {
                setApiKey('')
                showToast('Master API Key Revoked')
            }
        } catch (e) { }
    }

    const handleTestOrder = async (boardId: string, apiKey: string) => {
        const orderPayload = {
            board_id: boardId,
            counter_number: "777",
            order_number: "777",
            status: "ready",
            items: ["1x Code Refactor", "2x Espresso"]
        }

        try {
            const res = await fetch(`${API}/v1/orders`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderPayload)
            })

            if (res.ok) {
                showToast('Test order dispatched to TV display!')
            } else {
                showToast('Failed to dispatch test order.')
            }
        } catch (e) {
            showToast('Network error during test order.')
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 p-6 font-sans text-black">

            {/* Header */}
            <div className="flex items-center gap-6 border-b-4 border-black pb-8">
                <div className="w-16 h-16 bg-black flex items-center justify-center shrink-0">
                    <Terminal className="w-8 h-8 text-white" />
                </div>
                <div>
                    <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">Developer Portal</h1>
                    <p className="text-[10px] mt-2 font-black uppercase tracking-[0.3em] text-black/40">Build & Integrate Custom Order Workflows</p>
                </div>
            </div>

            {/* Dual Pane Structure */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Sidebar Nav */}
                <div className="lg:col-span-3 space-y-2">
                    {TABS.map(tab => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 border-2 border-black transition-all ${isActive
                                    ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-1 -translate-y-1'
                                    : 'bg-white text-black hover:bg-gray-50 drop-shadow-none'
                                    }`}
                            >
                                <Icon className="w-5 h-5 shrink-0" />
                                <span className="font-black text-[11px] uppercase tracking-widest">{tab.label}</span>
                            </button>
                        )
                    })}
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-9">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="border-2 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                                <h2 className="text-2xl font-black uppercase tracking-tighter mb-4">Welcome to the Universal API</h2>
                                <p className="text-sm font-medium text-black/70 mb-6 leading-relaxed">
                                    ReadyBoard's developer framework allows you to easily bypass the standard POS integrations and push raw orders straight to your TV displays from any backend.
                                </p>
                                <ul className="space-y-4 text-xs font-bold font-mono text-black/60">
                                    <li className="flex items-center gap-2"><div className="w-2 h-2 bg-black shrink-0" /> Issue per-board API Keys</li>
                                    <li className="flex items-center gap-2"><div className="w-2 h-2 bg-black shrink-0" /> Push real-time order ingest Webhooks</li>
                                    <li className="flex items-center gap-2"><div className="w-2 h-2 bg-black shrink-0" /> Design Custom HTML templates with live data mapping</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeTab === 'apikeys' && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-black uppercase tracking-tighter">Account Credentials</h2>
                            {loading ? (
                                <div className="p-8 text-center text-xs font-black uppercase tracking-widest text-black/50">Loading configurations...</div>
                            ) : (
                                <div className="border-2 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="font-black text-lg tracking-tighter uppercase">Master API Key</h3>
                                            <p className="text-[10px] mt-1 font-mono text-black/60 max-w-sm">This token grants backend ingest access to all terminals associated with your account.</p>
                                        </div>
                                    </div>

                                    {apiKey ? (
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <input
                                                    readOnly
                                                    value={apiKey}
                                                    className="w-full bg-[#f0f0f0] border-2 border-black px-4 py-3 font-mono text-sm tracking-tight outline-none"
                                                />
                                                <button
                                                    onClick={() => copyToClipboard(apiKey, 'master')}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-black text-white hover:bg-gray-800"
                                                >
                                                    {copiedMap['master'] ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                                                </button>
                                            </div>
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={handleRevokeKey}
                                                    className="btn-ghost flex items-center gap-2 text-xs py-2 px-4 shadow-none"
                                                >
                                                    <Trash2 size={14} /> REVOKE KEY
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 border border-dashed border-black/20 p-6 flex flex-col items-center justify-center gap-3">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-black/40">API Disabled</p>
                                            <button
                                                onClick={handleGenerateKey}
                                                className="btn-primary flex items-center gap-2 text-[10px] py-2 px-6"
                                            >
                                                <Zap size={14} /> GENERATE MASTER KEY
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'ingest' && (
                        <div className="space-y-6">
                            <div className="space-y-8 max-w-4xl mx-auto p-6 font-sans text-black">
                                {/* Master Key Header */}
                                <header className="border-b-4 border-black pb-4 mb-8">
                                    <h2 className="text-4xl font-black uppercase tracking-tighter italic text-[#ff3b30]">Master API Access</h2>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 mt-1">Centralized Authentication Vault v2.0</p>
                                </header>

                                {/* Master Key Display Section */}
                                <div className="border-4 border-black bg-white p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] mb-12">
                                    <h3 className="text-xs font-black uppercase mb-4 tracking-widest flex items-center gap-2">
                                        <Lock size={14} className="text-[#ff3b30]" /> Your Account Master Key
                                    </h3>
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <code className="flex-1 bg-gray-100 p-4 font-mono text-sm border-2 border-black break-all">
                                            {apiKey || "RB_MASTER_NOT_GENERATED"}
                                        </code>
                                        <button className="bg-black text-white px-6 py-4 text-xs font-black uppercase hover:bg-[#ff3b30] transition-colors">
                                            Rotate Master Key
                                        </button>
                                    </div>
                                    <p className="mt-4 text-[10px] leading-relaxed text-black/50 font-bold uppercase">
                                        ⚠️ This key grants access to ALL boards in your account. Treat it like a password.
                                    </p>
                                </div>

                                {/* Implementation Guide */}
                                <section className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-px bg-black flex-1"></div>
                                        <h3 className="text-xl font-black uppercase italic tracking-tighter">Universal Ingest API</h3>
                                        <div className="h-px bg-black flex-1"></div>
                                    </div>

                                    {/* Updated cURL with REQUIRED board_id */}
                                    <div className="border-2 border-black overflow-hidden bg-[#1a1a1a]">
                                        <div className="bg-black text-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest flex justify-between">
                                            <span>Standard Request</span>
                                            <span className="text-green-400">JSON Payload</span>
                                        </div>
                                        <pre className="p-6 text-gray-300 font-mono text-[11px] leading-relaxed overflow-x-auto">
                                            {`curl -X POST https://api.readyboard.app/api/v1/orders \\
                        -H "Authorization: Bearer ${apiKey}" \\
                        -H "Content-Type: application/json" \\
                        -d '{
                            "board_id": "0194bc2e-...", // [REQUIRED] Target Terminal UUID
                            "order_number": "777",
                            "items": [
                                "1x Double Espresso",
                                "1x Croissant"
                            ],
                            "counter_number": "2"
                        }'`}
                                        </pre>
                                    </div>

                                    {/* Updated Table - board_id is now CRITICAL */}
                                    <table className="w-full border-collapse border-2 border-black text-left text-[11px]">
                                        <thead className="bg-black text-white uppercase font-black">
                                            <tr>
                                                <th className="p-3">Key</th>
                                                <th className="p-3">Status</th>
                                                <th className="p-3">Description</th>
                                            </tr>
                                        </thead>
                                        <tbody className="font-bold">
                                            <tr className="border-b-2 border-black bg-red-50">
                                                <td className="p-3 font-mono">board_id</td>
                                                <td className="p-3 text-[#ff3b30]">REQUIRED</td>
                                                <td className="p-3">The UUID of the specific board you want to update. Used for routing.</td>
                                            </tr>
                                            <tr className="border-b-2 border-black">
                                                <td className="p-3 font-mono text-blue-600">items</td>
                                                <td className="p-3">OPTIONAL</td>
                                                <td className="p-3">Accepts a single string or an array of strings. Normalized into an array on the server. Examples: <code>"1x Coffee"</code> or <code>["1x Coffee", "1x Tea"]</code>.</td>
                                            </tr>
                                            <tr className="border-b-2 border-black">
                                                <td className="p-3 font-mono">order_number</td>
                                                <td className="p-3">OPTIONAL</td>
                                                <td className="p-3">Alphanumeric identifier for the order (e.g., "777", "A-12"). Usually provided by the POS.</td>
                                            </tr>
                                            <tr className="border-b-2 border-black">
                                                <td className="p-3 font-mono">counter_number</td>
                                                <td className="p-3">OPTIONAL</td>
                                                <td className="p-3">The physical pickup counter or register number where the order should be collected. Defaults to "1" if omitted.</td>
                                            </tr>
                                            <tr className="border-b-2 border-black">
                                                <td className="p-3 font-mono">notes</td>
                                                <td className="p-3">OPTIONAL</td>
                                                <td className="p-3">Any text notes, special requests, or customer names associated with the order.</td>
                                            </tr>
                                            <tr className="border-b-2 border-black bg-blue-50">
                                                <td className="p-3 font-mono">status</td>
                                                <td className="p-3">OPTIONAL</td>
                                                <td className="p-3">The initial lifecycle state of the order upon creation. Must be one of: <code>"preparing"</code>, <code>"ready"</code>, or <code>"archived"</code>. Defaults to backend logic if omitted (usually preparing or ready).</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </section>

                                {/* Updated Toolkit */}
                                <div className="bg-[#ff3b30] text-white p-8 border-4 border-black">
                                    <div className="flex items-center gap-4 mb-6">
                                        <Zap className="fill-white" size={24} />
                                        <h3 className="text-2xl font-black uppercase italic tracking-tighter">Quick Injector</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {boards.map(board => (
                                            <button
                                                key={board.id}
                                                onClick={() => handleTestOrder(board.id, apiKey)}
                                                className="bg-black text-white p-4 text-[10px] font-black uppercase hover:bg-white hover:text-black transition-all border-2 border-black"
                                            >
                                                Test: {board.name}
                                                <div className="text-[9px] opacity-50 font-mono mt-1 lowercase">{board.id.slice(0, 8)}...</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'webhooks' && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-black uppercase tracking-tighter">Event Webhooks</h2>
                            <div className="border-2 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                                <p className="text-sm font-medium text-black/70 mb-4">
                                    Subscribe to real-time events triggered by ReadyBoard displays or connected POS systems.
                                </p>
                                <div className="bg-gray-100 border border-dashed border-black/40 p-8 text-center text-xs font-black uppercase tracking-widest text-black/30">
                                    [ SYSTEM UNDER CONSTRUCTION: Q3 ROLLOUT ]
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'custom_html' && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-black uppercase tracking-tighter">Custom HTML Engine</h2>
                            <div className="border-2 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                                <p className="text-sm font-medium text-black/70 mb-6">
                                    The Custom HTML engine allows you to completely override the ReadyBoard visual matrix by injecting your own CSS/HTML code natively into the terminal renderer.
                                </p>

                                <h3 className="font-black text-sm uppercase mb-3">Data Binding Identifiers</h3>
                                <p className="text-xs font-medium text-black/60 mb-4">
                                    During the TV render cycle, DOM elements with specific <code className="bg-gray-100 font-black px-1 mx-1 border border-black/10">id</code> properties are automatically targeted and populated by the WebSocket state stream.
                                </p>

                                <div className="bg-[#f0f0f0] border-2 border-black p-4 mb-6">
                                    <ul className="space-y-3 font-mono text-xs">
                                        <li className="flex justify-between border-b border-black/10 pb-2">
                                            <strong>#rb_orders_preparing</strong>
                                            <span className="text-black/50">Target Div for all preparing Order IDs</span>
                                        </li>
                                        <li className="flex justify-between border-b border-black/10 pb-2">
                                            <strong>#rb_orders_ready</strong>
                                            <span className="text-black/50">Target Div for all ready Order IDs</span>
                                        </li>
                                        <li className="flex justify-between">
                                            <strong>#rb_ticker_marquee</strong>
                                            <span className="text-black/50">Target Div for custom scrolling footer</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="bg-black text-white p-4 font-mono text-xs overflow-x-auto border-2 border-black">
                                    <div className="text-blue-400 mb-2">&lt;!-- Example Injection Template --&gt;</div>
                                    <div>&lt;div class="custom-board-wrapper"&gt;</div>
                                    <div className="pl-4">&lt;div class="column-left"&gt;</div>
                                    <div className="pl-8">&lt;h1&gt;Preparing...&lt;/h1&gt;</div>
                                    <div className="pl-8 text-green-400">&lt;div id="rb_orders_preparing"&gt;&lt;/div&gt;</div>
                                    <div className="pl-4">&lt;/div&gt;</div>
                                    <div className="pl-4">&lt;div class="column-right"&gt;</div>
                                    <div className="pl-8">&lt;h1&gt;Ready for Pickup&lt;/h1&gt;</div>
                                    <div className="pl-8 text-green-400">&lt;div id="rb_orders_ready"&gt;&lt;/div&gt;</div>
                                    <div className="pl-4">&lt;/div&gt;</div>
                                    <div>&lt;/div&gt;</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Toast */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="fixed bottom-8 right-8 z-50 bg-black text-white px-8 py-5 flex items-center gap-4 shadow-2xl"
                    >
                        <div className="w-2 h-2 bg-[#00ff00]" />
                        <span className="font-black text-xs uppercase tracking-widest">{toastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
