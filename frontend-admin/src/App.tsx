import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Sidebar from './components/layout/Sidebar'
import LoginPage from './pages/Login'
import BoardsPage from './pages/Boards'
import BaristaPanel from './pages/BaristaPanel'
import AnalyticsPage from './pages/Analytics'
import ThemeEditor from './pages/ThemeEditor'
import MarketplacePage from './pages/Marketplace'
import Developers from './pages/Developers'
import BillingPage from './pages/Billing'
import LandingPage from './pages/LandingPage'
import CreatorHub from './pages/CreatorHub' // We'll create this next
import Activate from './pages/Activate'
import NanoBarista from './pages/NanoBarista'
import NanoBaristaSettings from './pages/NanoBaristaSettings'


function DashboardLayout() {
    const { user, loading } = useAuth()

    // While checking session token
    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-white">
            <div className="font-black text-4xl uppercase tracking-tighter text-black animate-pulse">Initializing...</div>
        </div>
    )

    // Protect dashboard routes
    if (!user) return <Navigate to="/login" replace />

    return (
        <div className="flex h-screen bg-white text-black font-['Inter',sans-serif]">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-6 md:p-10">
                <Routes>
                    <Route index element={<Navigate to="boards" replace />} />
                    <Route path="boards" element={<BoardsPage />} />
                    <Route path="barista" element={<BaristaPanel />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="theme" element={<ThemeEditor />} />
                    <Route path="developers" element={<Developers />} />
                    <Route path="billing" element={<BillingPage />} />
                    <Route path="marketplace" element={<MarketplacePage />} />
                    <Route path="activate" element={<Activate />} />
                    <Route path="barista-settings" element={<NanoBaristaSettings />} />
                </Routes>
            </main>
        </div>
    )
}

export default function App() {
    const [isRedirecting, setIsRedirecting] = useState(false)

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const isTvMode = urlParams.get('mode') === 'tv'

        const isSmartTV = () => {
            const ua = navigator.userAgent.toLowerCase()
            return (
                ua.includes('smarttv') ||
                ua.includes('tizen') ||
                ua.includes('webos') ||
                ua.includes('netcast') ||
                ua.includes('viera') ||
                ua.includes('playstation') ||
                ua.includes('xbox') ||
                ua.includes('googletv') ||
                ua.includes('appletv') ||
                ua.includes('hbbtv') ||
                ua.includes('crkey') ||
                ua.includes('large screen')
            )
        }
        // Prevent redirect loop if already on /tv
        if (window.location.pathname.startsWith('/tv')) {
            return
        }

        if (isTvMode || isSmartTV()) {
            setIsRedirecting(true)
            window.location.href = '/tv/'
        }
    }, [])

    if (window.location.pathname.startsWith('/tv') || isRedirecting) {
        // Black-out during redirect or if the proxy hasn't kicked in yet
        return <div className="h-screen w-screen bg-black" />
    }

    return (
        <AuthProvider>
            <div className="h-screen w-full bg-white text-black font-['Inter',sans-serif]">
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/marketplace" element={<MarketplacePage />} />
                    <Route path="/login" element={<LoginPage />} />

                    {/* Protected Admin Routes */}
                    <Route path="/admin/*" element={<DashboardLayout />} />

                    {/* Dedicated Fullscreen Tools */}
                    <Route path="/barista" element={<NanoBarista />} />

                    {/* Creator Studio Route */}
                    <Route path="/admin/creator" element={<CreatorHub />} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </AuthProvider>
    )
}
