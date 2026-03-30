import { motion, AnimatePresence } from 'framer-motion'
import { Clock, CheckCircle2, ChevronRight, Utensils } from 'lucide-react'

import { LayoutPreset } from './StandardBoard'

interface Order { id: string; order_number?: string; counter_number: string; items: string[]; status: string }
interface MenuItem { name: string; price: string; image?: string }

interface Props {
    preparing: Order[]
    ready: Order[]
    menuItems: MenuItem[]
    backgroundImage: string
    layoutPreset?: LayoutPreset
    hideMenu?: boolean
    menuConfig?: any
}

// Helpers shared with StandardBoard omitted as layout presets are deprecated

// ── Circular image frame ──────────────────────────────────────────
function CircularMenuImage({ item }: { item: MenuItem }) {
    return (
        <div className="crazy-menu-image-frame">
            {item.image ? <img src={item.image} alt={item.name} /> : <div className="image-placeholder"><Utensils size={20} /></div>}
        </div>
    )
}

// ── Crazy Menu panel ──────────────────────────────────────────────
function CrazyMenuPanel({ menuItems }: { menuItems: MenuItem[] }) {
    return (
        <div className="board-column" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem 1.5rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                <ChevronRight className="w-6 h-6 text-black" />
                <h2 className="font-black text-xl uppercase tracking-widest text-black">Menu</h2>
            </div>
            <div className="crazy-menu-list">
                <AnimatePresence>
                    {menuItems.map((item, i) => (
                        <motion.div key={item.name} className="crazy-menu-list-item"
                            initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                            transition={{ delay: i * 0.04, type: 'spring', stiffness: 380, damping: 26 }}>
                            <CircularMenuImage item={item} />
                            <span className="crazy-menu-item__name">{item.name}</span>
                            <span className="crazy-menu-item__price">${item.price}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {menuItems.length === 0 && <p className="text-black/30 text-center mt-8 font-mono">Update menu via Admin Dashboard</p>}
            </div>
        </div>
    )
}

// ── Classic right-side menu panel ─────────────────────────────────
function ClassicMenuPanel({ backgroundImage, menuItems }: { backgroundImage: string; menuItems: MenuItem[] }) {
    return (
        <div className="pro-menu-panel">
            <div className="pro-menu-bg" style={{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none' }} />
            <div className="menu-items-overlay">
                <h2 className="font-black text-2xl uppercase tracking-widest text-black mb-4 flex items-center gap-2">
                    <ChevronRight className="text-[#ff3b30]" /> FEATURED MENU
                </h2>
                <AnimatePresence>
                    {menuItems.map((item, i) => (
                        <motion.div key={item.name} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="menu-item">
                            {item.image && <img src={item.image} alt={item.name} style={{ width: '4rem', height: '4rem', objectFit: 'cover', border: '1px solid black' }} />}
                            <span className="menu-item__name">{item.name}</span>
                            <span className="menu-item__price">${item.price}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {menuItems.length === 0 && <p className="text-black/30 text-center mt-8 font-mono">Update menu via Admin Dashboard</p>}
            </div>
        </div>
    )
}

// ── Order columns ─────────────────────────────────────────────────
function OrderColumns({ preparing, ready, fullWidth }: {
    preparing: Order[]; ready: Order[]; fullWidth?: boolean
}) {
    const readyInitial = { opacity: 0, x: -50, scale: 0.7 }
    const readyAnimate = { opacity: 1, x: 0, scale: 1 }
    const readyExit = { opacity: 0, x: 80, scale: 0.8 }
    const readyTransition = { type: 'spring' as const, stiffness: 500, damping: 25 }

    const colStyle = fullWidth
        ? { display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', gap: '2rem' }
        : { display: 'grid', gridTemplateRows: '1fr 1fr', overflow: 'hidden', gap: '2rem' }

    return (
        <div style={colStyle}>
            {/* Preparing */}
            <div className="board-column board-column--preparing">
                <div className="col-header col-header--preparing">
                    <Clock className="w-8 h-8" />
                    PREPARING
                    <span className="text-black/40 font-mono text-2xl ml-4">({preparing.length})</span>
                </div>
                <div className="order-grid">
                    <AnimatePresence>
                        {preparing.map(o => (
                            <motion.div key={o.id} initial={{ opacity: 0, scale: 0.7, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.5 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                className="order-number order-number--preparing flex-col">
                                <div className="text-4xl font-black">{o.counter_number}</div>
                                {o.items && o.items.length > 0 && (
                                    <>
                                        <div className="w-full border-t-2 border-black/20 my-2" />
                                        <ul className="text-[10px] font-mono leading-tight text-left w-full px-2 max-h-24 overflow-hidden relative">
                                            {o.items.slice(0, 5).map((item, idx) => (
                                                <li key={idx} className="truncate uppercase tracking-wider before:content-['>'] before:mr-1 before:opacity-50 flex items-start">
                                                    <span className="truncate">{item}</span>
                                                </li>
                                            ))}
                                            {o.items.length > 5 && (
                                                <li className="text-[9px] mt-1 opacity-70 italic font-sans">+ {o.items.length - 5} MORE</li>
                                            )}
                                        </ul>
                                    </>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* Ready */}
            <div className="board-column board-column--ready">
                <div className="col-header col-header--ready">
                    <CheckCircle2 className="w-8 h-8" />
                    READY FOR PICKUP
                    <span className="text-[#ff3b30]/60 font-mono text-2xl ml-4">({ready.length})</span>
                </div>
                <div className="order-grid">
                    <AnimatePresence>
                        {ready.map(o => (
                            <motion.div key={o.id} initial={readyInitial} animate={readyAnimate} exit={readyExit}
                                transition={readyTransition} className="order-number order-number--ready flex-col">
                                <div className="text-4xl font-black">{o.counter_number}</div>
                                {o.items && o.items.length > 0 && (
                                    <>
                                        <div className="w-full border-t-2 border-black/20 my-2" />
                                        <ul className="text-[10px] font-mono leading-tight text-left w-full px-2 max-h-24 overflow-hidden relative">
                                            {o.items.slice(0, 5).map((item, idx) => (
                                                <li key={idx} className="truncate uppercase tracking-wider before:content-['>'] before:mr-1 before:opacity-50 flex items-start">
                                                    <span className="truncate">{item}</span>
                                                </li>
                                            ))}
                                            {o.items.length > 5 && (
                                                <li className="text-[9px] mt-1 opacity-70 italic font-sans">+ {o.items.length - 5} MORE</li>
                                            )}
                                        </ul>
                                    </>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}

// ── Main export ───────────────────────────────────────────────────
export default function ProBoard({ preparing, ready, menuItems, backgroundImage, layoutPreset, hideMenu }: Props) {
    const isCrazy = layoutPreset === 'crazy-menu'

    const wrapperClass = [
        'pro-board-main',
        isCrazy ? 'preset-crazy-menu' : '',
    ].filter(Boolean).join(' ')

    // hide_menu: collapse to single full-width order layout
    if (hideMenu) {
        return (
            <div className={wrapperClass} style={{ gridTemplateColumns: '1fr' }}>
                <OrderColumns preparing={preparing} ready={ready} fullWidth />
            </div>
        )
    }

    return (
        <div className={wrapperClass}>
            {isCrazy ? (
                <>
                    <OrderColumns preparing={preparing} ready={ready} />
                    <CrazyMenuPanel menuItems={menuItems} />
                </>
            ) : (
                <>
                    <OrderColumns preparing={preparing} ready={ready} />
                    <ClassicMenuPanel backgroundImage={backgroundImage} menuItems={menuItems} />
                </>
            )}
        </div>
    )
}
