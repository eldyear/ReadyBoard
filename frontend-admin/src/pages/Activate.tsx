import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link2, MonitorPlay, AlertTriangle, CheckCircle2 } from 'lucide-react'
import SelectDropdown from '../components/SelectDropdown'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_BASE_URL || '/api'

export default function Activate() {
    const [code, setCode] = useState(['', '', '', ''])
    const [boards, setBoards] = useState<any[]>([])
    const [selectedBoardId, setSelectedBoardId] = useState<string>('')
    const [status, setStatus] = useState<'idle' | 'linking' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        const token = localStorage.getItem('rb_token')
        if (!token) return

        fetch(`${API}/boards`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setBoards(data)
                    if (data.length > 0) setSelectedBoardId(data[0].id)
                }
            })
            .catch(err => console.error(err))
    }, [])

    const handleInput = (index: number, value: string) => {
        // Only allow alphanumeric uppercase
        const cleanValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
        if (cleanValue.length > 1) {
            // Handle paste
            const chars = cleanValue.split('').slice(0, 4)
            const newCode = [...code]
            chars.forEach((c, i) => newCode[i] = c)
            setCode(newCode)
            // Focus last filled input
            const nextIndex = Math.min(chars.length, 3)
            document.getElementById(`code-${nextIndex}`)?.focus()
            return
        }

        const newCode = [...code]
        newCode[index] = cleanValue
        setCode(newCode)

        // Auto advance
        if (cleanValue && index < 3) {
            document.getElementById(`code-${index + 1}`)?.focus()
        }
    }

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            document.getElementById(`code-${index - 1}`)?.focus()
        }
    }

    const handleLink = async () => {
        const fullCode = code.join('')
        if (fullCode.length !== 4) {
            setErrorMessage('Please enter the full 4-character code.')
            setStatus('error')
            return
        }
        if (!selectedBoardId) {
            setErrorMessage('Please select a target board for this terminal.')
            setStatus('error')
            return
        }

        setStatus('linking')
        const token = localStorage.getItem('rb_token')

        try {
            const res = await fetch(`${API}/pairing/link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    pairing_code: fullCode,
                    board_id: selectedBoardId
                })
            })

            if (res.ok) {
                setStatus('success')
                setTimeout(() => navigate('/boards'), 2000)
            } else {
                const errData = await res.text()
                setErrorMessage(errData || 'Invalid or expired code.')
                setStatus('error')
            }
        } catch (e) {
            setErrorMessage('Network error occurred.')
            setStatus('error')
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
            className="max-w-3xl mx-auto space-y-8"
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 pb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black flex items-center justify-center">
                        <MonitorPlay className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="font-black text-4xl tracking-tighter uppercase">Activate Terminal</h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 mt-1">
                            Link a smart TV display to your ReadyBoard account
                        </p>
                    </div>
                </div>
            </div>

            <motion.div variants={itemVariants} className="bg-white p-8 border border-black/10">
                <div className="mb-10 text-center">
                    <h2 className="text-xl font-black uppercase tracking-tight mb-2">Enter Pairing Code</h2>
                    <p className="text-sm font-mono text-black/60">
                        Open the ReadyBoard Display App on your Smart TV to get a 4-character code.
                    </p>
                </div>

                <div className="flex justify-center gap-3 mb-10">
                    {code.map((digit, i) => (
                        <input
                            key={i}
                            id={`code-${i}`}
                            type="text"
                            maxLength={4} // allow paste
                            value={digit}
                            onChange={(e) => handleInput(i, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(i, e)}
                            className="w-16 h-20 text-center text-4xl font-black uppercase tracking-tighter border-2 border-black/20 focus:border-black focus:ring-0 outline-none transition-colors"
                        />
                    ))}
                </div>

                <div className="max-w-md mx-auto space-y-6">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-black/60 block mb-2">
                            Select Target Board
                        </label>
                        <SelectDropdown
                            value={selectedBoardId}
                            onChange={setSelectedBoardId}
                            options={boards.map(b => ({ label: b.name, value: b.id }))}
                            placeholder="SELECT A BOARD"
                        />
                    </div>

                    {status === 'error' && (
                        <div className="bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-[#ff3b30] p-4 flex items-center gap-3 text-sm font-black uppercase tracking-widest">
                            <AlertTriangle className="w-5 h-5" />
                            {errorMessage}
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="bg-[#34c759]/10 border border-[#34c759]/20 text-[#34c759] p-4 flex items-center gap-3 text-sm font-black uppercase tracking-widest">
                            <CheckCircle2 className="w-5 h-5" />
                            Terminal Linked Successfully
                        </div>
                    )}

                    <button
                        onClick={handleLink}
                        disabled={status === 'linking' || status === 'success'}
                        className={`w-full py-4 flex items-center justify-center gap-2 transition-all ${status === 'linking' ? 'bg-black/50 cursor-not-allowed' :
                            status === 'success' ? 'bg-[#34c759] border-[#34c759]' :
                                'bg-black hover:bg-black/90'
                            } text-white font-black text-sm tracking-[0.2em] uppercase`}
                    >
                        {status === 'linking' ? (
                            <span className="animate-pulse">Linking...</span>
                        ) : status === 'success' ? (
                            <>Linked</>
                        ) : (
                            <>
                                <Link2 className="w-5 h-5" />
                                Link Terminal
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    )
}
