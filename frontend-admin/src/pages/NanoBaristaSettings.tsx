import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Smartphone, Loader2, Save, X, RefreshCw, LayoutGrid, Package } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

interface Category {
    id: string
    name: string
}

interface Product {
    id: string
    name: string
    price: number
    category_id: string
    description?: string
}

export default function NanoBaristaSettings() {
    const [categories, setCategories] = useState<Category[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [pairingCode, setPairingCode] = useState<string | null>(null)
    const [pairingExpiry, setPairingExpiry] = useState<string | null>(null)
    const [timeLeft, setTimeLeft] = useState<string | null>(null)

    // UI State
    const [activeTab, setActiveTab] = useState<'menu' | 'pairing'>('menu')
    const [isAddingCat, setIsAddingCat] = useState(false)
    const [newCatName, setNewCatName] = useState('')
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [isAddingProduct, setIsAddingProduct] = useState(false)
    const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, category_id: '' })

    const { token } = useAuth()
    const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

    useEffect(() => {
        fetchData()
        fetchPairingStatus()
    }, [])

    useEffect(() => {
        if (!pairingExpiry) return

        const timer = setInterval(() => {
            const expiry = new Date(pairingExpiry).getTime()
            const now = new Date().getTime()
            const diff = expiry - now

            if (diff <= 0) {
                setTimeLeft('00:00')
                setPairingCode(null)
                clearInterval(timer)
            } else {
                const minutes = Math.floor(diff / 60000)
                const seconds = Math.floor((diff % 60000) / 1000)
                setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
            }
        }, 1000)

        return () => clearInterval(timer)
    }, [pairingExpiry])

    const fetchData = async () => {
        try {
            const [catRes, prodRes] = await Promise.all([
                fetch(`${API_BASE}/api/barista/categories`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE}/api/barista/products`, { headers: { 'Authorization': `Bearer ${token}` } })
            ])
            const cats = await catRes.json()
            const prods = await prodRes.json()
            setCategories(Array.isArray(cats) ? cats : [])
            setProducts(Array.isArray(prods) ? prods : [])
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const fetchPairingStatus = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/barista/pairing-status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setPairingCode(data.code)
                setPairingExpiry(data.expires_at)
            }
        } catch (e) {
            console.error(e)
        }
    }

    const generateCode = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/pairing/barista/generate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setPairingCode(data.code)
                setPairingExpiry(data.expires_at)
            }
        } catch (e) {
            console.error(e)
        }
    }

    const handleAddCategory = async () => {
        if (!newCatName) return
        try {
            const res = await fetch(`${API_BASE}/api/barista/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: newCatName })
            })
            if (res.ok) {
                setNewCatName('')
                setIsAddingCat(false)
                fetchData()
            }
        } catch (e) { console.error(e) }
    }

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Are you sure? This will not delete products but they will become uncategorized.')) return
        await fetch(`${API_BASE}/api/barista/categories/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        fetchData()
    }

    const handleAddProduct = async () => {
        if (!newProduct.name || !newProduct.category_id) return
        try {
            const res = await fetch(`${API_BASE}/api/barista/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newProduct)
            })
            if (res.ok) {
                setNewProduct({ name: '', price: 0, category_id: '' })
                setIsAddingProduct(false)
                fetchData()
            }
        } catch (e) { console.error(e) }
    }

    const handleUpdateProduct = async (p: Product) => {
        try {
            const res = await fetch(`${API_BASE}/api/barista/products/${p.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(p)
            })
            if (res.ok) {
                setEditingProduct(null)
                fetchData()
            }
        } catch (e) { console.error(e) }
    }

    const handleDeleteProduct = async (id: string) => {
        if (!confirm('Are you sure?')) return
        await fetch(`${API_BASE}/api/barista/products/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        fetchData()
    }

    if (loading) return (
        <div className="flex h-full items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-black" />
        </div>
    )

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-20">
            {/* Header */}
            <header className="border-b-[4px] border-black pb-8">
                <div className="flex items-center gap-4 mb-2">
                    <Smartphone className="w-8 h-8" />
                    <h1 className="text-4xl font-[900] uppercase tracking-tighter italic">Nano-Barista Settings</h1>
                </div>
                <p className="text-sm font-black uppercase tracking-widest opacity-40">Centralized Terminal Management</p>
            </header>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-black/10">
                <button
                    onClick={() => setActiveTab('menu')}
                    className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'menu' ? 'border-b-4 border-black text-black' : 'text-black/40 hover:text-black'}`}
                >
                    Menu Management
                </button>
                <button
                    onClick={() => setActiveTab('pairing')}
                    className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pairing' ? 'border-b-4 border-black text-black' : 'text-black/40 hover:text-black'}`}
                >
                    Global Pairing
                </button>
            </div>

            {activeTab === 'menu' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 min-h-[600px]">
                    {/* Categories Column */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="flex justify-between items-center bg-black text-white p-4">
                            <div className="flex items-center gap-2">
                                <LayoutGrid className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Categories</span>
                            </div>
                            <button onClick={() => setIsAddingCat(true)} className="p-1 hover:text-[#f59e0b]">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        {isAddingCat && (
                            <div className="border-2 border-black p-4 space-y-4 bg-gray-50">
                                <input
                                    autoFocus
                                    placeholder="CATEGORY NAME..."
                                    className="w-full bg-transparent border-b-2 border-black p-2 font-black uppercase text-[10px]"
                                    value={newCatName}
                                    onChange={e => setNewCatName(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleAddCategory} className="flex-1 bg-black text-white py-2 text-[10px] font-black uppercase">Save</button>
                                    <button onClick={() => setIsAddingCat(false)} className="px-4 border border-black py-2 text-[10px] font-black uppercase">Cancel</button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            {categories.map(cat => (
                                <div key={cat.id} className="group flex justify-between items-center p-4 border border-black hover:bg-black hover:text-white transition-all cursor-pointer">
                                    <span className="text-[10px] font-black uppercase tracking-widest">{cat.name}</span>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id) }} className="hover:text-red-500">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Products Column */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="flex justify-between items-center bg-[#f59e0b] text-black p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Global Product Menu</span>
                            </div>
                            <button onClick={() => setIsAddingProduct(true)} className="bg-black text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-colors">
                                Add Product
                            </button>
                        </div>

                        {isAddingProduct && (
                            <div className="border-[4px] border-black p-8 space-y-6 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                                <h3 className="text-xl font-black uppercase italic">New Product</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase">Product Name</label>
                                        <input
                                            className="w-full border-2 border-black p-3 font-black uppercase text-xs"
                                            value={newProduct.name}
                                            onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase">Price</label>
                                        <input
                                            type="number"
                                            className="w-full border-2 border-black p-3 font-black uppercase text-xs"
                                            value={newProduct.price || ''}
                                            onChange={e => {
                                                const val = parseFloat(e.target.value)
                                                setNewProduct({ ...newProduct, price: isNaN(val) ? 0 : val })
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase">Category</label>
                                    <select
                                        className="w-full border-2 border-black p-3 font-black uppercase text-xs appearance-none"
                                        value={newProduct.category_id}
                                        onChange={e => setNewProduct({ ...newProduct, category_id: e.target.value })}
                                    >
                                        <option value="">SELECT CATEGORY...</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button onClick={handleAddProduct} className="flex-1 bg-black text-white py-4 font-black uppercase tracking-[0.2em]">Add to Menu</button>
                                    <button onClick={() => setIsAddingProduct(false)} className="px-8 border-2 border-black py-4 font-black uppercase tracking-widest">Cancel</button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {products.map(prod => (
                                <div key={prod.id} className="border-2 border-black p-5 relative group hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-[8px] font-bold text-black/40 uppercase tracking-widest mb-1">
                                                {categories.find(c => c.id === prod.category_id)?.name || 'Uncategorized'}
                                            </p>
                                            <h4 className="text-xl font-black uppercase italic tracking-tighter">{prod.name}</h4>
                                        </div>
                                        <span className="bg-black text-white px-3 py-1 text-[10px] font-black">{prod.price.toFixed(2)}</span>
                                    </div>
                                    <div className="flex gap-2 pt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingProduct(prod)} className="flex-1 border border-black py-2 flex items-center justify-center gap-2 hover:bg-black hover:text-white">
                                            <Edit2 className="w-3 h-3" /> <span className="text-[8px] font-black uppercase">Edit</span>
                                        </button>
                                        <button onClick={() => handleDeleteProduct(prod.id)} className="px-4 border border-black py-2 hover:bg-red-500 hover:text-white transition-colors">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Edit Product Modal */}
                        {editingProduct && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                                <div className="bg-white border-[4px] border-black p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] space-y-6">
                                    <div className="flex justify-between items-center border-b-2 border-black pb-4">
                                        <h3 className="text-2xl font-black uppercase italic italic tracking-tighter">Edit Product</h3>
                                        <button onClick={() => setEditingProduct(null)}><X className="w-6 h-6" /></button>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black uppercase">Name</label>
                                            <input 
                                                className="w-full border-2 border-black p-3 font-black uppercase text-xs"
                                                value={editingProduct.name}
                                                onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black uppercase">Price</label>
                                            <input 
                                                type="number"
                                                className="w-full border-2 border-black p-3 font-black uppercase text-xs"
                                                value={editingProduct.price || ''}
                                                onChange={e => {
                                                    const val = parseFloat(e.target.value)
                                                    setEditingProduct({...editingProduct, price: isNaN(val) ? 0 : val})
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black uppercase">Category</label>
                                            <select 
                                                className="w-full border-2 border-black p-3 font-black uppercase text-xs appearance-none"
                                                value={editingProduct.category_id}
                                                onChange={e => setEditingProduct({...editingProduct, category_id: e.target.value})}
                                            >
                                                <option value="">SELECT...</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button 
                                            onClick={() => handleUpdateProduct(editingProduct)}
                                            className="flex-1 bg-black text-white py-4 font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                                        >
                                            <Save className="w-4 h-4" /> Save Changes
                                        </button>
                                        <button onClick={() => setEditingProduct(null)} className="px-8 border-2 border-black py-4 font-black uppercase tracking-widest">Cancel</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="max-w-2xl mx-auto py-10">
                    <div className="border-[6px] border-black p-12 bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] text-center space-y-10">
                        <header className="space-y-2">
                            <h2 className="text-3xl font-[900] uppercase italic tracking-tighter">Account Pairing Code</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic">Use this code on any terminal device</p>
                        </header>

                        <div className="py-12 bg-black/5 border-y-2 border-black flex flex-col items-center">
                            {pairingCode ? (
                                <>
                                    <div className="text-[120px] font-[900] tracking-[-0.05em] leading-none mb-4 select-all">
                                        {pairingCode}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <RefreshCw className={`w-4 h-4 ${timeLeft === '00:00' ? 'text-red-500' : 'animate-spin opacity-20'}`} />
                                        <span className={`text-xl font-mono font-black ${timeLeft === '00:00' ? 'text-red-500' : ''}`}>
                                            EXPIRING IN: {timeLeft}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="py-10 space-y-4">
                                    <p className="font-black uppercase tracking-widest opacity-40">No active pairing code</p>
                                    <button
                                        onClick={generateCode}
                                        className="bg-black text-white px-10 py-5 text-xl font-black uppercase tracking-[0.2em] hover:bg-[#f59e0b] hover:text-black transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-none translate-y-0 hover:translate-y-[4px] hover:translate-x-[4px]"
                                    >
                                        Generate New Code
                                    </button>
                                </div>
                            )}
                        </div>

                        <footer className="space-y-6 pt-4">
                            <button
                                onClick={generateCode}
                                className="text-[10px] font-black uppercase tracking-[0.3em] underline hover:text-[#f59e0b]"
                            >
                                Force Refresh Code
                            </button>
                            <div className="flex items-center justify-center gap-2 text-red-500 opacity-60">
                                <span className="text-[8px] font-black uppercase">Security note: codes are valid for 60 minutes only.</span>
                            </div>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    )
}
