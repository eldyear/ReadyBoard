import { Zap } from 'lucide-react'

interface Props {
    text?: string
    speed?: number
    color?: string
    mainText?: string
    mainTextColor?: string
}

export default function TickerFooter({ text, speed = 20, color = '#FFFFFF', mainText, mainTextColor }: Props) {
    if (!text && !mainText) return null
    const content = text ? `${text}   •   ${text}` : ''
    return (
        <div className="ticker-footer">
            {/* Branded label on the left — driven by menu_config.main_text */}
            {mainText && (
                <div style={{
                    flexShrink: 0,
                    paddingLeft: '1.2rem',
                    paddingRight: '1.2rem',
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    letterSpacing: '0.08em',
                    color: mainTextColor || '#FFFFFF',
                    whiteSpace: 'nowrap',
                    borderRight: '1px solid rgba(255,255,255,0.1)',
                }}>
                    {mainText}
                </div>
            )}
            {content && (
                <span
                    className="ticker-text flex items-center gap-4"
                    style={{ animationDuration: `${speed}s`, color: color }}
                >
                    <Zap className="inline-block" style={{ color: color, width: '1.2rem', height: '1.2rem' }} />
                    {content}
                </span>
            )}
        </div>
    )
}
