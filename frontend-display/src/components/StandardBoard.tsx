import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, CheckCircle2 } from 'lucide-react'
import CustomThemeEngine from './CustomThemeEngine'

interface Order { id: string; order_number?: string; counter_number: string; items: string[]; status: string }

export type LayoutPreset = 'bucket-dynamism' | 'crazy-menu' | 'urban-chaos' | 'custom' | undefined

interface Props {
    preparing: Order[]
    ready: Order[]
    layoutPreset?: LayoutPreset
    menuConfig?: any
}

// BUCKET_CARD_STYLE removed format strictly relies on display.css

export default function StandardBoard({ preparing, ready, layoutPreset, menuConfig }: Props) {
    const allOrders = useMemo(() => [...preparing, ...ready], [preparing, ready])

    // Delegate entirely to CustomThemeEngine for these specific pure-CSS isolated themes
    if (layoutPreset === 'urban-chaos' || layoutPreset === 'custom') {
        return <CustomThemeEngine orders={allOrders} layoutPreset={layoutPreset} menuConfig={menuConfig} />
    }

    // Default "Clean Canvas" standard render
    const wrapperClass = 'board-main'

    return (
        <div className={wrapperClass}>
            {/* PREPARING column */}
            <div className="board-column board-column--preparing">
                <div className="col-header col-header--preparing">
                    <Clock className="w-8 h-8" />
                    PREPARING
                    <span className="text-black/40 font-mono text-2xl ml-4">({preparing.length})</span>
                </div>
                <div className="order-grid">
                    <AnimatePresence>
                        {preparing.map(o => (
                            <motion.div
                                key={o.id}
                                initial={{ opacity: 0, scale: 0.7, y: 12 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                className="order-number order-number--preparing flex-col"
                            >
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
                    {preparing.length === 0 && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="w-full text-center mt-12 text-gray-500 font-bold uppercase tracking-widest">
                            All clear
                        </motion.p>
                    )}
                </div>
            </div>

            {/* READY column */}
            <div className="board-column board-column--ready">
                <div className="col-header col-header--ready">
                    <CheckCircle2 className="w-8 h-8" />
                    READY FOR PICKUP
                    <span className="text-[#ff3b30]/60 font-mono text-2xl ml-4">({ready.length})</span>
                </div>
                <div className="order-grid">
                    <AnimatePresence>
                        {ready.map(o => (
                            <motion.div
                                key={o.id}
                                initial={{ opacity: 0, x: -50, scale: 0.7 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 80, scale: 0.8 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                className="order-number order-number--ready flex-col"
                            >
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
                    {ready.length === 0 && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="w-full text-center mt-12 text-gray-500 font-bold uppercase tracking-widest">
                            Nothing ready yet
                        </motion.p>
                    )}
                </div>
            </div >
        </div >
    )
}
