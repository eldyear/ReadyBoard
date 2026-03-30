import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react'

interface User {
    id: string
    email: string
    full_name: string
    subscription_plan: string
    subscription_status: string
    pro_expires_at?: string
    country_code: string
    auto_renew: boolean
}

interface AuthState { user: User | null; token: string | null; loading: boolean }
interface AuthContextValue extends AuthState {
    login: (email: string, password: string) => Promise<void>
    register: (email: string, password: string, fullName: string, countryCode: string) => Promise<void>
    logout: () => void
    refreshUser: () => Promise<void>
}

const API = import.meta.env.VITE_API_BASE_URL || '/api'
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        token: localStorage.getItem('rb_token'),
        loading: true,
    })

    const fetchMe = useCallback(async (token: string): Promise<User | null> => {
        try {
            const res = await fetch(`${API}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!res.ok) throw new Error('Not authenticated')
            return await res.json()
        } catch {
            return null
        }
    }, [])

    // Hydrate from localStorage on mount — fetches full user from DB
    useEffect(() => {
        const token = localStorage.getItem('rb_token')
        if (!token) { setState(s => ({ ...s, loading: false })); return }
        fetchMe(token).then(user => {
            if (user) {
                setState({ user, token, loading: false })
            } else {
                localStorage.removeItem('rb_token')
                setState({ user: null, token: null, loading: false })
            }
        })
    }, [])

    // Silent re-fetch — called after actions like Activate Pro
    const refreshUser = useCallback(async () => {
        const token = localStorage.getItem('rb_token')
        if (!token) return
        const user = await fetchMe(token)
        if (user) setState(s => ({ ...s, user }))
    }, [fetchMe])

    const login = async (email: string, password: string) => {
        const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Login failed')
        const { access_token, user } = await res.json()
        localStorage.setItem('rb_token', access_token)
        setState({ user, token: access_token, loading: false })
    }

    const register = async (email: string, password: string, fullName: string, countryCode: string) => {
        const res = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, full_name: fullName, country_code: countryCode }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Registration failed')
        const { access_token, user } = await res.json()
        localStorage.setItem('rb_token', access_token)
        setState({ user, token: access_token, loading: false })
    }

    const logout = () => {
        localStorage.removeItem('rb_token')
        setState({ user: null, token: null, loading: false })
    }

    return <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser }}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
    return ctx
}
