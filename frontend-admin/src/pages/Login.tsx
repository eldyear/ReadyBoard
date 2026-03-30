import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
    const { login, register, user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [mode, setMode] = useState<'login' | 'register'>('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [country, setCountry] = useState('KG')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!authLoading && user) {
            navigate('/admin/boards', { replace: true })
        }
    }, [user, authLoading, navigate])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            if (mode === 'login') {
                await login(email, password)
            } else {
                await register(email, password, name, country)
            }
            navigate('/admin/boards')
        } catch (err: unknown) {
            setError((err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    if (authLoading) return (
        <div className="flex h-full items-center justify-center">
            <div className="animate-spin text-4xl">☕</div>
        </div>
    )

    return (
        <div className="min-h-full flex items-stretch bg-white relative overflow-hidden">
            {/* Left Side Hero */}
            <div className="hidden lg:flex flex-1 bg-[#f9f9f9] border-r border-black/10 p-12 flex-col justify-between">
                <div>
                    <img src="/rb_line.svg" alt="ReadyBoard" className="h-6 object-contain mb-20" />
                    <h2 className="text-[clamp(3rem,6vw,6rem)] leading-[0.85] tracking-[-0.06em] font-black uppercase">
                        Terminal<br />
                        <span className="text-[#ff3b30]">Control.</span>
                    </h2>
                </div>
                <div className="font-mono text-[10px] uppercase opacity-40">
                    System Version: 2.0.4 <br />
                    Status: Online
                </div>
            </div>

            {/* Right Side Auth Form */}
            <div className="flex-1 flex items-center justify-center p-8 lg:p-12 relative z-10 bg-white">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-[400px]"
                >
                    {/* Header */}
                    <div className="mb-12">
                        <h2 className="font-black text-4xl tracking-tighter uppercase mb-4">
                            {mode === 'login' ? 'Auth' : 'Initialize'}
                        </h2>
                        <p className="text-xs font-bold uppercase tracking-widest text-black/40">
                            {mode === 'login' ? 'Access your dashboard' : 'Create new deployment'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <AnimatePresence mode="popLayout">
                            {mode === 'register' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-6"
                                >
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-black/60">Full Name</label>
                                        <input className="input-field" type="text" placeholder="John Doe"
                                            value={name} onChange={e => setName(e.target.value)} required />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-black/60">Country</label>
                                        <select 
                                            className="input-field appearance-none bg-white text-black"
                                            value={country} 
                                            onChange={e => setCountry(e.target.value)}
                                            required
                                        >
                                            <option value="KG">Kyrgyzstan (KG)</option>
                                            <option value="KZ">Kazakhstan (KZ)</option>
                                            <option value="UZ">Uzbekistan (UZ)</option>
                                            <option value="US">United States (US)</option>
                                            <option value="GB">United Kingdom (GB)</option>
                                            <option value="DE">Germany (DE)</option>
                                        </select>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-black/60">Email Address</label>
                            <input className="input-field" type="email" placeholder="admin@cafe.com"
                                value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-black/60">Password</label>
                            <input className="input-field" type="password" placeholder="••••••••"
                                value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-[10px] font-black uppercase tracking-widest p-4 border border-[#ff3b30] text-[#ff3b30] bg-white flex items-center gap-2"
                                >
                                    <span className="w-1.5 h-1.5 bg-[#ff3b30] shrink-0" />
                                    {error}
                                </motion.p>
                            )}
                        </AnimatePresence>

                        <button type="submit" className="btn-primary w-full mt-8 group flex items-center justify-center gap-4" disabled={loading}>
                            {loading ? (
                                <span className="animate-pulse">PROCESSING...</span>
                            ) : (
                                <>
                                    {mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
                                    <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 border-t border-black/10 pt-6">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">
                            {mode === 'login' ? "NO ACCOUNT? " : 'ALREADY AUTHORIZED? '}
                            <button className="text-black hover:text-[#ff3b30] transition-colors ml-2 font-black border-b border-transparent hover:border-[#ff3b30]"
                                onClick={() => setMode(m => m === 'login' ? 'register' : 'login')}>
                                {mode === 'login' ? 'REGISTER NOW' : 'SIGN IN INSTEAD'}
                            </button>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
