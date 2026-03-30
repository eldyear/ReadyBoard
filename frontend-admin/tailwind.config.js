/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                bg: '#ffffff',
                surface: '#ffffff',
                card: '#ffffff',
                border: 'rgba(0,0,0,0.1)',
                preparing: 'rgba(0,0,0,0.4)',
                ready: '#ff3b30',
                accent: '#000000',
                muted: 'rgba(0,0,0,0.4)',
                danger: '#ff3b30'
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                display: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
            },
            borderRadius: {
                card: '0px',
                xl: '0px',
                lg: '0px',
                md: '0px',
                sm: '0px',
                full: '0px'
            },
            boxShadow: {
                glow: 'none',
                ready: 'none',
                glass: 'none',
            },
        },
    },
    plugins: [],
}
