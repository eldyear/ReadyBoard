import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { Zap, Check, Crown, RefreshCw, AlertCircle, Building } from 'lucide-react'

const API = import.meta.env.VITE_API_BASE_URL || '/api'

const FREE_FEATURES = [
    '1 Display Board',
    'Standard themes',
    'Manual order entry',
    'Basic analytics',
]
const PRO_FEATURES = [
    'Unlimited Display Boards',
    'Custom HTML themes + SDK',
    'POS API integration',
    'Real-time WebSocket sync',
    'Focus Mode for Barista Panel',
    'Priority support',
]

export default function BillingPage() {
    const { token, user, refreshUser } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')

    const isPro = user?.subscription_plan === 'pro' || user?.subscription_plan === 'premium'

    useEffect(() => {
        const query = new URLSearchParams(window.location.search)
        if (query.get('payment') === 'success') {
            setSuccess('✅ Payment successful! Your Pro plan is now active.')
            refreshUser()
            window.history.replaceState({}, document.title, window.location.pathname)
        }
        if (query.get('payment') === 'cancelled') {
            setError('Payment cancelled. Your license was not upgraded.')
            window.history.replaceState({}, document.title, window.location.pathname)
        }
    }, [refreshUser])

    const activatePro = async () => {
        setLoading(true)
        setError('')
        setSuccess('')
        try {
            const priceId = import.meta.env.VITE_STRIPE_PRICE_ID_PRO
            if (!priceId) {
                console.warn("VITE_STRIPE_PRICE_ID_PRO is not set in environment variables.")
                throw new Error("Stripe price ID is not configured on the frontend.")
            }

            const res = await fetch(`${API}/checkout/create-session`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ price_id: priceId })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Checkout session failed')

            if (data.url) {
                window.location.href = data.url
            } else {
                throw new Error('No checkout URL returned')
            }
        } catch (e: unknown) {
            setError((e as Error).message)
            setLoading(false)
        }
    }

    const cancelSubscription = async () => {
        if (!confirm('Are you sure you want to cancel your subscription? Your Pro benefits will remain active until the end of the current billing period.')) return
        setLoading(true)
        setError('')
        try {
            const res = await fetch(`${API}/billing/cancel`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!res.ok) throw new Error((await res.json()).error || 'Cancellation failed')
            setSuccess('✅ Your subscription has been set to cancel at the end of the current period.')
            refreshUser()
        } catch (e: unknown) {
            setError((e as Error).message)
        } finally {
            setLoading(false)
        }
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    }
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    }

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <motion.div variants={itemVariants}>
                <div className="flex items-center gap-4 mb-2 border-b border-black/10 pb-6">
                    <div className="w-16 h-16 bg-black flex items-center justify-center">
                        <Building className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="font-black text-4xl tracking-tighter uppercase">Operations</h1>
                        <p className="text-[10px] text-black/40 mt-1 font-black uppercase tracking-[0.2em]">Manage your ReadyBoard deployment</p>
                    </div>
                </div>
            </motion.div>

            {/* Current Plan Banner */}
            <motion.div variants={itemVariants} className={`bg-[#f9f9f9] p-8 border ${isPro ? 'border-[#ff3b30]' : 'border-black/10'}`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <Crown className={`w-8 h-8 ${isPro ? 'text-[#ff3b30]' : 'text-black/20'}`} />
                        <div>
                            <p className="text-[10px] text-black/40 font-black uppercase tracking-[0.2em]">Current License</p>
                            <div className="flex items-baseline gap-2">
                                <p className="font-black text-3xl uppercase tracking-tighter mt-1">{user?.subscription_plan || 'COMMUNITY'}</p>
                                <span className="text-[10px] font-mono text-black/40">[{user?.country_code}]</span>
                            </div>
                            {isPro && user?.pro_expires_at && (
                                <div className="space-y-1 mt-2">
                                    <p className="text-[10px] font-mono text-black/60 bg-black/5 px-2 py-1 inline-block">
                                        VALID THRU: {new Date(user.pro_expires_at).toLocaleDateString()}
                                    </p>
                                    {!user.auto_renew && (
                                        <p className="text-[8px] font-black uppercase text-[#ff3b30] tracking-widest block">
                                            [CANCELLED - NO AUTO-RENEW]
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 border ${isPro ? 'bg-[#ff3b30] border-[#ff3b30] text-white' : 'bg-white border-black/10 text-black'
                        }`}>
                        {isPro ? 'ACTIVE' : 'DEFAULT'}
                    </span>
                </div>
                {!isPro && (
                    <button
                        onClick={() => navigate('/billing')}
                        className="mt-6 text-[10px] font-black uppercase tracking-widest text-[#ff3b30] hover:text-black border-b border-transparent hover:border-black transition-colors"
                    >
                        INITIALIZE PRO UPGRADE FOR UNRESTRICTED ACCESS →
                    </button>
                )}
            </motion.div>

            {/* Plans */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {/* Free Plan */}
                <div className="bg-white p-8 flex flex-col gap-6 border border-black/10 hover:border-black transition-colors">
                    <div className="border-b border-black/10 pb-6">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 mb-2">COMMUNITY</p>
                        <p className="font-black text-5xl tracking-tighter uppercase">$0 <span className="text-xs font-bold tracking-widest text-black/40">/ MO</span></p>
                    </div>
                    <ul className="space-y-4 flex-1">
                        {FREE_FEATURES.map(f => (
                            <li key={f} className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-black/70">
                                <Check className="w-4 h-4 text-black shrink-0" />
                                {f}
                            </li>
                        ))}
                    </ul>
                    <div className={`w-full text-center py-4 text-[10px] font-black tracking-[0.2em] uppercase border ${!isPro
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-black/40 border-black/10'}`}>
                        {!isPro ? 'CURRENT TIER' : 'DOWNGRADE'}
                    </div>
                </div>

                {/* Pro Plan */}
                <div className="bg-[#f9f9f9] p-8 flex flex-col gap-6 relative border border-black hover:border-[#ff3b30] transition-colors">
                    <div className="absolute top-0 right-0 left-0 h-1 bg-[#ff3b30]" />
                    <div className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-[0.2em] bg-[#ff3b30] text-white px-3 py-1">
                        RECOMMENDED
                    </div>
                    <div className="border-b border-black/10 pb-6">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff3b30] mb-2">PROFESSIONAL</p>
                        <p className="font-black text-5xl tracking-tighter uppercase">$19 <span className="text-xs font-bold tracking-widest text-black/40">/ MO</span></p>
                    </div>
                    <ul className="space-y-4 flex-1">
                        {PRO_FEATURES.map(f => (
                            <li key={f} className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-black">
                                <Check className="w-4 h-4 text-[#ff3b30] shrink-0" />
                                {f}
                            </li>
                        ))}
                    </ul>
                    {isPro ? (
                        <div className="space-y-4">
                            <div className="w-full text-center py-4 text-[10px] font-black tracking-[0.2em] uppercase bg-[#ff3b30] text-white border border-[#ff3b30]">
                                ACTIVE LICENSE ({user?.country_code === 'KG' || user?.country_code === 'KZ' || user?.country_code === 'UZ' ? 'FREEDOM PAY' : 'STRIPE'})
                            </div>
                            {user?.auto_renew && (
                                <button
                                    onClick={cancelSubscription}
                                    disabled={loading}
                                    className="w-full text-center py-2 text-[10px] font-black tracking-[0.2em] uppercase text-black/40 hover:text-[#ff3b30] transition-colors"
                                >
                                    CANCEL SUBSCRIPTION
                                </button>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={activatePro}
                            disabled={loading}
                            className="w-full text-center py-4 text-[10px] font-black tracking-[0.2em] uppercase bg-[#ff3b30] text-white border border-[#ff3b30] hover:bg-black hover:border-black transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <><Zap className="w-4 h-4" /> INITIATE UPGRADE</>
                            )}
                        </button>
                    )}
                </div>
            </motion.div>

            {/* Status Messages */}
            {success && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="p-4 border border-black bg-black text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl">
                    <div className="w-2 h-2 bg-[#ff3b30]" />
                    {success}
                </motion.div>
            )}
            {error && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="p-4 border border-[#ff3b30] bg-white text-[#ff3b30] text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </motion.div>
            )}

            {/* Stripe Notice */}
            <motion.div variants={itemVariants} className="p-6 border border-black/10 bg-[#f9f9f9]">
                <p className="text-[10px] font-mono text-black/60 text-center uppercase">
                    SYS.LOG: Payments routed via <strong className="text-black font-black">
                        {(user?.country_code === 'KG' || user?.country_code === 'KZ' || user?.country_code === 'UZ') ? 'FREEDOM PAY' : 'STRIPE'}
                    </strong> based on [{user?.country_code}]. Subscriptions can be canceled at any time.
                </p>
            </motion.div>
        </motion.div>
    )
}
