import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, MonitorPlay, Trash2, LayoutTemplate, Link as LinkIcon, ExternalLink, Crown, Zap, X, Unplug, Plug, Check } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import SelectDropdown from '../components/SelectDropdown'

interface Board { id: string; name: string; slug: string; display_mode: string; is_active: boolean; is_online?: boolean; linked_categories?: string[] }
interface Category { id: string; name: string }

const API = import.meta.env.VITE_API_BASE_URL || '/api'
const WS_BASE = import.meta.env.VITE_WS_BASE_URL || '/ws'

export default function BoardsPage() {
    const { token, user } = useAuth()
    const navigate = useNavigate()
    const [boards, setBoards] = useState<Board[]>([])
    const [showCreate, setShowCreate] = useState(false)
    const [showPricingModal, setShowPricingModal] = useState(false)
    const [boardToDelete, setBoardToDelete] = useState<{ id: string; name: string } | null>(null)
    const [deleteError, setDeleteError] = useState('')
    const [deleting, setDeleting] = useState(false)
    const [toastMessage, setToastMessage] = useState('')
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [mode, setMode] = useState<'standard' | 'pro'>('standard')
    const [loading, setLoading] = useState(true)
    const [categories, setCategories] = useState<Category[]>([])
    const [showCategoryLink, setShowCategoryLink] = useState<Board | null>(null)

    const isPro = user?.subscription_plan === 'pro' || user?.subscription_plan === 'premium'

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    const fetchBoards = () => {
        fetch(`${API}/boards`, { headers })
            .then(r => r.json())
            .then(data => setBoards(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        fetchBoards()
        fetch(`${API}/barista/categories`, { headers })
            .then(r => r.json())
            .then(data => setCategories(Array.isArray(data) ? data : []))
    }, [])

    // Real-time terminal status WebSocket
    useEffect(() => {
        const proto = location.protocol === 'https:' ? 'wss' : 'ws'
        const url = WS_BASE.startsWith('/')
            ? `${proto}://${location.host}${WS_BASE}?board_id=admin`
            : `${WS_BASE}?board_id=admin`

        const ws = new WebSocket(url)
        ws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data)
                if (data.type === 'TERMINAL_ONLINE' || data.type === 'TERMINAL_OFFLINE') {
                    setBoards(prev => prev.map(b =>
                        b.id === data.board_id
                            ? { ...b, is_online: data.type === 'TERMINAL_ONLINE' }
                            : b
                    ))
                }
            } catch (err) { }
        }
        return () => ws.close()
    }, [])

    const createBoard = async (e: React.FormEvent) => {
        e.preventDefault()
        const res = await fetch(`${API}/boards`, {
            method: 'POST', headers,
            body: JSON.stringify({ name, slug, display_mode: mode, menu_config: {} }),
        })
        if (res.status === 403) {
            // Backend enforced the free-tier limit
            setShowCreate(false)
            setShowPricingModal(true)
            return
        }
        setShowCreate(false); setName(''); setSlug('')
        fetchBoards()
    }

    const handleCreateClick = () => {
        // Frontend shortcut: if free user already has boards, show pricing modal immediately
        if (!isPro && boards.length >= 1) {
            setShowPricingModal(true)
        } else {
            setShowCreate(true)
        }
    }

    // Step 1: ask for confirmation by setting the pending board
    const requestDelete = (id: string, name: string) => {
        setDeleteError('')
        setBoardToDelete({ id, name })
    }

    // Step 2: confirmed — actually call the API
    const confirmDelete = async () => {
        if (!boardToDelete) return
        setDeleting(true)
        setDeleteError('')
        const deletedId = boardToDelete.id
        try {
            const res = await fetch(`${API}/boards/${deletedId}`, { method: 'DELETE', headers })
            if (!res.ok && res.status !== 204) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error || `Server error (${res.status})`)
            }
            // Immediately remove from UI and show toast
            setBoards(prev => prev.filter(b => b.id !== deletedId))
            setBoardToDelete(null)

            setToastMessage('Board deleted successfully')
            setTimeout(() => setToastMessage(''), 3000)

            // Optional background refresh just to sync any other changes
            fetchBoards()
        } catch (e: unknown) {
            setDeleteError((e as Error).message)
        } finally {
            setDeleting(false)
        }
    }

    const handleUnpair = async (boardId: string, isOnline: boolean) => {
        if (isOnline) {
            if (!window.confirm('This will force the TV to show the activation code. Continue?')) {
                return
            }
        }
        try {
            const res = await fetch(`${API}/pairing/unpair`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ board_id: boardId })
            })
            if (res.ok) {
                setToastMessage('Terminal unpaired successfully')
                setTimeout(() => setToastMessage(''), 3000)
            } else {
                console.error('Failed to unpair terminal')
            }
        } catch (e) {
            console.error('Error unpairing terminal:', e)
        }
    }

    const handleUpdateBoardCategories = async (boardId: string, categoryIds: string[]) => {
        try {
            const res = await fetch(`${API}/boards/${boardId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ linked_categories: categoryIds })
            })
            if (res.ok) {
                setToastMessage('Board categories updated')
                setTimeout(() => setToastMessage(''), 3000)
                fetchBoards()
                setShowCategoryLink(null)
            }
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <div className="space-y-8 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 pb-6">
                <div>
                    <h1 className="font-black text-3xl tracking-tighter uppercase">Active Deployments</h1>
                    <p className="text-[10px] mt-2 text-black/40 font-black uppercase tracking-[0.2em]">
                        Manage connected order display terminals
                    </p>
                </div>
                <button className="btn-primary group flex items-center gap-2" onClick={handleCreateClick}>
                    <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                    NEW TERMINAL
                </button>
            </div>

            {loading ? (
                <div className="w-full h-64 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                </div>
            ) : boards.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-16 text-center border border-black/10 bg-[#f9f9f9] relative overflow-hidden"
                >
                    <div className="w-16 h-16 mx-auto bg-black flex items-center justify-center mb-6">
                        <MonitorPlay className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-black text-xl uppercase tracking-widest mb-2">System Empty</h3>
                    <p className="text-[10px] text-black/40 font-black uppercase tracking-[0.2em] mb-8 max-w-sm mx-auto">
                        No active displays. Initialize your first order screen below.
                    </p>
                    <button className="btn-primary inline-flex items-center gap-2" onClick={handleCreateClick}>
                        INITIALIZE DISPLAY
                    </button>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {boards.map((board, i) => (
                            <motion.div
                                key={board.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.4, delay: i * 0.05, type: 'spring' }}
                                className="group border border-black/10 bg-white hover:border-black transition-colors"
                            >
                                <div className="p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                                    <div className="flex items-start justify-between mb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-[#f9f9f9] border border-black/10 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                                                <LayoutTemplate className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-lg uppercase tracking-tight text-black">{board.name}</h3>
                                                <div className="flex items-center gap-1 mt-0.5 text-[10px] font-mono text-black/40">
                                                    <LinkIcon className="w-3 h-3" />/tv/?id={board.id}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {board.is_online ? (
                                                <span title="Terminal Active" className="flex items-center justify-center">
                                                    <Plug className="w-5 h-5 text-[#34c759]" />
                                                </span>
                                            ) : (
                                                <span title="Terminal Offline" className="flex items-center justify-center">
                                                    <Unplug className="w-5 h-5 text-black/20" />
                                                </span>
                                            )}
                                            <span className={board.display_mode === 'pro' ? 'badge-ready' : 'badge-preparing'}>
                                                {board.display_mode === 'pro' ? 'PRO' : 'STD'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-6 border-t border-black/5">
                                        <button
                                            onClick={() => setShowCategoryLink(board)}
                                            className="p-3 bg-white text-black border border-black hover:bg-black hover:text-[#f59e0b] transition-colors"
                                            title="Link Categories"
                                        >
                                            <LayoutTemplate className="w-4 h-4" />
                                        </button>
                                        <a
                                            href={`/tv/?id=${board.id}`}
                                            target="_blank"
                                            className="btn-primary flex-1 py-3 text-[10px] flex items-center justify-center gap-2 bg-white text-black hover:bg-black hover:text-white"
                                        >
                                            <ExternalLink className="w-3 h-3" /> LAUNCH
                                        </a>
                                        <button
                                            onClick={() => handleUnpair(board.id, !!board.is_online)}
                                            className="p-3 bg-white text-black border border-black hover:bg-black hover:text-white transition-colors"
                                            title="Unpair TV Terminal"
                                        >
                                            <Unplug className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => requestDelete(board.id, board.name)}
                                            className="p-3 bg-white text-black border border-black hover:bg-[#ff3b30] hover:border-[#ff3b30] hover:text-white transition-colors"
                                            title="Delete Board"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-black/5 flex flex-wrap gap-2">
                                        {board.linked_categories?.map(catId => {
                                            const cat = categories.find(c => c.id === catId)
                                            return cat ? (
                                                <span key={catId} className="text-[8px] font-black uppercase tracking-widest bg-black/5 px-2 py-1">
                                                    {cat.name}
                                                </span>
                                            ) : null
                                        })}
                                        {(!board.linked_categories || board.linked_categories.length === 0) && (
                                            <span className="text-[8px] font-black uppercase tracking-widest text-black/20">All Categories</span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Create Modal overlay with blur */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                        onClick={() => setShowCreate(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-white border border-black p-8 w-full max-w-md"
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 className="font-black text-2xl uppercase tracking-tighter mb-2">Deploy Screen</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 mb-8 border-b border-black/10 pb-6">CONFIGURE DISPLAY MAPPING</p>

                            <form onSubmit={createBoard} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-black/60">Screen Name</label>
                                    <input className="input-field" placeholder="e.g. Main Counter"
                                        value={name} onChange={e => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) }} required />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-black/60">Display Prefix (URL)</label>
                                    <div className="relative flex items-center">
                                        <span className="absolute left-4 text-black/40 text-sm font-mono">/</span>
                                        <input className="input-field pl-8 font-mono text-sm" placeholder="main-counter"
                                            value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} required />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-black/60">Layout Engine</label>
                                    <div className="relative">
                                        <SelectDropdown
                                            value={mode}
                                            onChange={(v) => setMode(v as 'standard' | 'pro')}
                                            options={[
                                                { label: 'Standard Grid [STD]', value: 'standard' },
                                                { label: 'Pro Engine [PRO]', value: 'pro' }
                                            ]}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-4 pt-6 border-t border-black/10 mt-8">
                                    <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>ABORT</button>
                                    <button type="submit" className="btn-primary flex-1">EXECUTE DEPLOY</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {boardToDelete && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
                        onClick={() => !deleting && setBoardToDelete(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white border border-black p-8 w-full max-w-md relative"
                        >
                            <div className="w-16 h-16 bg-[#ff3b30] flex items-center justify-center mb-6">
                                <Trash2 className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="font-black text-2xl uppercase tracking-tighter mb-2">Confirm Teardown</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/60 mb-6 border-b border-black/10 pb-6">
                                <span className="text-black bg-black/5 px-1 font-mono">{boardToDelete.name}</span> will be permanently removed.
                            </p>
                            {deleteError && (
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#ff3b30] border border-[#ff3b30] p-3 mb-6">
                                    ⚠ {deleteError}
                                </p>
                            )}
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setBoardToDelete(null)}
                                    disabled={deleting}
                                    className="btn-ghost flex-1"
                                >
                                    ABORT
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={deleting}
                                    className="btn-primary flex-1 flex items-center justify-center py-3 bg-[#ff3b30] text-white hover:bg-black border-[#ff3b30] hover:border-black disabled:opacity-50"
                                >
                                    {deleting ? (
                                        <span className="animate-pulse">RUNNING...</span>
                                    ) : (
                                        'CONFIRM DELETION'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Pricing Modal for Free tier limit */}
            <AnimatePresence>
                {showPricingModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
                        onClick={() => setShowPricingModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white border border-black p-10 w-full max-w-lg relative"
                        >
                            <button
                                onClick={() => setShowPricingModal(false)}
                                className="absolute top-4 right-4 p-2 text-black hover:bg-black hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="w-16 h-16 bg-black flex items-center justify-center mb-6">
                                <Crown className="w-6 h-6 text-white" />
                            </div>

                            <h2 className="font-black text-3xl uppercase tracking-tighter mb-2">Limit Reached</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/60 mb-8 border-b border-black/10 pb-8">
                                Free tier enables <strong className="text-black bg-black/5 px-1">1 DISPLAY ROUTE</strong>. Professional access required for unlimited routing.
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-10">
                                {[
                                    'Unlimited Routing',
                                    'SDK Access',
                                    'POS API Uplink',
                                    'Zero Latency Engine',
                                    'White-label System',
                                    'SLA Guarantee',
                                ].map(f => (
                                    <div key={f} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-black/70">
                                        <div className="w-1 h-1 bg-black shrink-0" /> {f}
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowPricingModal(false)}
                                    className="btn-ghost flex-1"
                                >
                                    ABORT
                                </button>
                                <button
                                    onClick={() => { setShowPricingModal(false); navigate('/billing') }}
                                    className="btn-primary flex-1 flex items-center justify-center gap-2 bg-[#ff3b30] border-[#ff3b30] hover:bg-black hover:border-black"
                                >
                                    <Zap className="w-4 h-4" /> UPGRADE PROTOCOL
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Category Link Modal */}
            <AnimatePresence>
                {showCategoryLink && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
                        onClick={() => setShowCategoryLink(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 1 }}
                            className="bg-white border-4 border-black p-12 max-w-md w-full relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 className="font-black text-2xl uppercase tracking-tighter mb-2">Category Routing</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-12 border-b border-black/10 pb-6">
                                SELECT CATEGORIES TO SHOW ON {showCategoryLink.name}
                            </p>

                            <div className="space-y-2 mb-10 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar border-b border-black/10 pb-4">
                                {categories.map(cat => {
                                    const isLinked = showCategoryLink.linked_categories?.includes(cat.id)
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                const current = showCategoryLink.linked_categories || []
                                                const next = isLinked ? current.filter(id => id !== cat.id) : [...current, cat.id]
                                                setShowCategoryLink({ ...showCategoryLink, linked_categories: next })
                                            }}
                                            className={`w-full p-4 border-2 flex justify-between items-center transition-all ${isLinked ? 'border-black bg-black text-white' : 'border-black/10 hover:border-black'}`}
                                        >
                                            <span className="font-black uppercase text-xs tracking-widest">{cat.name}</span>
                                            {isLinked && <Check className="w-4 h-4" />}
                                        </button>
                                    )
                                })}
                                {categories.length === 0 && (
                                    <p className="text-[10px] font-black uppercase opacity-40 py-10">No categories defined. Configure them in Barista Settings.</p>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => setShowCategoryLink(null)} className="btn-ghost flex-1">ABORT</button>
                                <button
                                    onClick={() => handleUpdateBoardCategories(showCategoryLink.id, showCategoryLink.linked_categories || [])}
                                    className="btn-primary flex-1"
                                >
                                    SAVE CONFIG
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success Toast */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="fixed bottom-8 right-8 z-50 bg-black text-white px-8 py-5 flex items-center gap-4 shadow-2xl"
                    >
                        <div className="w-2 h-2 bg-[#ff3b30]" />
                        <span className="font-black text-xs uppercase tracking-widest">{toastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
