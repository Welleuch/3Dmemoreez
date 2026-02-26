import { useState } from 'react';
import { ChevronLeft, CreditCard, Box, Truck, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "http://localhost:8787";

export default function Checkout({ selectedConcept, finalizedData, onBack }) {
    const stats = finalizedData?.printEstimate || {};
    const materialGrams = stats.total_material_grams || 0;
    const materialCost = stats.total_material_cost || 0;
    const printTimeDisplay = stats.print_time_display || "—";

    const baseServiceFee = 12.00;
    const shippingFee = 3.90;
    const productionCost = materialCost + baseServiceFee;
    const totalInvestment = productionCost + shippingFee;

    const line1 = finalizedData?.line1;
    const line2 = finalizedData?.line2;

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [selectedMethod, setSelectedMethod] = useState('stripe');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const paymentMethods = [
        { id: 'stripe', name: 'Stripe / Card', icon: <CreditCard className="w-5 h-5 text-primary" />, subtitle: 'Credit, Google & Apple Pay' },
        { id: 'paypal', name: 'PayPal', icon: <Sparkles className="w-5 h-5 text-blue-500" />, subtitle: 'Instant Transfer' },
        { id: 'bank_transfer', name: 'Bank Transfer', icon: <Box className="w-5 h-5 text-slate-500" />, subtitle: 'SEPA / ACH (2-3 days)' },
    ];

    const handleCheckout = async () => {
        if (!firstName || !lastName || !email || !address) {
            alert('Please fill in all shipping details first.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`${WORKER_URL}/api/checkout/create-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: finalizedData.sessionId, // Note: ensure this exists in finalizedData
                    asset_id: selectedConcept.id,
                    receiver_first_name: firstName,
                    receiver_last_name: lastName,
                    email: email,
                    shipping_address: address,
                    payment_method: selectedMethod,
                    stats: stats
                })
            });

            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert(data.error || 'Failed to initialize checkout');
                setIsSubmitting(false);
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert('An error occurred during checkout setup.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto px-4 animate-fade-in py-8">
            <div className="text-center mb-16 md:mb-24">
                <span className="text-[10px] md:text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4 block">Step 04 • Settlement</span>
                <h2 className="text-4xl md:text-6xl font-light mb-4 tracking-tight text-slate-800">Secure <span className="font-medium text-primary">Fulfillment</span></h2>
                <div className="flex items-center justify-center gap-3 text-slate-500 text-sm md:text-lg font-light tracking-wide">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                    <span>End-to-end encrypted production queue</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-16 mb-32">
                {/* Left Side: Order & Shipping */}
                <div className="lg:col-span-7 space-y-12">
                    {/* Item Preview */}
                    <div className="bg-white/60 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

                        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-12 relative z-10">
                            <div className="w-40 h-40 md:w-48 md:h-48 rounded-3xl overflow-hidden border border-slate-200 shadow-lg shrink-0 group-hover:scale-105 transition-transform duration-700 ease-out bg-white p-2">
                                <img src={selectedConcept?.url} className="w-full h-full object-cover rounded-2xl" />
                            </div>
                            <div className="text-center md:text-left flex-grow">
                                <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2 block">Selected Blueprint</span>
                                <h3 className="text-2xl md:text-3xl font-semibold text-slate-800 tracking-tight mb-3">{selectedConcept?.title}</h3>
                                <div className="text-slate-500 text-sm md:text-base font-light leading-relaxed mb-6">
                                    <p className="mb-3">3D Printed in <span className="text-slate-700 font-medium">Premium Matte Gray PLA</span>.</p>
                                    <div className="grid grid-cols-2 gap-4 mt-6">
                                        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                            <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Mass</p>
                                            <p className="text-slate-800 font-bold text-xl tracking-tight">{materialGrams}g</p>
                                        </div>
                                        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                            <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Print Time</p>
                                            <p className="text-slate-800 font-bold text-xl tracking-tight">{printTimeDisplay}</p>
                                        </div>
                                    </div>
                                    {(line1 || line2) && (
                                        <div className="mt-6 p-5 md:p-6 bg-primary/5 rounded-2xl border border-primary/10">
                                            <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-primary/80 mb-2">Custom Engraving</p>
                                            {line1 && <p className="text-primary-900 font-bold tracking-wider text-lg mb-1">{line1}</p>}
                                            {line2 && <p className="text-primary-800 font-medium tracking-wider text-sm opacity-80">{line2}</p>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Form */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200 shadow-sm">
                                <Truck className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-light tracking-tight text-slate-800">Shipping Details</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-4">First Name</label>
                                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" className="w-full min-h-[56px] bg-white border border-slate-200 rounded-2xl px-6 py-4 text-lg font-light text-slate-800 placeholder-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-4">Last Name</label>
                                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" className="w-full min-h-[56px] bg-white border border-slate-200 rounded-2xl px-6 py-4 text-lg font-light text-slate-800 placeholder-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-4">Email Address</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" className="w-full min-h-[56px] bg-white border border-slate-200 rounded-2xl px-6 py-4 text-lg font-light text-slate-800 placeholder-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-4">Shipping Address</label>
                                <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Printing Lane, Suite 4..." className="w-full min-h-[56px] bg-white border border-slate-200 rounded-2xl px-6 py-4 text-lg font-light text-slate-800 placeholder-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                            </div>
                        </div>

                        {/* Payment Method Selector */}
                        <div className="space-y-6 pt-8 border-t border-slate-200">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200 shadow-sm">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl md:text-2xl font-light tracking-tight text-slate-800">Payment Option</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {paymentMethods.map((method) => (
                                    <button
                                        key={method.id}
                                        onClick={() => setSelectedMethod(method.id)}
                                        className={`p-6 md:p-8 rounded-3xl border transition-all text-left relative overflow-hidden group shadow-sm ${selectedMethod === method.id
                                            ? 'bg-primary/5 border-primary ring-1 ring-primary/50'
                                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className="flex flex-col h-full justify-between gap-4">
                                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 w-fit">
                                                {method.icon}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 mb-1">{method.name}</p>
                                                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 leading-relaxed">{method.subtitle}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Payment & Summary */}
                <div className="lg:col-span-5">
                    <div className="sticky top-32 space-y-8">
                        {/* Summary Card */}
                        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-200 shadow-xl relative overflow-hidden">
                            <h3 className="text-xl font-light tracking-tight text-slate-800 mb-8 flex items-center justify-between">
                                Order Summary
                                <CreditCard className="w-5 h-5 text-slate-400" />
                            </h3>

                            <div className="space-y-4 mb-10">
                                <div className="flex justify-between text-slate-500 font-light text-lg">
                                    <span>Production & Service</span>
                                    <span className="text-slate-800 font-semibold">{productionCost.toFixed(2)}€</span>
                                </div>
                                <div className="flex justify-between text-slate-500 font-light text-lg">
                                    <span>Shipping</span>
                                    <span className="text-slate-800 font-semibold">{shippingFee.toFixed(2)}€</span>
                                </div>
                                <div className="pt-8 border-t border-slate-100 flex justify-between items-end">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Total Due</span>
                                        <span className="text-4xl md:text-5xl font-light tracking-tight text-slate-800">{totalInvestment.toFixed(2)}€</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleCheckout}
                                disabled={isSubmitting}
                                className={`w-full py-5 md:py-6 rounded-2xl font-bold text-lg transition-all shadow-lg ${isSubmitting
                                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                    : 'bg-slate-900 text-white hover:bg-slate-800 hover:-translate-y-1 hover:shadow-2xl active:translate-y-0 active:shadow-md'}`}>
                                {isSubmitting ? 'Processing safely...' : 'Complete Secure Checkout'}
                            </button>
                        </div>

                        {/* Back Action */}
                        <button
                            onClick={onBack}
                            className="w-full py-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-800 flex items-center justify-center gap-2 group bg-white shadow-sm"
                        >
                            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-[11px] font-semibold uppercase tracking-widest">Adjust Blueprint</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Final Footer Note */}
            <div className="text-center py-16 border-t border-slate-200">
                <p className="text-slate-400 text-sm font-light leading-relaxed max-w-2xl mx-auto">
                    Your dimensional data is securely processed. We maintain strict privacy and do not resell your stories.
                </p>
            </div>
        </div>
    );
}
