import { useState, useEffect } from 'react'
import { Store, Download, CheckCircle2, Upload, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'

const API = import.meta.env.VITE_API_BASE_URL || '/api'

interface Theme {
    id: string
    name: string
    description: string
    price: number
    preview_url?: string
}

export default function MarketplacePage() {
    const { token } = useAuth()
    const [themes, setThemes] = useState<Theme[]>([])
    const [myThemes, setMyThemes] = useState<any[]>([])
    const [purchasingId, setPurchasingId] = useState<string | null>(null)
    const [showSubmitModal, setShowSubmitModal] = useState(false)
    const [submitForm, setSubmitForm] = useState({ name: '', description: '', price: 0, content: '' })
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    useEffect(() => {
        // Fetch marketplace themes
        fetch(`${API}/marketplace/themes`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setThemes(data)
            })
            .catch(console.error)

        // Fetch my library
        fetch(`${API}/themes`, { headers })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setMyThemes(data)
            })
            .catch(console.error)
    }, [token])

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ message: msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    const handlePurchase = async (themeId: string) => {
        setPurchasingId(themeId)
        try {
            const res = await fetch(`${API}/marketplace/buy`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ theme_id: themeId })
            })
            const data = await res.json()
            if (res.ok) {
                showToast(data.message || 'Theme purchased successfully!', 'success')
                setMyThemes(prev => [...prev, { id: themeId }]) // Optimistic update
            } else {
                showToast(data.error || 'Failed to purchase theme', 'error')
            }
        } catch (error) {
            showToast('Network error on purchase', 'error')
        } finally {
            setPurchasingId(null)
        }
    }

    const handleSubmitTheme = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!submitForm.content) {
            showToast('Please upload a theme file (.html)', 'error')
            return
        }
        try {
            const res = await fetch(`${API}/themes`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    name: submitForm.name,
                    description: submitForm.description,
                    content: submitForm.content,
                    price: submitForm.price / 100
                })
            })
            if (res.ok) {
                showToast('Theme submitted successfully!', 'success')
                setShowSubmitModal(false)
                setSubmitForm({ name: '', description: '', price: 0, content: '' })
                // Refresh marketplace to show the new theme
                fetch(`${API}/marketplace/themes`)
                    .then(r => r.json())
                    .then(data => {
                        if (Array.isArray(data)) setThemes(data)
                    })
            } else {
                const data = await res.json()
                showToast(data.error || 'Failed to submit theme', 'error')
            }
        } catch (error) {
            showToast('Network error on submit', 'error')
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (event) => setSubmitForm(prev => ({ ...prev, content: event.target?.result as string }))
        reader.readAsText(file)
    }

    const isOwned = (id: string) => myThemes.some(t => t.id === id || t.theme_id === id)

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    }
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className={`fixed bottom-8 right-8 z-50 px-6 py-4 flex items-center gap-3 border shadow-[4px_4px_0_0_rgba(0,0,0,1)] text-white font-black uppercase tracking-widest text-xs
                            ${toast.type === 'success' ? 'bg-indigo-500 border-indigo-900' : 'bg-[#ff3b30] border-black'}`}
                    >
                        {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 pb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500 flex items-center justify-center">
                        <Store className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="font-black text-4xl tracking-tighter uppercase text-indigo-900">Theme Marketplace</h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-900/40 mt-1">Discover, buy, and sell custom displays</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowSubmitModal(true)}
                    className="bg-white hover:bg-indigo-50 text-indigo-900 border-2 border-indigo-500 px-6 py-3 flex items-center gap-2 transition-colors text-[10px] font-black tracking-widest uppercase hover:shadow-[4px_4px_0_0_rgba(99,102,241,1)]"
                >
                    <Upload className="w-4 h-4" />
                    Submit Theme
                </button>
            </div>

            {/* Content grid */}
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {themes.map(theme => {
                    const owned = isOwned(theme.id)
                    return (
                        <motion.div key={theme.id} variants={itemVariants} className="bg-white border-2 border-indigo-100 hover:border-indigo-500 transition-colors flex flex-col group overflow-hidden">
                            <div className="h-40 bg-indigo-50 border-b-2 border-indigo-100 flex items-center justify-center relative overflow-hidden">
                                {theme.preview_url ? (
                                    <img src={theme.preview_url} alt={theme.name} className="w-full h-full object-cover mix-blend-multiply opacity-80 group-hover:opacity-100 transition-opacity" />
                                ) : (
                                    <div className="text-indigo-900/20"><Store className="w-16 h-16" /></div>
                                )}
                                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm border-2 border-indigo-900 text-indigo-900 font-black text-xs px-2 py-1 tracking-widest shadow-[2px_2px_0_0_rgba(49,46,129,1)]">
                                    {theme.price === 0 ? 'FREE' : `$${(theme.price / 100).toFixed(2)}`}
                                </div>
                            </div>
                            <div className="p-6 flex flex-col flex-1 overflow-hidden">
                                <h3 title={theme.name} className="font-black text-xl text-indigo-900 uppercase tracking-tighter mb-2 truncate w-full">{theme.name}</h3>
                                <p className="text-xs text-indigo-900/60 font-mono mb-6 flex-1">{theme.description}</p>

                                <button
                                    onClick={() => !owned && handlePurchase(theme.id)}
                                    disabled={owned || purchasingId === theme.id}
                                    className={`w-full py-3 flex items-center justify-center gap-2 uppercase font-black text-[10px] tracking-widest transition-all
                                        ${owned
                                            ? 'bg-indigo-50 text-indigo-300 border-2 border-indigo-100 cursor-not-allowed'
                                            : purchasingId === theme.id
                                                ? 'bg-indigo-200 text-indigo-900 border-2 border-indigo-200 cursor-wait'
                                                : 'bg-indigo-500 text-white border-2 border-indigo-500 hover:bg-indigo-600 hover:shadow-[4px_4px_0_0_rgba(99,102,241,1)] -translate-y-1'
                                        }`}
                                >
                                    {owned ? (
                                        <><CheckCircle2 className="w-4 h-4" /> In Library</>
                                    ) : purchasingId === theme.id ? (
                                        'Processing...'
                                    ) : (
                                        <><Download className="w-4 h-4" /> {theme.price === 0 ? 'Add to Library' : 'Buy Theme'}</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )
                })}
                {themes.length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-indigo-900/40">
                        <Store className="w-12 h-12 mb-4 opacity-50" />
                        <p className="font-black uppercase tracking-widest text-xs">No themes available in marketplace.</p>
                    </div>
                )}
            </motion.div>

            {/* Developer Submit Modal */}
            <AnimatePresence>
                {showSubmitModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-indigo-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowSubmitModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white border-2 border-indigo-500 shadow-[8px_8px_0_0_rgba(99,102,241,1)] p-8 max-w-md w-full"
                        >
                            <h2 className="font-black text-2xl uppercase tracking-tighter text-indigo-900 mb-2">Developer Submission</h2>
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-900/50 mb-6 border-b-2 border-indigo-50 pb-6">Submit a custom theme for review</p>

                            <form onSubmit={handleSubmitTheme} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-900 mb-2">Theme Name</label>
                                    <input required type="text" value={submitForm.name} onChange={e => setSubmitForm({ ...submitForm, name: e.target.value })} className="w-full bg-indigo-50 border-2 border-indigo-100 text-indigo-900 text-xs p-3 font-bold focus:border-indigo-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-900 mb-2">Description</label>
                                    <textarea required value={submitForm.description} onChange={e => setSubmitForm({ ...submitForm, description: e.target.value })} className="w-full bg-indigo-50 border-2 border-indigo-100 text-indigo-900 text-xs p-3 font-mono focus:border-indigo-500 focus:outline-none h-24 resize-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-900 mb-2">Price (Cents)</label>
                                    <input type="number" min="0" value={submitForm.price} onChange={e => setSubmitForm({ ...submitForm, price: parseInt(e.target.value) })} className="w-full bg-indigo-50 border-2 border-indigo-100 text-indigo-900 text-xs p-3 font-mono focus:border-indigo-500 focus:outline-none" />
                                </div>
                                <div className="pt-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-900 mb-2">Theme Code File</label>
                                    <label className={`w-full py-4 px-4 border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${submitForm.content ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-indigo-200 hover:border-indigo-400 text-indigo-400'}`}>
                                        <div className="flex items-center gap-2">
                                            {submitForm.content ? <CheckCircle2 className="w-5 h-5 text-indigo-500" /> : <Upload className="w-5 h-5" />}
                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                {submitForm.content ? 'File Loaded' : 'Upload .html File'}
                                            </span>
                                        </div>
                                        <input type="file" accept=".html,.css,.json" className="hidden" onChange={handleFileUpload} />
                                    </label>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button type="button" onClick={() => setShowSubmitModal(false)} className="flex-1 py-3 border-2 border-indigo-100 text-indigo-900 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors">Cancel</button>
                                    <button type="submit" className="flex-1 py-3 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest border-2 border-indigo-500 hover:bg-indigo-600 transition-colors">Submit</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
