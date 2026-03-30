import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

export interface SelectOption {
    label: string
    value: string
}

export interface SelectDropdownProps {
    value: string
    onChange: (v: string) => void
    options: SelectOption[]
    className?: string
    placeholder?: string
}

export default function SelectDropdown({ value, onChange, options, className = '', placeholder }: SelectDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const selected = options.find(o => o.value === value)
    const containerRef = useRef<HTMLDivElement>(null)

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div ref={containerRef} className={`relative w-full ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between appearance-none bg-[#f9f9f9] border border-black/20 text-black font-black uppercase tracking-widest text-xs p-3 focus:outline-none transition-colors hover:border-black"
            >
                <span className={!selected && placeholder ? 'text-black/40' : ''}>
                    {selected ? selected.label : (placeholder || 'SELECT...')}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.ul
                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                        className="absolute z-50 w-full mt-1 bg-white border border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] max-h-60 overflow-y-auto"
                    >
                        {options.map((opt) => (
                            <li
                                key={opt.value}
                                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                className={`p-3 text-xs font-black uppercase tracking-widest cursor-pointer transition-colors border-b border-black/5 last:border-0 ${value === opt.value ? 'bg-black text-white' : 'text-black hover:bg-[#f9f9f9]'
                                    }`}
                            >
                                {opt.label}
                            </li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    )
}
