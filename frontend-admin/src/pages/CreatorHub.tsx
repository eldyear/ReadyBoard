import { useState } from 'react'
import { UploadCloud, CheckCircle2, AlertCircle, FileCode } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'

const API = import.meta.env.VITE_API_BASE_URL || '/api'

export default function CreatorHub() {
    const { token } = useAuth()
    const [name, setName] = useState('')
    const [price, setPrice] = useState<number>(0)
    const [fileContent, setFileContent] = useState<string>('')
    const [fileName, setFileName] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [toast, setToast] = useState<{ message: string, type: 'error' | 'success' } | null>(null)

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ message: msg, type })
        setTimeout(() => setToast(null), 4000)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.name.endsWith('.html')) {
            showToast('Only .html files are accepted', 'error')
            return
        }

        setFileName(file.name)
        const reader = new FileReader()
        reader.onload = (event) => {
            const content = event.target?.result
            if (typeof content === 'string') {
                setFileContent(content)
            }
        }
        reader.readAsText(file)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || !fileContent) {
            showToast('Name and HTML file are required', 'error')
            return
        }
        setSubmitting(true)
        try {
            const res = await fetch(`${API}/themes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ name, content: fileContent, price })
            })
            if (res.ok) {
                showToast('Theme successfully uploaded to your Library!', 'success')
                setName(''); setPrice(0); setFileContent(''); setFileName('')
            } else {
                const data = await res.json()
                showToast(data.error || 'Failed to upload theme', 'error')
            }
        } catch {
            showToast('Network error during upload', 'error')
        } finally {
            setSubmitting(false)
        }
    }


    return (
        <div className="max-w-3xl mx-auto py-12 px-6">
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-4 flex items-center gap-3 border shadow-[4px_4px_0_0_rgba(0,0,0,1)] text-white font-black uppercase tracking-widest text-xs
                            ${toast.type === 'success' ? 'bg-indigo-500 border-indigo-900' : 'bg-[#ff3b30] border-black'}`}
                    >
                        {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="mb-12 border-b-2 border-indigo-100 pb-8">
                <div className="w-16 h-16 bg-indigo-500 mb-6 flex items-center justify-center">
                    <FileCode className="w-8 h-8 text-white" />
                </div>
                <h1 className="font-black text-5xl uppercase tracking-tighter text-indigo-900 mb-2">Creator Hub</h1>
                <p className="font-mono text-sm text-indigo-900/60 max-w-lg">Upload custom HTML themes to the ReadyBoard ecosystem. Themes are verified and instantly available in your library.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8 bg-white border-2 border-indigo-100 p-8 sm:p-12 shadow-[8px_8px_0_0_rgba(224,231,255,1)]">

                {/* File Upload Zone */}
                <div className="relative">
                    <input
                        type="file"
                        accept=".html"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={`border-2 border-dashed flex flex-col items-center justify-center p-12 transition-colors
                        ${fileContent ? 'border-indigo-500 bg-indigo-50' : 'border-indigo-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50'}`}>
                        {fileContent ? (
                            <>
                                <CheckCircle2 className="w-12 h-12 text-indigo-500 mb-4" />
                                <span className="font-black uppercase tracking-widest text-indigo-900 text-xs text-center">{fileName} Loaded</span>
                                <span className="font-mono text-[10px] text-indigo-900/50 mt-2">{(fileContent.length / 1024).toFixed(2)} KB</span>
                            </>
                        ) : (
                            <>
                                <UploadCloud className="w-12 h-12 text-indigo-300 mb-4" />
                                <span className="font-black uppercase tracking-widest text-indigo-900 text-xs text-center">Drag & Drop .HTML file</span>
                                <span className="font-mono text-[10px] text-indigo-900/50 mt-2">Maximum file size 2MB</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-900 mb-2">Theme Name</label>
                        <input
                            required
                            type="text"
                            placeholder="e.g. Neon Cyberpunk"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-indigo-100 text-indigo-900 text-sm p-4 font-bold focus:border-indigo-500 focus:outline-none focus:bg-white transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-900 mb-2">Marketplace Price ($)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.50"
                            placeholder="0.00"
                            value={price}
                            onChange={e => setPrice(parseFloat(e.target.value))}
                            className="w-full bg-slate-50 border-2 border-indigo-100 text-indigo-900 text-sm p-4 font-mono focus:border-indigo-500 focus:outline-none focus:bg-white transition-colors"
                        />
                    </div>
                </div>

                <div className="bg-indigo-50 p-6 border-l-4 border-indigo-500">
                    <h4 className="font-black uppercase tracking-widest text-[10px] text-indigo-900 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Distribution Notice
                    </h4>
                    <p className="font-mono text-[11px] leading-relaxed text-indigo-900/70">
                        By submitting this theme, you confirm you own the rights to the HTML/CSS/JS payload. Free themes (Price: $0.00) will be instantly available in your library but require manual approval before appearing in the public Marketplace.
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={submitting || !fileContent}
                    className={`w-full py-5 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-sm transition-all
                        ${submitting || !fileContent
                            ? 'bg-slate-100 text-slate-400 border-2 border-slate-200 cursor-not-allowed'
                            : 'bg-indigo-500 text-white border-2 border-indigo-500 hover:bg-indigo-600 hover:shadow-[4px_4px_0_0_rgba(49,46,129,1)] -translate-y-1'}`}
                >
                    {submitting ? 'Uploading...' : 'Deploy Theme to Network'}
                </button>
            </form>
        </div>
    )
}
