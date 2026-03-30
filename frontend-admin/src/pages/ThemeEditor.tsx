import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, Volume2, Type, Layout, MonitorPlay, Save, CheckCircle2, ExternalLink, Layers, Lock, Upload, Library, Maximize2, Minimize2, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_BASE_URL || '/api'

import SelectDropdown from '../components/SelectDropdown'

// ── Layout preset defaults ────────────────────────────────────────
// Each entry lists the fields that should override the current settings
// when the user picks a preset. Keys match the settings object shape.
const LAYOUT_PRESET_DEFAULTS: Record<string, Partial<{
    bgType: string; bgValue: string; textColor: string;
    readyColor: string; preparingColor: string; fontScale: number;
}>> = {
    'bucket-dynamism': {
        readyColor: '#E4002B',
        preparingColor: '#FFC400',
        textColor: '#FFFFFF',
        fontScale: 1.2,
    },
    'crazy-menu': {
        bgType: 'color',
        bgValue: '#0D0D1A',
        textColor: '#FFFFFF',
        readyColor: '#22C55E',
        preparingColor: '#F59E0B',
        fontScale: 1.0,
    },
    'urban-chaos': {
        bgType: 'image',
        bgValue: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=80',
        textColor: '#FFFFFF',
        readyColor: '#FF6B35',
        preparingColor: '#FFD166',
        fontScale: 1.1,
    },
}

export default function ThemeEditor() {
    const [boards, setBoards] = useState<any[]>([])
    const [selectedBoardId, setSelectedBoardId] = useState<string>('')
    const [settings, setSettings] = useState({
        bgType: 'color',
        bgValue: '#0A0A0F',
        textColor: '#FFFFFF',
        readyColor: '#22C55E',
        preparingColor: '#F59E0B',
        fontScale: 1.0,
        chime: true,
        ticker: 'Welcome! | WiFi: CafeGuest | Today Special: Oat Latte 20% off',
        tickerSpeed: 20,
        tickerColor: '#FFFFFF',
        layoutPreset: '' as '' | 'bucket-dynamism' | 'crazy-menu' | 'urban-chaos' | 'custom',
        hideMenu: false,
        mainText: '',
        mainTextColor: '',
        customHtml: '',
    })
    const [saved, setSaved] = useState(false)
    const [selectedPreset, setSelectedPreset] = useState<string>('Classic')
    const [myThemes, setMyThemes] = useState<any[]>([])

    const { user } = useAuth()
    const navigate = useNavigate()
    const isPro = user?.subscription_plan === 'pro' || user?.subscription_plan === 'premium'
    const iframeRef = useRef<HTMLIFrameElement>(null)

    useEffect(() => {
        const token = localStorage.getItem('rb_token')
        // Load boards
        fetch(`${API}/boards`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => {
                const b = Array.isArray(data) ? data : []
                setBoards(b)
                if (b.length > 0) {
                    setSelectedBoardId(b[0].id)
                    loadBoardConfig(b[0])
                }
            })
            .catch(() => { })

        // Load User Themes
        fetch(`${API}/themes`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) setMyThemes(data)
            })
            .catch(() => { })
    }, [])

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (event) => {
            const content = event.target?.result as string
            const token = localStorage.getItem('rb_token')

            try {
                const res = await fetch(`${API}/themes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ name: file.name.replace('.html', ''), content, price: 0 })
                })
                if (res.ok) {
                    const newTheme = await res.json()
                    setMyThemes(prev => [newTheme, ...prev])
                }
            } catch (err) {
                console.error("Upload failed", err)
            }
        }
        reader.readAsText(file)
    }

    const handleDeleteTheme = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (!window.confirm("Delete this custom theme?")) return
        const token = localStorage.getItem('rb_token')
        try {
            const res = await fetch(`${API}/themes/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok || res.status === 204) {
                setMyThemes(prev => prev.filter(t => t.id !== id))
            }
        } catch (err) { }
    }

    const applyLibraryTheme = (theme: any) => {
        setSettings(s => ({
            ...s,
            layoutPreset: 'custom',
            customHtml: theme.content
        }))
        setSelectedPreset('Custom')
        setSaved(false)
    }

    const loadBoardConfig = (board: any) => {
        const mc = board.menu_config || {}
        setSettings({
            bgType: mc.bg_type || 'color',
            bgValue: mc.bg_value || '#0A0A0F',
            textColor: mc.text_color || '#FFFFFF',
            readyColor: mc.ready_color || '#22C55E',
            preparingColor: mc.preparing_color || '#F59E0B',
            fontScale: mc.font_size_scale || 1.0,
            chime: mc.chime_enabled ?? true,
            ticker: mc.ticker_text || 'Welcome!',
            tickerSpeed: mc.ticker_speed || 20,
            tickerColor: mc.ticker_color || '#FFFFFF',
            layoutPreset: mc.layout_preset || '',
            hideMenu: mc.hide_menu ?? false,
            mainText: mc.main_text || '',
            mainTextColor: mc.main_text_color || '',
            customHtml: mc.custom_html || '',
        })
    }

    const handleBoardChange = (e: any) => {
        const id = e.target.value
        setSelectedBoardId(id)
        const b = boards.find(x => x.id === id)
        if (b) loadBoardConfig(b)
    }

    const presets = [
        { name: 'Classic', bgType: 'color', bgValue: '#0A0A0F', textColor: '#FFFFFF', readyColor: '#22C55E', preparingColor: '#F59E0B', fontScale: 1.0 },
        { name: 'KFC Style', bgType: 'color', bgValue: '#E5002B', textColor: '#FFFFFF', readyColor: '#FFFFFF', preparingColor: '#FFC400', fontScale: 1.2 },
        { name: 'Custom', bgType: settings.bgType, bgValue: settings.bgValue, textColor: settings.textColor, readyColor: settings.readyColor, preparingColor: settings.preparingColor, fontScale: settings.fontScale },
    ]

    const handlePresetChange = (presetName: string) => {
        setSelectedPreset(presetName)
        const p = presets.find(x => x.name === presetName)
        if (p && presetName !== 'Custom') {
            setSettings(s => ({ ...s, bgType: p.bgType, bgValue: p.bgValue, textColor: p.textColor, readyColor: p.readyColor, preparingColor: p.preparingColor, fontScale: p.fontScale }))
            setSaved(false)
        }
    }

    const set = (k: string, v: unknown) => {
        setSettings(s => ({ ...s, [k]: v }))
        setSaved(false)
    }

    /** Selecting a layout preset merges its default color/font values into
     *  local state so the live preview and Save both reflect the full config. */
    const handleLayoutPresetChange = (value: string) => {
        const defaults = LAYOUT_PRESET_DEFAULTS[value] ?? {}
        setSettings(s => ({
            ...s,
            ...defaults,
            layoutPreset: value as typeof s.layoutPreset,
        }))
        setSaved(false)
    }

    const handleSave = async () => {
        if (!selectedBoardId) return
        const token = localStorage.getItem('rb_token')

        const payload = {
            menu_config: {
                bg_type: settings.bgType,
                bg_value: settings.bgValue,
                text_color: settings.textColor,
                ready_color: settings.readyColor,
                preparing_color: settings.preparingColor,
                font_size_scale: settings.fontScale,
                ticker_text: settings.ticker,
                ticker_speed: settings.tickerSpeed,
                ticker_color: settings.tickerColor,
                chime_enabled: settings.chime,
                layout_preset: settings.layoutPreset || null,
                hide_menu: settings.hideMenu,
                main_text: settings.mainText || null,
                main_text_color: settings.mainTextColor || null,
                custom_html: settings.customHtml || null,
            }
        }

        try {
            const res = await fetch(`${API}/boards/${selectedBoardId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            })
            if (res.ok) {
                setSaved(true)
                setTimeout(() => setSaved(false), 2000)
            }
        } catch (e) {
            console.error('Failed to save theme', e)
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
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="max-w-6xl mx-auto space-y-8"
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 pb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black flex items-center justify-center">
                        <Palette className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="font-black text-4xl tracking-tighter uppercase">Theme Editor</h1>
                            {boards.length > 0 && (
                                <SelectDropdown
                                    value={selectedBoardId}
                                    onChange={(v) => handleBoardChange({ target: { value: v } })}
                                    options={boards.map(b => ({ label: b.name, value: b.id }))}
                                />
                            )}
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 mt-1">Configure layout, colors, and typography</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {selectedBoardId && (
                        <a
                            href={`/tv/?id=${selectedBoardId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white hover:bg-black text-black hover:text-white border border-black px-4 py-2.5 flex items-center gap-2 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            <span className="text-[10px] font-black tracking-widest uppercase">Live View</span>
                        </a>
                    )}
                    <button
                        onClick={handleSave}
                        className={`px-6 py-2.5 flex items-center gap-2 border transition-colors ${saved ? 'bg-black text-white border-black' : 'bg-[#ff3b30] text-white border-[#ff3b30] hover:bg-black hover:border-black'}`}
                    >
                        {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        <span className="text-[10px] font-black tracking-widest uppercase">{saved ? 'Saved' : 'Save Theme'}</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Controls */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Color Theme Presets */}
                    <motion.div variants={itemVariants} className="bg-white p-6 border border-black/10">
                        <h2 className="font-black text-lg uppercase tracking-tight flex items-center gap-2 mb-6">
                            <Layout className="w-5 h-5 text-black" /> Base Theme
                        </h2>
                        <SelectDropdown
                            value={selectedPreset}
                            onChange={handlePresetChange}
                            options={presets.map(p => ({ label: p.name, value: p.name }))}
                        />
                    </motion.div>

                    {/* Layout Preset */}
                    <motion.div variants={itemVariants} className="bg-white p-6 border border-black/10">
                        <h2 className="font-black text-lg uppercase tracking-tight flex items-center gap-2 mb-2">
                            <Layers className="w-5 h-5 text-black" /> Layout Config
                        </h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-5">Controls structural boundaries</p>

                        <SelectDropdown
                            value={settings.layoutPreset}
                            onChange={handleLayoutPresetChange}
                            options={[
                                { label: 'Default Clean Layout', value: '' },
                                { label: 'CUSTOM HTML (My Themes / Dev)', value: 'custom' },
                            ]}
                        />

                        {settings.layoutPreset === 'custom' && (
                            <div className="relative mt-4 border border-black p-4">
                                {/* Pro gate overlay */}
                                {!isPro && (
                                    <div className="absolute inset-0 z-10 bg-white/95 flex flex-col items-center justify-center gap-4 p-6 text-center border-2 border-indigo-500 shadow-[8px_8px_0_0_rgba(99,102,241,1)]">
                                        <div className="w-12 h-12 bg-indigo-500 flex items-center justify-center">
                                            <Lock className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-black text-xl uppercase tracking-tighter text-indigo-900">Pro Access Required</p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-900/50 mt-2">SDK injection & Theme Library disabled</p>
                                        </div>
                                        <button
                                            onClick={() => navigate('/billing')}
                                            className="bg-indigo-900 text-white hover:bg-indigo-500 uppercase text-[10px] font-black tracking-widest px-6 py-3 transition-colors"
                                        >
                                            Upgrade License
                                        </button>
                                    </div>
                                )}

                                <div className="mb-4 flex items-center justify-between border-b border-black/10 pb-4">
                                    <div className="flex items-center gap-2 text-indigo-900">
                                        <Library className="w-5 h-5" />
                                        <span className="font-black uppercase tracking-widest text-xs">My Themes Library</span>
                                    </div>
                                    <label className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 cursor-pointer flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors">
                                        <Upload className="w-4 h-4" /> Upload .html
                                        <input type="file" accept=".html" className="hidden" onChange={handleFileUpload} />
                                    </label>
                                </div>
                                {myThemes.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 mb-4">
                                        {myThemes.map(t => (
                                            <div key={t.id} className="relative group/theme flex">
                                                <button
                                                    onClick={() => applyLibraryTheme(t)}
                                                    className="flex-1 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-400 p-3 flex flex-col items-start transition-colors overflow-hidden"
                                                    title={t.name}
                                                >
                                                    <span className="font-black text-xs text-indigo-900 truncate uppercase tracking-widest w-full text-left">{t.name}</span>
                                                    <span className="text-[8px] font-mono text-indigo-500 uppercase">{t.is_system ? 'System Default' : 'Library Sync'}</span>
                                                </button>
                                                {!t.is_system && (
                                                    <button
                                                        onClick={(e) => handleDeleteTheme(e, t.id)}
                                                        className="absolute top-2 right-2 p-1.5 bg-white border border-indigo-200 text-indigo-400 hover:text-red-500 hover:border-red-500 opacity-0 group-hover/theme:opacity-100 transition-all shadow-sm"
                                                        title="Delete Theme"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <CustomHtmlEditor
                                    customHtml={settings.customHtml}
                                    onChange={val => set('customHtml', val)}
                                />
                            </div>
                        )}

                        {/* ── Hide menu panel toggle ── */}
                        <div className="flex items-center justify-between p-4 mt-6 bg-[#f9f9f9] border border-black/10">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-black">Hide Image Menu</p>
                                <p className="text-[10px] font-mono text-black/50 mt-1">Forces Full-Width Orders</p>
                            </div>
                            <button
                                onClick={() => set('hideMenu', !settings.hideMenu)}
                                style={{ height: '14px', width: '38px', minHeight: '14px' }}
                                className={`
                                    relative shrink-0 cursor-pointer border transition-colors duration-500 p-[2px] flex items-center
                                    ${settings.hideMenu ? 'bg-[#ff3b30] border-[#ff3b30]' : 'bg-white border-black/20'}
                                `}
                            >
                                <motion.div
                                    style={{
                                        width: '10px',
                                        height: '10px',
                                        backgroundColor: settings.hideMenu ? '#fff' : 'rgba(0,0,0,0.2)'
                                    }}
                                    className={`
                                        shadow-sm transition-all duration-300 ease-[cubic-bezier(0.65,0,0.35,1)]
                                        ${settings.hideMenu ? 'translate-x-[20px]' : 'translate-x-0'}
                                    `}
                                />
                            </button>
                        </div>

                        {/* ── Brand label (main_text) ── */}
                        <div className="p-4 mt-4 bg-[#f9f9f9] border border-black/10 space-y-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-black">Bottom Brand Tag</p>
                                <p className="text-[10px] font-mono text-black/50 mt-1">Static ticker label</p>
                            </div>
                            <input
                                type="text"
                                value={settings.mainText}
                                onChange={e => set('mainText', e.target.value)}
                                placeholder="e.g. READYBOARD / CAFE"
                                className="bg-white w-full border border-black/20 text-black text-sm p-2 focus:border-black focus:ring-0 outline-none uppercase font-mono"
                            />
                            <div className="flex items-center gap-3">
                                <label className="text-[10px] font-black text-black/60 uppercase tracking-widest">Tag Color (HEX)</label>
                                <input
                                    type="text"
                                    value={settings.mainTextColor || '#FF3B30'}
                                    onChange={e => set('mainTextColor', e.target.value)}
                                    className="bg-white w-24 border border-black/20 p-1 text-xs font-mono uppercase focus:border-black focus:ring-0"
                                />
                                <input
                                    type="color"
                                    value={settings.mainTextColor || '#FF3B30'}
                                    onChange={e => set('mainTextColor', e.target.value)}
                                    className="w-6 h-6 border-0 p-0 rounded-none cursor-pointer"
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Colors */}
                    {selectedPreset === 'Custom' && (
                        <motion.div variants={itemVariants} className="bg-white p-6 border border-black/10">
                            <h2 className="font-black text-lg uppercase tracking-tight flex items-center gap-2 mb-6">
                                <Palette className="w-5 h-5 text-black" /> Paint Parameters
                            </h2>

                            <div className="space-y-4">
                                {/* Background Type & Value */}
                                <div className="p-4 bg-[var(--bg-test)] border border-black/10" style={{ '--bg-test': settings.bgType === 'color' ? settings.bgValue : '#f9f9f9' } as React.CSSProperties}>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[#777] mix-blend-difference block mb-2">Backdrop Layer</label>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <SelectDropdown
                                            value={settings.bgType}
                                            onChange={v => set('bgType', v)}
                                            options={[
                                                { label: 'Hex Code', value: 'color' },
                                                { label: 'CSS Gradient', value: 'gradient' },
                                                { label: 'Image URL', value: 'image' },
                                            ]}
                                        />
                                        <div className="relative flex-1">
                                            <input
                                                type="text"
                                                value={settings.bgValue}
                                                onChange={e => set('bgValue', e.target.value)}
                                                className="bg-white border border-black/20 text-xs font-mono text-black p-2 w-full focus:border-black focus:ring-0"
                                                placeholder={settings.bgType === 'color' ? '#FFFFFF' : (settings.bgType === 'image' ? 'https://...' : 'linear-gradient(...)')}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Text Color */}
                                <div className="flex items-center gap-4 p-4 border border-black/10 relative">
                                    <div className="w-10 h-10 border border-black/20 flex shrink-0" style={{ backgroundColor: settings.textColor }} />
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-black block mb-1">Base Ink</label>
                                        <input
                                            type="text"
                                            value={settings.textColor}
                                            onChange={e => set('textColor', e.target.value)}
                                            className="bg-transparent border-none text-xs font-mono text-black focus:ring-0 p-0 w-full uppercase"
                                        />
                                    </div>
                                    <input type="color" value={settings.textColor} onChange={e => set('textColor', e.target.value)} className="w-10 h-10 border-0 p-0 cursor-pointer absolute right-4 opacity-0" />
                                </div>

                                {/* Preparing */}
                                <div className="flex items-center gap-4 p-4 border border-black/10 relative">
                                    <div className="w-10 h-10 border border-black/20 flex shrink-0" style={{ backgroundColor: settings.preparingColor }} />
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-black block mb-1">Preparing Ink</label>
                                        <input
                                            type="text"
                                            value={settings.preparingColor}
                                            onChange={e => set('preparingColor', e.target.value)}
                                            className="bg-transparent border-none text-xs font-mono text-black focus:ring-0 p-0 w-full uppercase"
                                        />
                                    </div>
                                    <input type="color" value={settings.preparingColor} onChange={e => set('preparingColor', e.target.value)} className="w-10 h-10 border-0 p-0 cursor-pointer absolute right-4 opacity-0" />
                                </div>

                                {/* Ready */}
                                <div className="flex items-center gap-4 p-4 border border-black/10 relative">
                                    <div className="w-10 h-10 border border-black/20 flex shrink-0" style={{ backgroundColor: settings.readyColor }} />
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-black block mb-1">Ready Actions (Accent)</label>
                                        <input
                                            type="text"
                                            value={settings.readyColor}
                                            onChange={e => set('readyColor', e.target.value)}
                                            className="bg-transparent border-none text-xs font-mono text-black focus:ring-0 p-0 w-full uppercase"
                                        />
                                    </div>
                                    <input type="color" value={settings.readyColor} onChange={e => set('readyColor', e.target.value)} className="w-10 h-10 border-0 p-0 cursor-pointer absolute right-4 opacity-0" />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Typography & Sound */}
                    <motion.div variants={itemVariants} className="bg-white p-6 border border-black/10">
                        <h2 className="font-black text-lg uppercase tracking-tight flex items-center gap-2 mb-6">
                            <Type className="w-5 h-5 text-black" /> Type & Alerts
                        </h2>

                        <div className="space-y-8">
                            {/* Master Ratio Slider */}
                            <div>
                                <div className="flex justify-between items-end mb-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-black/40">Master Ratio</label>
                                    <span className="text-black font-black font-mono text-xs px-2 py-0.5 border border-black/20 bg-[#f9f9f9]">
                                        {settings.fontScale.toFixed(1)}x
                                    </span>
                                </div>
                                <input type="range" min="0.7" max="2.0" step="0.1"
                                    value={settings.fontScale}
                                    onChange={e => set('fontScale', parseFloat(e.target.value))}
                                    className="w-full h-1 bg-black/10 rounded-none appearance-none cursor-pointer accent-black"
                                />
                            </div>

                            {/* Acoustic Signal Toggle — ОЧИЩЕННЫЙ ВАРИАНТ */}
                            {/* Очищенный вариант без двойных рамок */}
                            <div className="flex items-center justify-between p-4 bg-[#f9f9f9] border border-black/10">
                                <div className="flex items-center gap-3">
                                    <Volume2 className={`w-5 h-5 ${settings.chime ? 'text-[#ff3b30]' : 'text-black/30'}`} />
                                    <div>
                                        <div className="text-[10px] font-black tracking-widest uppercase text-black">Acoustic Signal</div>
                                        <div className="text-[10px] font-mono text-black/50 tracking-tight italic">On-ready chime</div>
                                    </div>
                                </div>

                                {/* Кнопка теперь будет тонкой полоской */}
                                <button
                                    onClick={() => set('chime', !settings.chime)}
                                    style={{ height: '14px', width: '38px', minHeight: '14px' }}
                                    className={`
                                        relative shrink-0 cursor-pointer border transition-colors duration-500 p-[2px] flex items-center
                                        ${settings.chime ? 'bg-[#ff3b30] border-[#ff3b30]' : 'bg-white border-black/20'}
                                    `}
                                >
                                    <motion.div
                                        // Используем motion для супер-плавности, если есть framer-motion, 
                                        // или просто обычный div с нашими стилями:
                                        style={{
                                            width: '10px',
                                            height: '10px',
                                            backgroundColor: settings.chime ? '#fff' : 'rgba(0,0,0,0.2)'
                                        }}
                                        className={`
                                            shadow-sm transition-all duration-300 ease-[cubic-bezier(0.65,0,0.35,1)]
                                            ${settings.chime ? 'translate-x-[20px]' : 'translate-x-0'}
                                        `}
                                    />
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Ticker */}
                    <motion.div variants={itemVariants} className="bg-white p-6 border border-black/10">
                        <h2 className="font-black text-lg uppercase tracking-tight flex items-center gap-2 mb-4">
                            <Layout className="w-5 h-5 text-black" /> Bottom Ticker
                        </h2>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-black/40 block mb-2">Scrolling Marquee Text</label>
                                <textarea
                                    className="w-full resize-none h-20 text-xs font-mono bg-white text-black border border-black/20 focus:border-black focus:ring-0 p-3"
                                    value={settings.ticker}
                                    onChange={e => set('ticker', e.target.value)}
                                    placeholder="Enter message..."
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-black/40">Durations (s)</label>
                                    <span className="text-black font-black font-mono text-xs px-2 py-0.5 border border-black/20 bg-[#f9f9f9]">
                                        {settings.tickerSpeed}s
                                    </span>
                                </div>
                                <input type="range" min="10" max="60" step="5"
                                    value={settings.tickerSpeed}
                                    onChange={e => set('tickerSpeed', parseInt(e.target.value))}
                                    className="w-full h-1 bg-black/10 rounded-none appearance-none cursor-pointer accent-black"
                                    style={{ direction: 'rtl' }}
                                />
                                <div className="flex justify-between mt-2 text-[10px] font-black tracking-widest text-black/30 uppercase">
                                    <span>Sprint</span>
                                    <span>Crawl</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 border border-black/10 relative">
                                <div className="w-10 h-10 border border-black/20 flex shrink-0" style={{ backgroundColor: settings.tickerColor }} />
                                <div className="flex-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-black block mb-1">Text Ink</label>
                                    <input
                                        type="text"
                                        value={settings.tickerColor}
                                        onChange={e => set('tickerColor', e.target.value)}
                                        className="bg-transparent border-none text-xs font-mono text-black focus:ring-0 p-0 w-full uppercase"
                                    />
                                </div>
                                <input type="color" value={settings.tickerColor} onChange={e => set('tickerColor', e.target.value)} className="w-10 h-10 border-0 p-0 cursor-pointer absolute right-4 opacity-0" />
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Right Column: Live Mini-Render Preview */}
                <div className="lg:col-span-8">
                    <motion.div variants={itemVariants} className="bg-white border border-black/10 p-2 pb-6 h-[800px] flex flex-col items-center sticky top-8">
                        <div className="w-full p-4 flex items-center justify-between border-b border-black/5 mb-6">
                            <div className="flex items-center gap-2 text-black/50 text-[10px] font-black uppercase tracking-widest text-indigo-500">
                                <MonitorPlay className="w-4 h-4" /> Live Board Render (Mini-Preview)
                            </div>
                        </div>

                        {/* TV Screen Bezels - Absolute IFrame Container */}
                        <div className="relative w-full max-w-full mx-auto mt-4 bg-black p-[2px] flex-1 overflow-hidden">
                            {selectedBoardId ? (
                                <div className="w-full h-full relative overflow-hidden bg-white group">
                                    <div className="absolute inset-0 bg-transparent z-50 pointer-events-none border-4 border-transparent group-hover:border-indigo-500/30 transition-colors" />
                                    {/* Scale down the iframe to fit the container perfectly without scrollbars */}
                                    <div className="absolute top-0 left-0 w-[1920px] h-[1080px]" style={{ transform: 'scale(0.42)', transformOrigin: 'top left' }}>
                                        <iframe
                                            ref={iframeRef}
                                            src={`/tv/?id=${selectedBoardId}&preview=true`}
                                            className="w-full h-full border-none"
                                            title="Live Preview"
                                            // Force reload by appending a mock cache-buster when layout Preset changes so iframe updates
                                            key={`${selectedBoardId}-${settings.layoutPreset}-${saved}`}
                                        />
                                    </div>
                                    <div className="absolute top-4 right-4 bg-black/80 px-3 py-1 text-white text-[10px] font-mono tracking-widest z-40 backdrop-blur-sm pointer-events-none">
                                        1920x1080 RENDER
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/50 font-mono text-xs">Waiting for board selection...</div>
                            )}
                        </div>

                        <div className="w-[40%] h-px bg-black mt-2 opacity-20" />
                    </motion.div>
                </div>
            </div>
        </motion.div>
    )
}

function CustomHtmlEditor({ customHtml, onChange }: { customHtml: string; onChange: (val: string) => void }) {
    const [tab, setTab] = useState<'editor' | 'docs'>('editor')
    const [isMaximized, setIsMaximized] = useState(false)

    // Блокируем скролл основной страницы, когда редактор развернут
    useEffect(() => {
        if (isMaximized) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => { document.body.style.overflow = 'unset' }
    }, [isMaximized])

    return (
        <div className={`
            mt-6 bg-[#f9f9f9] border border-black flex flex-col transition-all duration-300
            ${isMaximized
                ? 'fixed inset-0 z-[9999] bg-white'
                : 'relative h-auto border-black/10 shadow-sm'}
        `}>
            {/* Tabs Header */}
            <div className="flex border-b border-black shrink-0 bg-white">
                <button
                    onClick={() => setTab('editor')}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${tab === 'editor' ? 'text-black bg-white' : 'text-black/40 hover:text-black bg-[#f9f9f9]'
                        }`}
                >
                    RAW SOURCE EDITOR
                </button>
                <button
                    onClick={() => setTab('docs')}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors border-l border-black ${tab === 'docs' ? 'text-black bg-white' : 'text-black/40 hover:text-black bg-[#f9f9f9]'
                        }`}
                >
                    VAR & SDK REFERENCE
                </button>

                {/* Кнопка Увеличить / Уменьшить */}
                <button
                    onClick={() => setIsMaximized(!isMaximized)}
                    className="px-6 py-3 border-l border-black hover:bg-black hover:text-white transition-all flex items-center justify-center"
                    title={isMaximized ? "Exit Fullscreen" : "Fullscreen Mode"}
                >
                    {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
            </div>

            {/* Tab Content Container */}
            <div className={`p-0 bg-white flex-1 flex flex-col ${isMaximized ? 'overflow-hidden' : 'min-h-[400px]'}`}>
                {tab === 'editor' ? (
                    <div className="flex-1 flex flex-col">
                        <textarea
                            value={customHtml}
                            onChange={e => onChange(e.target.value)}
                            className={`w-full bg-black text-[#00ff00] font-mono text-xs p-6 border-none focus:ring-0 outline-none resize-none flex-1 ${isMaximized ? '' : 'h-[400px]'
                                }`}
                            placeholder="<!DOCTYPE html>..."
                        />
                    </div>
                ) : (
                    <div className={`
                        p-8 space-y-8 font-mono text-gray-300 custom-scrollbar bg-[#0a0a0a] flex-1 overflow-y-auto
                        ${isMaximized ? 'h-full' : 'max-h-[500px] h-[400px]'}
                    `}>
                        {/* Header Section */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-violet-500/10 rounded-lg">
                                    <MonitorPlay className="w-6 h-6 text-violet-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-white tracking-tight">
                                    ReadyBoard JS SDK <span className="text-violet-500 text-sm font-normal">v1.0</span>
                                </h3>
                            </div>
                            <p className="text-gray-500 text-sm leading-relaxed max-w-2xl font-sans">
                                Welcome to the ReadyBoard Theme Engine. This SDK provides a bridge between your custom HTML and our real-time WebSocket data stream.
                            </p>
                        </div>

                        <hr className="border-white/5" />

                        {/* 1. SDK Overview */}
                        <section className="space-y-3">
                            <h4 className="text-sm uppercase tracking-widest text-violet-400 font-bold">01. SDK Overview</h4>
                            <p className="text-sm text-gray-400">
                                The system automatically injects the <code className="bg-white/10 text-white px-1.5 py-0.5 rounded text-xs font-bold font-mono">window.ReadyBoard</code> object.
                            </p>
                            <div className="bg-blue-500/5 border-l-2 border-blue-500/40 p-4 text-blue-200/80 text-xs italic font-sans">
                                <strong>Pro Tip:</strong> No external script tags are required. The bridge is established before your code executes.
                            </div>
                        </section>

                        {/* 2. API Reference */}
                        <section className="space-y-4">
                            <h4 className="text-sm uppercase tracking-widest text-violet-400 font-bold">02. API Reference</h4>
                            <div className="space-y-2 font-sans">
                                <h5 className="text-white font-bold">ReadyBoard.onUpdate(callback)</h5>
                                <p className="text-sm text-gray-500">
                                    Primary listener for live data. Triggers on every WebSocket event (Create / Ready / Archive).
                                </p>
                            </div>

                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/20 to-transparent rounded-lg blur opacity-75"></div>
                                <div className="relative bg-black p-5 rounded-lg border border-white/10 font-mono text-[11px] leading-relaxed">
                                    <span className="text-violet-400">window</span>.ReadyBoard.<span className="text-emerald-400">onUpdate</span>((<span className="text-orange-300">orders</span>) <span className="text-violet-400">=&gt;</span> {"{"}
                                    <div className="pl-4">
                                        <span className="text-gray-500">// Triggered instantly on board updates</span><br />
                                        <span className="text-violet-400">console</span>.<span className="text-emerald-400">log</span>(<span className="text-gray-400">"Data:"</span>, orders);
                                    </div>
                                    {"}"});
                                </div>
                            </div>
                        </section>

                        {/* 3. Data Structures */}
                        <section className="space-y-4">
                            <h4 className="text-sm uppercase tracking-widest text-violet-400 font-bold">03. Data Structures</h4>
                            <div className="border border-white/10 rounded-lg overflow-hidden bg-white/[0.02]">
                                <table className="w-full text-left text-[11px] border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/10 bg-white/5 font-sans">
                                            <th className="p-3 text-white font-bold uppercase tracking-tighter">Property</th>
                                            <th className="p-3 text-white font-bold uppercase tracking-tighter">Type</th>
                                            <th className="p-3 text-white font-bold uppercase tracking-tighter">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-gray-400">
                                        <tr>
                                            <td className="p-3 font-bold text-violet-300">order_number</td>
                                            <td className="p-3 text-emerald-500">string</td>
                                            <td className="p-3">Display label (e.g. "A-101")</td>
                                        </tr>
                                        <tr>
                                            <td className="p-3 font-bold text-violet-300">status</td>
                                            <td className="p-3 text-emerald-500">string</td>
                                            <td className="p-3">"preparing" | "ready"</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* 4. CSS Variables */}
                        <section className="space-y-3">
                            <h4 className="text-sm uppercase tracking-widest text-violet-400 font-bold">04. CSS Variables</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {[
                                    { var: '--clr-ready', desc: 'Ready status color' },
                                    { var: '--clr-preparing', desc: 'Preparing status color' },
                                    { var: '--clr-bg', desc: 'Board background' },
                                    { var: '--clr-text', desc: 'Primary text color' }
                                ].map(item => (
                                    <div key={item.var} className="bg-black border border-white/5 p-2 flex items-center justify-between rounded">
                                        <code className="text-emerald-400 text-[10px]">{item.var}</code>
                                        <span className="text-[10px] text-gray-600 uppercase italic font-sans">{item.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 5. Boilerplate */}
                        <section className="space-y-4 pb-10">
                            <h4 className="text-sm uppercase tracking-widest text-violet-400 font-bold">05. Minimal Boilerplate</h4>
                            <pre className="bg-black p-5 rounded-lg border border-white/10 font-mono text-[10px] text-gray-400 overflow-x-auto leading-normal">
                                {`<!DOCTYPE html>
<html>
<head>
    <style>
    body { background: var(--clr-bg); color: var(--clr-text); }
    .order.ready { color: var(--clr-ready); animation: flash 1s; }
    </style>
</head>
<body>
    <div id="board"></div>
    <script>
    window.ReadyBoard.onUpdate((data) => {
        document.getElementById('board').innerHTML = data
        .map(o => \`<div class="order \${o.status}">\${o.order_number}</div>\`)
        .join('');
    });
    </script>
</body>
</html>`}
                            </pre>
                        </section>
                    </div>
                )}
            </div>
        </div>
    )
}
