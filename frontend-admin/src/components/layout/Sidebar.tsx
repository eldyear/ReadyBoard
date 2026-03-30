import { useState } from 'react'
import { NavLink, useNavigate, Link } from 'react-router-dom' // Добавили Link
import { useAuth } from '../../hooks/useAuth'
import { motion } from 'framer-motion'
import {
    LayoutDashboard, MonitorPlay, BarChart3, Palette,
    Webhook, CreditCard, LogOut, Crown,
    ChevronLeft, ChevronRight, Link2, Smartphone
} from 'lucide-react'

const navItems = [
    { to: '/admin/boards', icon: LayoutDashboard, label: 'Boards' },
    { to: '/admin/barista', icon: MonitorPlay, label: 'Barista Panel' },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/admin/theme', icon: Palette, label: 'Theme Editor' },
    { to: '/admin/developers', icon: Webhook, label: 'Developer Portal' },
    { to: '/admin/barista-settings', icon: Smartphone, label: 'Nano-Barista' },
    { to: '/admin/activate', icon: Link2, label: 'Pair TV' },
    { to: '/admin/billing', icon: CreditCard, label: 'Billing' },
]

export default function Sidebar() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [isCollapsed, setIsCollapsed] = useState(false)

    const handleLogout = () => { logout(); navigate('/login') }

    const isPro = user?.subscription_plan === 'pro' || user?.subscription_plan === 'premium'
    const displayName = user?.full_name || user?.email || 'User'
    const initials = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

    return (
        <motion.aside
            initial={false}
            animate={{ width: isCollapsed ? 80 : 256 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex flex-col shrink-0 h-full relative z-20 bg-white border-r border-black/10 overflow-hidden"
        >
            {/* 1. Блок Логотипа */}
            <div className="px-6 py-8">
                <Link
                    to="/"
                    className={`flex items-center hover:opacity-80 transition-opacity ${isCollapsed ? 'justify-center' : ''}`}
                >
                    {isCollapsed ? (
                        /* Когда сайдбар свернут — показываем только знак (The Monolith) */
                        <img src="/rb_monolith.svg" alt="RB" className="w-10 h-10 object-contain" />
                    ) : (
                        /* Когда развернут — показываем основной интерфейсный логотип (The Line) */
                        <motion.img
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            src="/rb_line.svg"
                            alt="ReadyBoard"
                            className="h-8 w-auto object-contain"
                        />
                    )}
                </Link>
            </div>

            {/* 2. ЛИНИЯ-РАЗДЕЛИТЕЛЬ С КНОПКОЙ */}
            <div className="relative border-b border-black/10 w-full">
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 z-50 bg-white text-black hover:text-[#ff3b30] transition-colors"
                >
                    {isCollapsed ?
                        <ChevronRight size={24} strokeWidth={3} className="bg-white" /> :
                        <ChevronLeft size={24} strokeWidth={3} className="bg-white" />
                    }
                </button>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
                {!isCollapsed && (
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 px-2">Menu</div>
                )}
                {navItems.map(item => {
                    const Icon = item.icon
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            title={isCollapsed ? item.label : ''}
                            className={({ isActive }) => `
                                flex items-center gap-4 px-3 py-3 transition-all group
                                ${isActive ? 'bg-black text-white' : 'hover:bg-gray-100 text-black'}
                                ${isCollapsed ? 'justify-center' : ''}
                            `}
                        >
                            <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110`} />
                            {!isCollapsed && (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="font-black text-[10px] uppercase tracking-widest whitespace-nowrap"
                                >
                                    {item.label}
                                </motion.span>
                            )}
                        </NavLink>
                    )
                })}
            </nav>

            {/* User Profile Footer */}
            <div className="p-4 mt-auto border-t border-black/10 bg-white">
                <div className="flex flex-col gap-4">
                    {/* Profile Info */}
                    <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center px-0' : 'px-2'}`}>
                        <div className="w-10 h-10 bg-black flex items-center justify-center text-[10px] font-black text-white shrink-0">
                            {initials}
                        </div>
                        {!isCollapsed && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0 flex-1">
                                <p className="text-[10px] font-[900] uppercase tracking-widest truncate text-black">{displayName}</p>
                                <p className="text-[8px] font-mono opacity-40 truncate text-black">{user?.email}</p>
                            </motion.div>
                        )}
                    </div>

                    {!isCollapsed ? (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className={`flex items-center justify-between gap-3 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] border border-black ${isPro ? 'bg-black text-white' : 'bg-white text-black'}`}
                        >
                            <div className="flex items-center gap-3">
                                <Crown className="w-5 h-5" />
                                {isPro ? 'PRO Plan' : 'FREE Plan'}
                            </div>
                            <span className="opacity-40 font-mono">[{user?.country_code}]</span>
                        </motion.div>
                    ) : (
                        <div title={isPro ? 'PRO Plan' : 'FREE Plan'} className={`flex justify-center py-2.5 border border-black ${isPro ? 'bg-black text-white' : 'bg-white text-black'}`}>
                            <Crown className="w-5 h-5" />
                        </div>
                    )}

                    {/* Logout Button - Увеличенная и жирная */}
                    <button
                        onClick={handleLogout}
                        title="Sign Out"
                        className={`
                            flex items-center gap-3 w-full py-1 
                            text-[20px] font-[900] uppercase tracking-[0.2em] 
                            text-black border-2 border-black 
                            hover:bg-[#ff3b30] hover:text-white hover:border-[#ff3b30] 
                            transition-all duration-200 h-[40px]
                            ${isCollapsed ? 'justify-center px-0' : 'px-4'}
                        `}
                    >
                        <LogOut className={`${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'} stroke-[2.5px] shrink-0`} />
                        {!isCollapsed && <span className="text-[10px] font-[900] uppercase tracking-[0.2em]">Sign Out</span>}
                    </button>
                </div>
            </div>
        </motion.aside>
    )
}