import { ChevronLeft, CreditCard, Box, Truck, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Checkout({ selectedConcept, finalizedData, onBack }) {
    const price = finalizedData?.printEstimate?.priceBeforeShipping || 45.00;
    const line1 = finalizedData?.line1;
    const line2 = finalizedData?.line2;

    return (
        <div className="w-full max-w-6xl mx-auto px-4 animate-fade-in">
            <div className="text-center mb-16 md:mb-32">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 mb-6 block font-sans">Step 04 • Settlement</span>
                <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter italic">Secure <span className="gradient-text">Fulfillment</span></h2>
                <div className="flex items-center justify-center gap-4 text-white/30 text-sm md:text-xl font-light tracking-wide">
                    <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
                    <span>End-to-end encrypted production queue</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-20 mb-40">
                {/* Left Side: Order & Shipping */}
                <div className="lg:col-span-7 space-y-12">
                    {/* Item Preview */}
                    <div className="glass p-10 md:p-14 rounded-[3rem] md:rounded-[4rem] border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

                        <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                            <div className="w-40 h-40 md:w-56 md:h-56 rounded-[2rem] md:rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl shrink-0 group-hover:scale-105 transition-transform duration-1000 ease-out">
                                <img src={selectedConcept?.url} className="w-full h-full object-cover" />
                            </div>
                            <div className="text-center md:text-left">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-3 block">Selected Blueprint</span>
                                <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4 italic leading-none">{selectedConcept?.title}</h3>
                                <div className="text-white/40 text-sm md:text-lg font-light leading-relaxed mb-8">
                                    <p className="mb-2">3D Printed in <span className="text-white/60 font-bold italic">Premium Matte Gray PLA</span>. Optimized for Prusa FDM technology with a solid structural base.</p>
                                    {(line1 || line2) && (
                                        <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-2">Custom Engraving</p>
                                            {line1 && <p className="text-white font-black tracking-widest uppercase">{line1}</p>}
                                            {line2 && <p className="text-white/60 font-bold tracking-widest uppercase text-sm">{line2}</p>}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                    <div className="px-5 py-2.5 bg-white/5 rounded-full border border-white/10 flex items-center gap-2">
                                        <Truck className="w-3.5 h-3.5 text-white/40" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Global Express</span>
                                    </div>
                                    <div className="px-5 py-2.5 bg-white/5 rounded-full border border-white/10 flex items-center gap-2">
                                        <ShieldCheck className="w-3.5 h-3.5 text-white/40" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Lifetime QC</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Form */}
                    <div className="space-y-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                <Truck className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic">Shipping Terminal</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] ml-4">Receiver First Name</label>
                                <input type="text" placeholder="GIVEN NAME" className="w-full bg-transparent border-b-2 border-white/5 px-4 py-5 text-xl md:text-2xl font-black text-white placeholder-white/5 focus:outline-none focus:border-primary transition-all tracking-tight uppercase" />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] ml-4">Receiver Last Name</label>
                                <input type="text" placeholder="FAMILY NAME" className="w-full bg-transparent border-b-2 border-white/5 px-4 py-5 text-xl md:text-2xl font-black text-white placeholder-white/5 focus:outline-none focus:border-primary transition-all tracking-tight uppercase" />
                            </div>
                            <div className="md:col-span-2 space-y-4">
                                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] ml-4">Digital Correlation (Email)</label>
                                <input type="email" placeholder="EMAIL@DESTINATION.COM" className="w-full bg-transparent border-b-2 border-white/5 px-4 py-5 text-xl md:text-2xl font-black text-white placeholder-white/5 focus:outline-none focus:border-primary transition-all tracking-tight uppercase" />
                            </div>
                            <div className="md:col-span-2 space-y-4">
                                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] ml-4">Physical Destination</label>
                                <input type="text" placeholder="STREET, BUILDING, SUITE..." className="w-full bg-transparent border-b-2 border-white/5 px-4 py-5 text-xl md:text-2xl font-black text-white placeholder-white/5 focus:outline-none focus:border-primary transition-all tracking-tight uppercase" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Payment & Summary */}
                <div className="lg:col-span-5">
                    <div className="sticky top-32 space-y-12">
                        {/* Summary Card */}
                        <div className="glass p-10 md:p-12 rounded-[3rem] border border-white/10 relative overflow-hidden">
                            <h3 className="text-2xl font-black tracking-tighter uppercase mb-10 italic flex items-center justify-between">
                                Summary
                                <CreditCard className="w-6 h-6 text-primary" />
                            </h3>

                            <div className="space-y-6 mb-12">
                                <div className="flex justify-between text-white/40 font-light text-lg">
                                    <span>Dimensional Sculpture</span>
                                    <span className="text-white/80 font-black tracking-tighter">${price.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-white/40 font-light text-lg">
                                    <span>Priority Quantum Transit</span>
                                    <span className="text-white/80 font-black tracking-tighter text-green-400">FREE</span>
                                </div>
                                <div className="pt-6 border-t border-white/5 flex justify-between items-end">
                                    <span className="text-lg font-black uppercase tracking-widest text-white/20 leading-none">Total Investment</span>
                                    <span className="text-5xl md:text-6xl font-black tracking-tighter italic text-white leading-none">${price.toFixed(2)}</span>
                                </div>
                            </div>

                            <button className="w-full bg-white text-black py-8 md:py-10 rounded-full font-black text-lg md:text-xl uppercase tracking-[0.5em] hover:scale-[1.03] active:scale-[0.97] transition-all shadow-[0_20px_50px_rgba(255,255,255,0.15)] mb-8">
                                Complete Order
                            </button>

                            <div className="flex items-center justify-center gap-2 text-white/20 text-[10px] font-black uppercase tracking-[0.2em]">
                                <ShieldCheck className="w-3 h-3" />
                                Verified by Stripe Secure Nodes
                            </div>
                        </div>

                        {/* Back Action */}
                        <button
                            onClick={onBack}
                            className="w-full py-6 md:py-8 rounded-full border border-white/5 hover:bg-white/5 transition-all text-white/30 hover:text-white flex items-center justify-center gap-4 group"
                        >
                            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-2 transition-transform" />
                            <span className="text-xs font-black uppercase tracking-[0.4em]">Adjust Parameters</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Final Footer Note */}
            <div className="text-center py-20 border-t border-white/[0.03]">
                <p className="text-white/20 text-xs font-light leading-relaxed max-w-2xl mx-auto tracking-wide">
                    Your dimensional data is encrypted at rest and purged immediately after physical manifestation. We do not store original sentiment text post-production.
                </p>
            </div>
        </div>
    );
}
