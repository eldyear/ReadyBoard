import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Clock, MonitorPlay, Calendar, Activity } from 'lucide-react'


// Generates mock analytics data
function generateMockData() {
    const hours = Array.from({ length: 12 }, (_, i) => ({
        hour: `${(i + 8) % 24}:00`,
        orders: Math.floor(Math.random() * 40 + 5),
    }))
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => ({
        day: d,
        prepared: Math.floor(Math.random() * 120 + 30),
        ready: Math.floor(Math.random() * 110 + 25),
    }))
    return { hours, days }
}

const { hours, days } = generateMockData()

export default function AnalyticsPage() {
    const [totalOrders] = useState(days.reduce((s, d) => s + d.prepared, 0))
    const [avgReady] = useState(Math.floor(days.reduce((s, d) => s + d.ready, 0) / days.length))

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white border border-black p-4 shadow-2xl">
                    <p className="text-[10px] text-black/60 font-black mb-3 uppercase tracking-[0.2em]">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-3 text-sm font-black uppercase tracking-widest mb-1 last:mb-0">
                            <span className="w-3 h-3 border border-black" style={{ backgroundColor: entry.color }} />
                            <span className="text-black/60">{entry.name}:</span>
                            <span className="text-black" style={{ color: entry.color }}>{entry.value}</span>
                        </div>
                    ))}
                </div>
            )
        }
        return null
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
            className="space-y-8 max-w-6xl mx-auto"
        >
            <div className="flex items-center gap-4 mb-8 border-b border-black/10 pb-6">
                <div className="w-16 h-16 bg-black flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="font-black text-4xl uppercase tracking-tighter">System Analytics</h1>
                    <p className="text-[10px] mt-1 text-black/40 font-black uppercase tracking-[0.2em]">Operational metrics logging</p>
                </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Volume', value: totalOrders, icon: TrendingUp, color: 'text-black', bg: 'bg-[#f9f9f9]', accent: 'bg-[#ff3b30]' },
                    { label: 'Avg Processed', value: avgReady, icon: Activity, color: 'text-black', bg: 'bg-[#f9f9f9]', accent: 'bg-black' },
                    { label: 'Peak Operation', value: '12:00', icon: Clock, color: 'text-[#ff3b30]', bg: 'bg-white', accent: 'bg-[#ff3b30]' },
                    { label: 'Active Terminals', value: 1, icon: MonitorPlay, color: 'text-black', bg: 'bg-white', accent: 'bg-black' },
                ].map((kpi, i) => {
                    const Icon = kpi.icon
                    return (
                        <motion.div variants={itemVariants} key={i} className={`p-6 border border-black relative ${kpi.bg}`}>
                            <div className={`absolute top-0 right-0 left-0 h-1 ${kpi.accent}`} />
                            <div className="flex items-center justify-between mb-8">
                                <Icon className={`w-5 h-5 ${kpi.color}`} />
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 py-1 border border-black/10 bg-white ${kpi.color}`}>STAT</span>
                            </div>
                            <div>
                                <p className={`font-black text-4xl uppercase tracking-tighter ${kpi.color}`}>{kpi.value}</p>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 mt-2">{kpi.label}</p>
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hourly chart */}
                <motion.div variants={itemVariants} className="bg-white border border-black p-8">
                    <div className="flex items-center justify-between mb-8 pb-6 border-b border-black/10">
                        <h2 className="font-black text-2xl uppercase tracking-tighter flex items-center gap-3">
                            <Clock className="w-5 h-5 text-black" /> VELOCITY BY HOUR
                        </h2>
                        <span className="text-[10px] font-black text-white bg-black px-3 py-1 uppercase tracking-[0.2em]">LIVE RECORD</span>
                    </div>

                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={hours} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#000000" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#000000" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid stroke="#000000" strokeOpacity={0.1} strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="hour" stroke="#000000" tick={{ fontSize: 10, fill: '#000000', fontWeight: 900, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                                <YAxis stroke="#000000" tick={{ fontSize: 10, fill: '#000000', fontWeight: 900, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#000000', strokeWidth: 1, strokeDasharray: '3 3' }} />
                                <Area type="step" dataKey="orders" name="ORDERS" stroke="#000000" strokeWidth={2} fillOpacity={1} fill="url(#colorOrders)" activeDot={{ r: 6, fill: '#000000', stroke: '#fff', strokeWidth: 2 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Weekly chart */}
                <motion.div variants={itemVariants} className="bg-white border border-black p-8">
                    <div className="flex items-center justify-between mb-8 pb-6 border-b border-black/10">
                        <h2 className="font-black text-2xl uppercase tracking-tighter flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-black" /> PAST 7 CYCLES
                        </h2>
                        <span className="text-[10px] font-black text-black border border-black/20 bg-[#f9f9f9] px-3 py-1 uppercase tracking-[0.2em]">ARCHIVE LOG</span>
                    </div>

                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid stroke="#000000" strokeOpacity={0.1} strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="day" stroke="#000000" tick={{ fontSize: 10, fill: '#000000', fontWeight: 900, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                                <YAxis stroke="#000000" tick={{ fontSize: 10, fill: '#000000', fontWeight: 900, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                                <Bar dataKey="prepared" name="PENDING" fill="#000000" radius={[0, 0, 0, 0]} barSize={24} />
                                <Bar dataKey="ready" name="EXECUTED" fill="#ff3b30" radius={[0, 0, 0, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    )
}
