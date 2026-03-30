import { Link } from 'react-router-dom';
import { MonitorPlay, ArrowRight } from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-white text-black font-['Inter',sans-serif] selection:bg-[#ff3b30] selection:text-white">

            {/* Navigation */}
            <nav className="p-8 md:p-12 flex justify-between items-baseline sticky top-0 bg-white/80 backdrop-blur-md z-50 border-b border-black/5">
                <div className="flex items-center gap-2">
                    <img src="/rb_line.svg" alt="ReadyBoard" className="h-[18px] sm:h-5 object-contain" />
                </div>
                <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.2em]">
                    <a title="Pricing" href="#pricing" className="opacity-40 hover:opacity-100 transition">Pricing</a>
                    <span title="Marketplace" className="opacity-20 cursor-not-allowed">Marketplace (Soon)</span>
                    <Link title="App" to="/login" className="px-4 py-2 bg-black text-white hover:bg-[#ff3b30] transition flex items-center gap-2">
                        App <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="px-8 md:px-12 py-24 border-b border-black/5 overflow-hidden">
                <div className="max-w-7xl">
                    <h1 className="text-[clamp(3.5rem,14vw,9rem)] leading-[0.85] font-[900] uppercase tracking-[-0.06em] mb-12">
                        Transform<br />
                        <span className="text-[#ff3b30]">Pickup</span> Experience.
                    </h1>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
                        <p className="max-w-xl text-xl md:text-3xl font-medium leading-tight tracking-tight text-black/80">
                            The most flexible Digital Order Board for modern nodes.
                            Built for aesthetics, speed, and absolute clarity.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link to="/login" className="bg-black text-white px-10 py-5 text-xs font-black uppercase tracking-[0.3em] hover:bg-[#ff3b30] transition text-center">
                                Start Free Node
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Live Preview Section */}
            <section className="p-8 md:p-12 bg-[#f9f9f9]">
                <div className="mb-6 flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 flex items-center gap-2">
                        <MonitorPlay className="w-3 h-3" /> TV Display Preview
                    </span>
                    <span className="text-[10px] font-mono opacity-30">REF: 4001-BOARD-INTEL</span>
                </div>

                <div className="bg-white border border-black/10 p-10 md:p-20 shadow-2xl overflow-hidden relative group transition-all hover:border-black/30">
                    <div className="grid grid-cols-2 gap-20">
                        {/* Processing Column */}
                        <div>
                            <div className="flex items-center gap-2 mb-12 text-[10px] font-black uppercase tracking-[0.3em] opacity-20">
                                <div className="w-2.5 h-2.5 rounded-full bg-black animate-pulse"></div> Processing
                            </div>
                            <div className="space-y-12">
                                <div className="flex justify-between items-baseline border-b-2 border-black/5 pb-4">
                                    <span className="text-7xl md:text-9xl font-black opacity-5 italic">104</span>
                                    <span className="text-xs font-mono opacity-20">#A92</span>
                                </div>
                                <div className="flex justify-between items-baseline border-b-2 border-black/5 pb-4">
                                    <span className="text-7xl md:text-9xl font-black opacity-5 italic">105</span>
                                    <span className="text-xs font-mono opacity-20">#B12</span>
                                </div>
                            </div>
                        </div>
                        {/* Ready Column */}
                        <div>
                            <div className="flex items-center gap-2 mb-12 text-[10px] font-black uppercase tracking-[0.3em] text-[#ff3b30]">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#ff3b30]"></div> Ready
                            </div>
                            <div className="space-y-12">
                                <div className="flex justify-between items-baseline border-b-2 border-black/5 pb-4">
                                    <span className="text-7xl md:text-9xl font-black text-[#ff3b30]">101</span>
                                    <span className="text-xs font-mono opacity-40">#F01</span>
                                </div>
                                <div className="flex justify-between items-baseline border-b-2 border-black/5 pb-4">
                                    <span className="text-7xl md:text-9xl font-black text-[#ff3b30]">102</span>
                                    <span className="text-xs font-mono opacity-40">#C99</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature Grid */}
            <section className="grid md:grid-cols-3 border-y border-black">
                <div className="p-12 border-b md:border-b-0 md:border-r border-black/10 hover:bg-[#fcfcfc] transition">
                    <h3 className="font-black text-[10px] uppercase tracking-[0.4em] mb-8 text-[#ff3b30]">01 / Real-time</h3>
                    <p className="text-xl font-bold leading-tight uppercase tracking-tighter">Websocket sync ensures orders appear the second they are punched in.</p>
                </div>
                <div className="p-12 border-b md:border-b-0 md:border-r border-black/10 hover:bg-[#fcfcfc] transition">
                    <h3 className="font-black text-[10px] uppercase tracking-[0.4em] mb-8 text-[#ff3b30]">02 / Hardware</h3>
                    <p className="text-xl font-bold leading-tight uppercase tracking-tighter">Hardware agnostic. Use your existing Smart TVs, iPads, or even old laptops.</p>
                </div>
                <div className="p-12 hover:bg-[#fcfcfc] transition">
                    <h3 className="font-black text-[10px] uppercase tracking-[0.4em] mb-8 text-[#ff3b30]">03 / SDK</h3>
                    <p className="text-xl font-bold leading-tight uppercase tracking-tighter">Full SDK access. If you can code it in HTML, your board can look like it.</p>
                </div>
            </section>

            {/* Ticker */}
            <div className="overflow-hidden whitespace-nowrap py-6 bg-black text-white border-y border-black">
                <div className="inline-block animate-[scroll_30s_linear_infinite] font-black uppercase text-[10px] tracking-[0.6em]">
                    <span>Nano-Barista: Ваша первая цифровая касса • Принимайте заказы • Печатайте чеки • </span>
                    <span>Nano-Barista: Ваша первая цифровая касса • Принимайте заказы • Печатайте чеки • </span>
                </div>
            </div>

            {/* Nano-Barista Section */}
            <section className="p-8 md:p-12 bg-white border-b border-black/5">
                <div className="max-w-7xl">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] mb-6 block text-[#ff3b30]">Nano-Barista v1.0</span>
                            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-[0.9] mb-8">
                                Ваша первая<br />
                                <span className="text-[#ff3b30]">цифровая</span> касса.
                            </h2>
                            <p className="text-lg md:text-xl font-medium leading-relaxed mb-10 text-black/70">
                                Идеальное решение для микро-кофеен. Принимайте заказы, печатайте чеки и управляйте очередью без покупки дорогого оборудования. Все, что вам нужно — планшет и ReadyBoard.
                            </p>
                            <Link to="/login" className="inline-flex items-center gap-3 bg-black text-white px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[#ff3b30] transition">
                                Launch Nano-Barista <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="bg-[#f0f0f0] border border-black/10 p-4 aspect-video flex items-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors z-10" />
                            <img src="/rb_line.svg" alt="Preview" className="w-1/2 opacity-10" />
                            <div className="relative z-20 text-[10px] font-black uppercase tracking-[0.5em] opacity-30">Interface Preview</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Marketplace Placeholder */}
            <section className="p-12 border-b border-black/10 bg-[#fafafa] text-center">
                <h3 className="font-black text-[10px] uppercase tracking-[0.5em] mb-4 opacity-20">Marketplace Ecosystem</h3>
                <p className="text-xl font-bold uppercase tracking-tighter">Скоро: Дополнения и интеграции для вашего бизнеса.</p>
            </section>

            {/* Pricing */}
            <section id="pricing" className="p-8 md:p-12 bg-white">
                <div className="grid md:grid-cols-2 gap-px bg-black border border-black">
                    <div className="bg-white p-12 md:p-20">
                        <span className="text-[10px] font-black uppercase opacity-30 block mb-4 tracking-[0.3em]">Entry Node</span>
                        <h4 className="text-6xl font-[900] mb-8 italic tracking-tighter uppercase">Free</h4>
                        <ul className="text-[10px] font-black uppercase space-y-4 opacity-50 mb-12 tracking-widest">
                            <li>• 1 Display Board</li>
                            <li>• Standard Layouts</li>
                            <li>• Community Support</li>
                        </ul>
                        <button className="w-full border-2 border-black px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-black hover:text-white transition">Select Plan</button>
                    </div>
                    <div className="bg-white p-12 md:p-20">
                        <span className="text-[10px] font-black uppercase text-[#ff3b30] block mb-4 tracking-[0.3em]">Professional</span>
                        <h4 className="text-6xl font-[900] mb-8 italic tracking-tighter uppercase">$29<span className="text-sm font-normal">/mo</span></h4>
                        <ul className="text-[10px] font-black uppercase space-y-4 mb-12 tracking-widest">
                            <li>• Unlimited Boards</li>
                            <li>• Custom HTML/CSS SDK</li>
                            <li>• No Branding Labels</li>
                            <li>• 24/7 Priority Support</li>
                        </ul>
                        <button className="w-full bg-black text-white px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[#ff3b30] transition border-2 border-black">Get Full Access</button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="p-12 flex flex-col md:flex-row justify-between border-t border-black/5 items-center gap-8">
                <div className="flex items-center gap-4">
                    <img src="/rb_line.svg" alt="ReadyBoard" className="h-3 md:h-4 opacity-40 grayscale" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">© 2026/Terminal</span>
                </div>
                <div className="flex gap-10 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                    <a href="#" className="hover:text-[#ff3b30] transition">Github</a>
                    <a href="#" className="hover:text-[#ff3b30] transition">Docs</a>
                    <a href="#" className="hover:text-[#ff3b30] transition">Terms</a>
                </div>
            </footer>

            <style>{`
                @keyframes scroll {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
            `}</style>
        </div>
    );
}