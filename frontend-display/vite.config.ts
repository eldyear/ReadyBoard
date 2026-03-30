import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'gstatic-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        // Cache the index.html and assets using StaleWhileRevalidate 
                        urlPattern: /\/tv\/.*/,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'tv-route-cache',
                            expiration: {
                                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
                            }
                        }
                    }
                ]
            },
            manifest: {
                name: 'ReadyBoard Display',
                short_name: 'Display',
                description: 'ReadyBoard TV Terminal',
                theme_color: '#000000',
                background_color: '#000000',
                display: 'standalone',
                start_url: '/tv/',
                icons: [
                    {
                        src: 'favicon.ico',
                        sizes: '64x64 32x32 24x24 16x16',
                        type: 'image/x-icon'
                    }
                ]
            }
        })
    ],
    base: '/tv/',
    server: {
        port: 3001,
        proxy: {
            '/api': { target: 'http://localhost:8080', changeOrigin: true },
            '/ws': { target: 'ws://localhost:8081', ws: true, changeOrigin: true },
        },
    },
})
