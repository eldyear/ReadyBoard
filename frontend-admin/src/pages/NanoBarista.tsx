import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { RotateCcw, Send, Trash2, Plus, X, AlertTriangle, GripVertical, FileJson, Zap, Printer, Unplug } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const API = import.meta.env.VITE_API_BASE_URL || '/api'

// --- Interfaces ---
interface Order { id: string; order_number?: string; counter_number: string; status: string; items?: string[]; notes?: string; created_at: string }
interface MenuItem { id: string; name: string; cat: string; price: number }
interface CartItem { name: string; qty: number; price: number }

const DEFAULT_MENU: MenuItem[] = []

export default function NanoBarista() {
    // --- State ---
    const [activeTab, setActiveTab] = useState<'new' | 'orders' | 'menu'>('new')
    
    // Config / Global State
    const { user, token: userToken } = useAuth()

    // Pairing State
    const [pairingCodeInput, setPairingCodeInput] = useState('')
    const [isVerifyingPairing, setIsVerifyingPairing] = useState(false)
    const [sessionToken, setSessionToken] = useState(localStorage.getItem('barista_token') || '')

    const token = userToken || sessionToken

    // Tab: New Order
    const [orderNum, setOrderNum] = useState('')
    const [status, setStatus] = useState('')
    const [notes, setNotes] = useState('')
    const [cart, setCart] = useState<CartItem[]>([])
    const [isSending, setIsSending] = useState(false)
    const [autoOrderCounter, setAutoOrderCounter] = useState(1)

    // Tab: Orders
    const [orders, setOrders] = useState<Order[]>([])
    const [filterStatus, setFilterStatus] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

    // Tab: Menu
    const [menu, setMenu] = useState<MenuItem[]>([])
    const [newItemName, setNewItemName] = useState('')
    const [newItemCat, setNewItemCat] = useState('')

    // Toast
    const [toast, setToast] = useState<{msg: string; type: 'success' | 'error' | 'warn'} | null>(null)
    const showToast = (msg: string, type: 'success' | 'error' | 'warn' = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3500)
    }

    // --- Init ---
    useEffect(() => {
        // Load persistents
        try {
            const savedMenu = localStorage.getItem('barista_menu')
            if (savedMenu) setMenu(JSON.parse(savedMenu))
            else setMenu(DEFAULT_MENU)

            const savedCounter = JSON.parse(localStorage.getItem('barista_counter') || '{}')
            const today = new Date().toDateString()
            if (savedCounter.date === today && savedCounter.counter) {
                setAutoOrderCounter(savedCounter.counter)
            } else {
                setAutoOrderCounter(1)
            }

            const savedOrders = JSON.parse(localStorage.getItem('barista_orders') || '[]')
            setOrders(savedOrders)

            // No persistent board selection needed in global mode
        } catch (e) {
            setMenu(DEFAULT_MENU)
        }

        // Fetch Global Menu
        fetch(`${API}/barista/menu`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => {
                if (data.products) {
                    const mappedProducts = data.products.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        price: p.price,
                        cat: data.categories.find((c: any) => c.id === p.category_id)?.name || 'Other',
                        category_id: p.category_id
                    }))
                    setMenu(mappedProducts)
                }
            })
            .catch(err => console.error('Failed to fetch menu', err))
            .finally(() => {})
    }, [token, sessionToken])

    const handlePairingVerify = async () => {
        if (pairingCodeInput.length !== 6) {
            showToast('Enter 6-digit code', 'warn')
            return
        }
        setIsVerifyingPairing(true)
        try {
            const res = await fetch(`${API}/pairing/barista/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: pairingCodeInput })
            })
            if (res.ok) {
                const data = await res.json()
                localStorage.setItem('barista_token', data.access_token)
                setSessionToken(data.access_token)
                showToast('Device paired successfully', 'success')
            } else {
                const err = await res.json()
                showToast(err.error || 'Invalid code', 'error')
            }
        } catch (e) {
            showToast('Verification failed', 'error')
        } finally {
            setIsVerifyingPairing(false)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('barista_token')
        setSessionToken('')
        // If user is logged in via auth provider, they stay logged in, 
        // but sessionToken being cleared will trigger the screen if no userToken.
    }

    // --- Helpers ---
    const persistOrderCounter = (newCounter: number) => {
        setAutoOrderCounter(newCounter)
        localStorage.setItem('barista_counter', JSON.stringify({
            counter: newCounter,
            date: new Date().toDateString()
        }))
    }

    const genOrderNum = () => {
        setOrderNum(String(autoOrderCounter))
    }

    const resetForm = () => {
        setOrderNum('')
        setNotes('')
        setStatus('')
        setCart([])
    }

    // --- Cart Logic ---
    const toggleCartItem = (name: string) => {
        const menuItem = menu.find(m => m.name === name)
        if (!menuItem) return
        setCart(prev => {
            const existing = prev.find(p => p.name === name)
            if (existing) return prev.filter(p => p.name !== name)
            return [...prev, { name, qty: 1, price: menuItem.price }]
        })
    }
    
    const updateQty = (name: string, delta: number) => {
        setCart(prev => prev.map(p => {
            if (p.name === name) return { ...p, qty: Math.max(1, p.qty + delta) }
            return p
        }))
    }

    const removeCartItem = (name: string) => {
        setCart(prev => prev.filter(p => p.name !== name))
    }

    // --- Payload / Send ---
    const buildPayload = (overrideNum?: string) => {
        const pOrderNum = overrideNum !== undefined ? overrideNum : (orderNum.trim() || undefined)
        const items = cart.map(c => c.qty > 1 ? `${c.qty}x ${c.name}` : `1x ${c.name}`)
        
        return {
            ...(pOrderNum ? { order_number: pOrderNum, counter_number: pOrderNum } : {}),
            ...(status ? { status } : {}),
            ...(notes.trim() ? { notes: notes.trim() } : {}),
            ...(items.length ? { items } : {}),
            structured_items: cart.map(c => ({
                id: menu.find(m => m.name === c.name)?.id,
                name: c.name,
                category_id: (menu.find(m => m.name === c.name) as any)?.category_id,
                price: c.price,
                quantity: c.qty
            })),
            total_price: cart.reduce((sum, item) => sum + (item.price * item.qty), 0)
        }
    }

    const saveLocalOrder = (serverData: any, payload: any) => {
        const newOrder: Order = {
            id: serverData.id || `local-${Date.now()}`,
            order_number: payload.order_number || '—',
            counter_number: payload.counter_number || '1',
            status: payload.status || serverData.status || 'preparing',
            items: payload.items || [],
            notes: payload.notes || '',
            created_at: serverData.created_at || new Date().toISOString()
        }
        const updated = [newOrder, ...orders]
        setOrders(updated)
        localStorage.setItem('barista_orders', JSON.stringify(updated))
    }

    const handleSend = async () => {
        if (cart.length === 0 && !notes.trim()) { showToast('Add items or notes first', 'warn'); return }

        const manualNum = orderNum.trim()
        const resolvedOrderNum = manualNum || String(autoOrderCounter)
        
        if (!manualNum) {
            setOrderNum(resolvedOrderNum)
            persistOrderCounter(autoOrderCounter + 1)
        }

        const payload = buildPayload(resolvedOrderNum)
        setIsSending(true)

        try {
            const res = await fetch(`${API}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.error || `HTTP ${res.status}`)
            }

            const data = await res.json()
            saveLocalOrder(data, payload)
            showToast(`Order #${resolvedOrderNum} sent!`, 'success')
            resetForm()
        } catch (err: any) {
            showToast(err.message, 'error')
        } finally {
            setIsSending(false)
        }
    }

    const handlePrint = () => {
        const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0)
        const businessName = user?.full_name || 'READYBOARD'
        const printOrderNum = (orderNum || autoOrderCounter).toString().padStart(3, '0')
        const printWindow = window.open('', '_blank')
        if (!printWindow) return

        const itemsHtml = cart.map(item => `
            <tr>
                <td>${item.qty > 1 ? `${item.qty}X ` : ''}${item.name.toUpperCase()}</td>
                <td style="text-align: right;">${item.price * item.qty}</td>
            </tr>
        `).join('')

        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Receipt</title>
                    <style>
                        @page { size: 58mm auto; margin: 0; }
                        body { 
                            width: 50mm; 
                            margin: 0 auto;
                            padding: 10px 2px;
                            font-family: "Inter", "Arial Black", "Impact", sans-serif; 
                            font-size: 14px;
                            line-height: 1.1;
                            color: #000;
                            text-transform: uppercase;
                        }
                        .text-center { text-align: center; }
                        .bold { font-weight: 900; }
                        .header { border-bottom: 3px solid #000; padding-bottom: 5px; margin-bottom: 8px; }
                        .order-box { background: #000; color: #fff; padding: 10px 0; margin: 10px 0; display: block; }
                        .order-label { font-size: 16px; margin-bottom: 2px; }
                        .order-number { font-size: 42px; line-height: 1; }
                        .items-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                        .items-table td { padding: 4px 0; border-bottom: 1px solid #eee; }
                        .total-row { border-top: 4px solid #000; padding-top: 8px; margin-top: 5px; font-size: 20px; }
                        .footer { margin-top: 15px; font-size: 11px; border-top: 2px dashed #000; padding-top: 8px; }
                        @media print {
                            header, footer, nav { display: none !important; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header text-center">
                        <div class="bold" style="font-size: 20px;">${businessName.toUpperCase()}</div>
                        <div class="bold" style="font-size: 10px; opacity: 0.8;">POWERED BY READYBOARD</div>
                    </div>

                    <div class="text-center order-box">
                        <div class="order-label bold">ЗАКАЗ</div>
                        <div class="order-number bold">${printOrderNum}</div>
                    </div>

                    <table class="items-table">
                        <tbody class="bold">
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <div class="total-row bold">
                        <div style="display: flex; justify-content: space-between;">
                            <span>ИТОГО:</span>
                            <span>${total} СОМ</span>
                        </div>
                    </div>

                    <div class="footer text-center bold">
                        <div>СПАСИБО! ГОТОВИМ...</div>
                        <div style="font-size: 9px; margin-top: 5px;">WWW.READYBOARD.APP</div>
                    </div>
                    <script>
                        window.onload = () => {
                            window.print();
                            window.close();
                        };
                    </script>
                </body>
            </html>
        `)
        printWindow.document.close()
    }

    const handleTest = async () => {
        const testNum = String(Math.floor(Math.random() * 900) + 100)
        const pick = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)]
        const randomNames = ['Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan']
        const randomItems = [pick(menu).name, pick(menu).name].filter((v,i,a) => a.indexOf(v)===i)

        const payload = {
            order_number: testNum,
            counter_number: testNum,
            status: pick(['preparing', 'ready']),
            items: randomItems.map(n => `1x ${n}`),
            notes: pick(randomNames),
            total_price: Math.floor(Math.random() * 1000)
        }

        setIsSending(true)
        try {
            const res = await fetch(`${API}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            await res.json()
            showToast(`Test order #${testNum} sent!`, 'success')
        } catch (err: any) {
            showToast(err.message, 'error')
        } finally {
            setIsSending(false)
        }
    }

    // --- Orders Tab Logic ---
    const updateOrderStatus = async (id: string, newStatus: string) => {
        // Update local
        const updated = orders.map(o => o.id === id ? { ...o, status: newStatus } : o)
        setOrders(updated)
        localStorage.setItem('barista_orders', JSON.stringify(updated))

        // Push to API
        if (id && !id.startsWith('local-')) {
            try {
                await fetch(`${API}/orders/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ status: newStatus })
                })
            } catch (err) {
                console.error("Failed to sync status to server", err)
            }
        }
    }

    const toggleFolder = (id: string) => {
        setExpandedOrders(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const clearOrders = () => {
        if (confirm('Clear all local order history?')) {
            setOrders([])
            localStorage.removeItem('barista_orders')
        }
    }

    // --- Menu Tab Logic (DnD) ---
    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return
        const sourceIndex = result.source.index
        const destIndex = result.destination.index
        
        const newMenu = Array.from(menu)
        const [removed] = newMenu.splice(sourceIndex, 1)
        newMenu.splice(destIndex, 0, removed)
        
        setMenu(newMenu)
        localStorage.setItem('barista_menu', JSON.stringify(newMenu))
    }

    const addMenuItem = () => {
        if (!newItemName.trim()) return
        const newMenu = [...menu, {
            id: String(Date.now()),
            name: newItemName.trim(),
            cat: newItemCat.trim() || 'Other',
            price: 0
        }]
        setMenu(newMenu)
        localStorage.setItem('barista_menu', JSON.stringify(newMenu))
        setNewItemName('')
        setNewItemCat('')
        showToast('Item added', 'success')
    }

    const deleteMenuItem = (id: string) => {
        const newMenu = menu.filter(m => m.id !== id)
        setMenu(newMenu)
        localStorage.setItem('barista_menu', JSON.stringify(newMenu))
        
        // Also remove from active cart if it was there
        const removedItem = menu.find(m => m.id === id)
        if (removedItem) removeCartItem(removedItem.name)
    }

    // --- Rendering Helpers ---
    const renderPayloadPreview = () => {
        const p = buildPayload()
        return JSON.stringify(p, null, 2)
    }

    const filteredOrders = orders.filter(o => {
        if (filterStatus && o.status !== filterStatus) return false
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            return (o.order_number || '').toLowerCase().includes(q) || 
                   (o.notes || '').toLowerCase().includes(q)
        }
        return true
    })

    const todayStr = new Date().toDateString()
    const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === todayStr)

    // Pairing Screen if no token
    if (!token) return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border-8 border-black p-8 w-full max-w-md shadow-[16px_16px_0px_0px_rgba(255,59,48,1)]"
            >
                <div className="mb-8 text-black">
                    <h1 className="font-black text-4xl tracking-tighter uppercase leading-none mb-2">Nano-Barista</h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black/40 border-b-2 border-black pb-4">Terminal Pairing Required</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest mb-4 text-black">6-Digit Pairing Code</label>
                        <input 
                            type="text" 
                            maxLength={6}
                            placeholder="000000"
                            value={pairingCodeInput}
                            onChange={e => setPairingCodeInput(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-[#f9f9f9] border-4 border-black p-6 text-center text-5xl font-black tracking-[0.2em] text-black focus:outline-none focus:bg-white transition-colors"
                        />
                    </div>

                    <button 
                        onClick={handlePairingVerify}
                        disabled={isVerifyingPairing || pairingCodeInput.length !== 6}
                        className="w-full py-8 text-xl font-black uppercase tracking-widest bg-black text-white hover:bg-[#ff3b30] transition-colors disabled:opacity-50"
                    >
                        {isVerifyingPairing ? 'VERIFYING...' : 'VERIFY & PAIR'}
                    </button>

                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-black/40">
                            Don't have a code? Generate one in the Admin Panel
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    )

    return (
        <div className="flex flex-col h-screen w-full bg-[#0a0a0a] text-[#e5e7eb] font-['Inter',sans-serif]">
            {/* Topbar */}
            <div className="flex items-center justify-between px-6 h-14 bg-[#111] border-b border-[#222] shrink-0">
                <div className="flex items-center gap-4">
                    <span className="font-black text-xl tracking-tighter text-[#f59e0b] uppercase">NANO-BARISTA</span>
                </div>
                <div className="flex items-center gap-4">
                    {/* Logout/Unpair Button for Session Tokens */}
                    {sessionToken && (
                        <button 
                            onClick={handleLogout}
                            className="text-[10px] font-black tracking-widest uppercase text-red-500 hover:text-white hover:bg-red-500 px-3 py-1 border border-red-500 transition-all flex items-center gap-2"
                            title="Unpair Device"
                        >
                            <Unplug className="w-3 h-3" /> UNPAIR
                        </button>
                    )}
                    
                    {/* Global Status */}
                    <div className="flex items-center gap-2 font-mono text-xs tracking-widest uppercase">
                        <div className="w-2 h-2 rounded-full bg-[#4ade80] shadow-[0_0_6px_#4ade80]" /><span>GLOBAL MODE</span>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex bg-[#111] border-b border-[#222] shrink-0">
                {[
                    { id: 'new', label: '＋ NEW ORDER' },
                    { id: 'orders', label: '📋 ORDERS' },
                    { id: 'menu', label: '☕ MENU' },
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id as any)}
                        className={`px-8 h-12 text-xs font-black tracking-widest uppercase transition-colors border-b-2
                            ${activeTab === t.id ? 'text-[#f59e0b] border-[#f59e0b]' : 'text-gray-500 border-transparent hover:text-white'}
                        `}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                
                {/* ─── TAB: NEW ORDER ─── */}
                {activeTab === 'new' && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        
                        {/* Order Number Row */}
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-mono flex items-center gap-2">
                                Order Number <span className="text-gray-600 font-normal lowercase tracking-normal">(shown on board display)</span>
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={orderNum}
                                    onChange={e => setOrderNum(e.target.value)}
                                    placeholder="auto"
                                    className="flex-1 bg-[#1a1a1a] border border-[#333] px-4 py-3 rounded text-white focus:outline-none focus:border-[#f59e0b] transition-colors font-mono"
                                />
                                <button 
                                    onClick={genOrderNum}
                                    title="Generate next"
                                    className="px-4 bg-[#1a1a1a] border border-[#333] rounded hover:bg-[#222] text-gray-400 hover:text-white transition-colors"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Status Selection */}
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-mono">Status</div>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => setStatus('')}          className={`px-4 py-2 text-sm font-bold rounded border ${status === '' ? 'bg-[#1e3a5f] border-[#3b82f6] text-[#60a5fa]' : 'bg-[#1a1a1a] border-[#333] text-gray-400 hover:text-white'}`}>— Default</button>
                                <button onClick={() => setStatus('preparing')} className={`px-4 py-2 text-sm font-bold rounded border ${status === 'preparing' ? 'bg-[#2d1a07] border-[#f59e0b] text-[#f59e0b]' : 'bg-[#1a1a1a] border-[#333] text-gray-400 hover:text-white'}`}>Preparing</button>
                                <button onClick={() => setStatus('ready')}     className={`px-4 py-2 text-sm font-bold rounded border ${status === 'ready' ? 'bg-[#052e16] border-[#22c55e] text-[#4ade80]' : 'bg-[#1a1a1a] border-[#333] text-gray-400 hover:text-white'}`}>Ready</button>
                                <button onClick={() => setStatus('archived')}  className={`px-4 py-2 text-sm font-bold rounded border ${status === 'archived' ? 'bg-[#222] border-[#555] text-white' : 'bg-[#1a1a1a] border-[#333] text-gray-400 hover:text-white'}`}>Archived</button>
                            </div>
                        </div>

                        {/* Quick Items Grid */}
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-mono border-b border-[#333] pb-2">Quick Items</div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {menu.map(item => {
                                    const inCart = cart.some(c => c.name === item.name)
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => toggleCartItem(item.name)}
                                            className={`px-3 py-3 text-sm font-bold rounded border transition-colors text-left truncate
                                                ${inCart ? 'bg-[#2d1a07] border-[#f59e0b] text-[#f59e0b]' : 'bg-[#1a1a1a] border-[#333] text-gray-400 hover:border-[#f59e0b] hover:text-white'}
                                            `}
                                        >
                                            {inCart ? '✓ ' : ''}{item.name}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Order Cart */}
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-mono border-b border-[#333] pb-2 flex justify-between">
                                <span>Order Items</span>
                                <span className="text-[#f59e0b]">Total: {cart.reduce((sum, item) => sum + (item.price * item.qty), 0)} KGS</span>
                            </div>
                            <div className="bg-[#1a1a1a] border border-[#333] rounded overflow-hidden">
                                {cart.length === 0 ? (
                                    <div className="p-6 text-center text-sm font-mono text-gray-500">No items added yet</div>
                                ) : (
                                    <div className="flex flex-col">
                                        {cart.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 border-b border-[#333] last:border-0">
                                                <span className="font-bold text-sm">{item.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center bg-[#111] border border-[#333] rounded">
                                                        <button onClick={() => updateQty(item.name, -1)} className="w-8 h-8 flex justify-center items-center text-gray-400 hover:text-white hover:bg-[#222]">-</button>
                                                        <span className="w-6 text-center font-mono text-sm">{item.qty}</span>
                                                        <button onClick={() => updateQty(item.name, 1)} className="w-8 h-8 flex justify-center items-center text-gray-400 hover:text-white hover:bg-[#222]">+</button>
                                                    </div>
                                                    <button onClick={() => removeCartItem(item.name)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-mono">Notes / Customer Name</div>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Special requests, name..."
                                className="w-full bg-[#1a1a1a] border border-[#333] px-4 py-3 rounded text-white focus:outline-none focus:border-[#f59e0b] min-h-[80px] font-mono text-sm"
                            />
                        </div>

                        {/* JSON Preview */}
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-mono flex items-center gap-2"><FileJson className="w-3 h-3"/> Payload Preview</div>
                            <pre className="bg-[#090909] border border-[#222] p-4 rounded text-xs font-mono text-gray-400 overflow-x-auto">
                                {renderPayloadPreview()}
                            </pre>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#333]">
                            <button 
                                onClick={handleSend}
                                disabled={isSending}
                                className="flex-1 bg-[#f59e0b] text-black font-black uppercase tracking-widest py-4 rounded hover:brightness-110 active:scale-95 transition-all text-sm disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                            >
                                <Send className="w-4 h-4" /> {isSending ? 'Sending...' : 'Push to TV'}
                            </button>
                            <button 
                                onClick={handlePrint}
                                disabled={cart.length === 0}
                                className="px-6 bg-[#1a1a1a] text-[#f59e0b] border border-[#f59e0b]/30 font-black uppercase tracking-widest rounded hover:bg-[#222] transition-colors flex items-center justify-center disabled:opacity-30"
                                title="Print Receipt"
                            >
                                <Printer className="w-5 h-5" />
                            </button>
                            <button onClick={resetForm} className="px-6 bg-[#1a1a1a] text-gray-400 border border-[#333] font-black uppercase tracking-widest rounded hover:bg-[#222] hover:text-white transition-colors flex items-center justify-center">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <button onClick={handleTest} disabled={isSending} className="w-full py-3 bg-[#052e16] text-[#4ade80] border border-[#16a34a]/30 font-black uppercase tracking-widest rounded text-xs hover:bg-[#064e3b] transition-colors flex justify-center items-center gap-2 mt-2 disabled:opacity-50">
                            <Zap className="w-3 h-3"/> Send Test Order
                        </button>
                    </div>
                )}

                {/* ─── TAB: ORDERS ─── */}
                {activeTab === 'orders' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        
                        {/* Stats Bar */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-[#111] border border-[#333] p-4 rounded text-center">
                                <div className="text-3xl font-black text-[#f59e0b]">{todayOrders.length}</div>
                                <div className="text-[10px] uppercase tracking-widest text-gray-500 mt-1 font-mono">Today's Orders</div>
                            </div>
                            <div className="bg-[#111] border border-[#333] p-4 rounded text-center">
                                <div className="text-3xl font-black text-[#f59e0b]">{orders.filter(o => o.status === 'preparing').length}</div>
                                <div className="text-[10px] uppercase tracking-widest text-gray-500 mt-1 font-mono">Preparing</div>
                            </div>
                            <div className="bg-[#111] border border-[#333] p-4 rounded text-center">
                                <div className="text-3xl font-black text-[#f59e0b]">{orders.filter(o => o.status === 'ready').length}</div>
                                <div className="text-[10px] uppercase tracking-widest text-gray-500 mt-1 font-mono">Ready</div>
                            </div>
                            <div className="bg-[#111] border border-[#333] p-4 rounded text-center">
                                <div className="text-3xl font-black text-[#f59e0b]">{orders.length}</div>
                                <div className="text-[10px] uppercase tracking-widest text-gray-500 mt-1 font-mono">Total Stored</div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <select 
                                value={filterStatus} 
                                onChange={e => setFilterStatus(e.target.value)}
                                className="bg-[#1a1a1a] border border-[#333] text-sm text-white px-4 py-2 rounded focus:outline-none focus:border-[#f59e0b] font-mono w-full sm:w-auto"
                            >
                                <option value="">All Statuses</option>
                                <option value="preparing">Preparing</option>
                                <option value="ready">Ready</option>
                                <option value="archived">Archived</option>
                            </select>
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search order #, notes..."
                                className="flex-1 bg-[#1a1a1a] border border-[#333] px-4 py-2 rounded text-white focus:outline-none focus:border-[#f59e0b] font-mono text-sm"
                            />
                            <button onClick={clearOrders} className="flex items-center gap-2 justify-center px-4 py-2 bg-[#2d0f0f] text-[#ef4444] border border-[#ef4444]/30 rounded text-xs font-bold uppercase tracking-widest hover:bg-[#3d1414] transition-colors w-full sm:w-auto">
                                <Trash2 className="w-4 h-4"/> Clear All
                            </button>
                        </div>

                        {/* Orders List */}
                        <div className="space-y-3">
                            {filteredOrders.length === 0 ? (
                                <div className="text-center p-12 text-gray-500 font-mono text-sm border border-dashed border-[#333] rounded">No orders found.</div>
                            ) : (
                                filteredOrders.map(o => {
                                    const dt = new Date(o.created_at)
                                    const timeStr = `${dt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} · ${dt.toLocaleDateString()}`
                                    const isExpanded = expandedOrders.has(o.id)
                                    
                                    return (
                                        <div key={o.id} className="bg-[#111] border border-[#333] rounded overflow-hidden">
                                            {/* Header */}
                                            <div 
                                                onClick={() => toggleFolder(o.id)}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer hover:bg-[#1a1a1a] transition-colors gap-3"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="font-black text-2xl text-[#f59e0b] min-w-[3rem]">#{o.order_number || '?'}</div>
                                                    <div>
                                                        <div className="font-mono text-[10px] text-gray-500">{timeStr}</div>
                                                        {o.notes && <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{o.notes}</div>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 align-self-end sm:align-self-auto">
                                                    <span className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full border
                                                        ${o.status === 'preparing' ? 'bg-[#2d1a07] text-[#f59e0b] border-[#7c3d0a]' : ''}
                                                        ${o.status === 'ready' ? 'bg-[#082d14] text-[#4ade80] border-[#0f5a28]' : ''}
                                                        ${o.status === 'archived' ? 'bg-[#1a1a1a] text-[#71717a] border-[#32323d]' : ''}
                                                    `}>
                                                        {o.status}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Body */}
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="border-t border-[#222] bg-[#1a1a1a]"
                                                    >
                                                        <div className="p-4">
                                                            <ul className="space-y-1 mb-4">
                                                                {o.items && o.items.length > 0 ? (
                                                                    o.items.map((item, idx) => (
                                                                        <li key={idx} className="text-sm text-gray-300 before:content-['·'] before:text-[#f59e0b] before:mr-2">{item}</li>
                                                                    ))
                                                                ) : (
                                                                    <li className="text-sm text-gray-500 italic">No items</li>
                                                                )}
                                                            </ul>
                                                            
                                                            <div className="flex flex-wrap gap-2 pt-3 border-t border-[#333]">
                                                                <button onClick={() => updateOrderStatus(o.id, 'preparing')} className={`px-3 py-1.5 text-xs font-bold rounded ${o.status === 'preparing' ? 'bg-[#2d1a07] text-[#f59e0b] border border-[#7c3d0a]' : 'bg-[#222] text-gray-400 hover:bg-[#333]'}`}>Preparing</button>
                                                                <button onClick={() => updateOrderStatus(o.id, 'ready')}     className={`px-3 py-1.5 text-xs font-bold rounded ${o.status === 'ready' ? 'bg-[#082d14] text-[#4ade80] border border-[#0f5a28]' : 'bg-[#222] text-gray-400 hover:bg-[#333]'}`}>Ready</button>
                                                                <button onClick={() => updateOrderStatus(o.id, 'archived')}  className={`px-3 py-1.5 text-xs font-bold rounded ${o.status === 'archived' ? 'bg-[#1a1a1a] text-[#71717a] border border-[#32323d]' : 'bg-[#222] text-gray-400 hover:bg-[#333]'}`}>Archived</button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* ─── TAB: MENU ─── */}
                {activeTab === 'menu' && (
                    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8">
                        
                        {/* Menu List */}
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-4 font-mono border-b border-[#333] pb-2">Quick Items Editor (Drag to Reorder)</div>
                            
                            {menu.length === 0 ? (
                                <div className="p-8 text-center border border-dashed border-[#333] rounded text-gray-500 text-sm font-mono">No items in menu.</div>
                            ) : (
                                <DragDropContext onDragEnd={onDragEnd}>
                                    <Droppable droppableId="menu-list">
                                        {(provided) => (
                                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                                {menu.map((item, index) => (
                                                    <Draggable key={item.id} draggableId={item.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div 
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                style={{
                                                                    ...provided.draggableProps.style,
                                                                    boxShadow: snapshot.isDragging ? '0 10px 20px rgba(0,0,0,0.5)' : 'none',
                                                                    opacity: snapshot.isDragging ? 0.9 : 1
                                                                }}
                                                                className={`flex items-center gap-3 p-3 bg-[#1a1a1a] border rounded transition-colors
                                                                    ${snapshot.isDragging ? 'border-[#f59e0b]' : 'border-[#333] hover:border-[#555]'}
                                                                `}
                                                            >
                                                                <div {...provided.dragHandleProps} className="text-gray-500 hover:text-white cursor-grab active:cursor-grabbing p-1">
                                                                    <GripVertical className="w-5 h-5"/>
                                                                </div>
                                                                <div className="flex-1 font-bold text-sm">{item.name}</div>
                                                                <div className="text-[10px] bg-[#111] px-2 py-1 rounded font-mono text-gray-400">{item.cat}</div>
                                                                <button onClick={() => deleteMenuItem(item.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors" title="Delete">
                                                                    <X className="w-4 h-4"/>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </DragDropContext>
                            )}
                        </div>

                        {/* Add Item Form */}
                        <div>
                            <div className="bg-[#111] border border-[#333] rounded p-6 sticky top-0">
                                <h3 className="font-black text-lg uppercase tracking-tight text-[#f59e0b] mb-4">Add Item</h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5 font-mono">Item Name</div>
                                        <input 
                                            type="text" 
                                            value={newItemName}
                                            onChange={e => setNewItemName(e.target.value)}
                                            placeholder="Double Espresso"
                                            className="w-full bg-[#1a1a1a] border border-[#333] px-3 py-2 text-sm rounded text-white focus:outline-none focus:border-[#f59e0b] transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5 font-mono">Category</div>
                                        <input 
                                            type="text" 
                                            value={newItemCat}
                                            onChange={e => setNewItemCat(e.target.value)}
                                            placeholder="Coffee, Food, etc."
                                            className="w-full bg-[#1a1a1a] border border-[#333] px-3 py-2 text-sm rounded text-white focus:outline-none focus:border-[#f59e0b] transition-colors"
                                        />
                                    </div>
                                    <button 
                                        onClick={addMenuItem}
                                        className="w-full bg-[#f59e0b] text-black font-black uppercase tracking-widest py-3 text-xs rounded hover:brightness-110 active:scale-95 transition-all flex justify-center items-center gap-2 mt-2"
                                    >
                                        <Plus className="w-4 h-4"/> Add to Menu
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

            </div>

            {/* Toasts */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className={`fixed bottom-8 right-8 z-50 px-6 py-4 flex items-center gap-3 shadow-2xl rounded text-white border-l-4
                            ${toast.type === 'success' ? 'bg-[#0f2d18] border-[#22c55e]' : ''}
                            ${toast.type === 'error' ? 'bg-[#2d0f0f] border-[#ef4444]' : ''}
                            ${toast.type === 'warn' ? 'bg-[#2d1a07] border-[#f59e0b]' : ''}
                        `}
                    >
                        {toast.type === 'success' && <div className="text-[#22c55e] font-black">✓</div>}
                        {toast.type === 'error' && <div className="text-[#ef4444] font-black">✗</div>}
                        {toast.type === 'warn' && <AlertTriangle className="w-4 h-4 text-[#f59e0b]"/>}
                        <span className="font-mono text-sm">{toast.msg}</span>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    )
}
