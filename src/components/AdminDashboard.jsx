import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Package,
    Download,
    Truck,
    CheckCircle2,
    Clock,
    ExternalLink,
    Search,
    Lock
} from 'lucide-react';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8787'
    : 'https://3d-memoreez-orchestrator.walid-elleuch.workers.dev';

export default function AdminDashboard() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        // In a real app, this token would be stored securely. 
        // For this phase, we use the token directly as the "password".
        localStorage.setItem('admin_token', password);
        checkAuth();
    };

    const checkAuth = async () => {
        const token = localStorage.getItem('admin_token');
        if (!token) return;

        setIsLoading(true);
        try {
            const resp = await fetch(`${API_BASE_URL}/api/admin/orders`, {
                headers: { 'Authorization': token }
            });

            if (resp.ok) {
                const data = await resp.json();
                setOrders(data);
                setIsAuthenticated(true);
                setError(null);
            } else {
                setError('Invalid Token or Unauthorized');
                localStorage.removeItem('admin_token');
            }
        } catch (err) {
            setError('Failed to connect to backend');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const markAsShipped = async (orderId) => {
        const trackingNum = prompt('Enter Tracking Number:');
        if (!trackingNum) return;

        const token = localStorage.getItem('admin_token');
        try {
            const resp = await fetch(`${API_BASE_URL}/api/admin/orders/${orderId}/ship`, {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tracking_number: trackingNum })
            });

            if (resp.ok) {
                // Refresh orders
                checkAuth();
            } else {
                alert('Fulfillment failed');
            }
        } catch (err) {
            alert('Error updating order');
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'paid': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'shipped': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        }
    };

    const filteredOrders = orders.filter(o =>
        o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.receiver_first_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass p-10 rounded-3xl w-full max-w-md border border-white/10"
                >
                    <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-primary/30">
                        <Lock className="text-primary w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-black text-center mb-2 italic">Admin Access</h2>
                    <p className="text-white/40 text-center mb-8 text-sm">Authorized personnel only</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Access Token</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary transition-colors"
                                placeholder="••••••••••••"
                            />
                        </div>
                        <button className="w-full gradient-bg text-white font-black py-4 rounded-2xl glow-shadow hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest text-sm">
                            Unlock Dashboard
                        </button>
                    </form>
                    {error && <p className="text-red-400 text-center mt-4 text-xs font-bold">{error}</p>}
                </motion.div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto py-12 px-6">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Package className="text-primary w-6 h-6" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Command Center</span>
                    </div>
                    <h1 className="text-5xl font-black italic tracking-tighter">Order <span className="gradient-text">Fulfillment</span></h1>
                </div>

                <div className="relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search orders, emails, names..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 w-full md:w-80 text-sm focus:outline-none focus:border-primary/50 transition-all"
                    />
                </div>
            </header>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {filteredOrders.length === 0 ? (
                        <div className="glass p-20 rounded-3xl text-center border border-white/5">
                            <Clock className="w-12 h-12 text-white/10 mx-auto mb-4" />
                            <p className="text-white/20 font-bold uppercase tracking-widest">No orders found</p>
                        </div>
                    ) : (
                        filteredOrders.map((order) => (
                            <motion.div
                                key={order.id}
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="glass rounded-3xl overflow-hidden border border-white/10 group hover:border-white/20 transition-all flex flex-col lg:flex-row"
                            >
                                {/* Reference Image Area */}
                                <div className="lg:w-48 xl:w-64 bg-white/5 relative overflow-hidden">
                                    <img
                                        src={order.image_url.startsWith('http') ? order.image_url : `${API_BASE_URL}${order.image_url}`}
                                        alt="Concept"
                                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(order.status)}`}>
                                            {order.status}
                                        </div>
                                    </div>
                                </div>

                                {/* Content Area */}
                                <div className="flex-grow p-8 flex flex-col lg:flex-row justify-between gap-8">
                                    <div className="space-y-4">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Manifest ID</span>
                                            <h3 className="text-xl font-bold font-mono">{order.id}</h3>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Customer</span>
                                                <p className="font-bold">{order.receiver_first_name} {order.receiver_last_name}</p>
                                                <p className="text-white/40 text-xs">{order.user_email}</p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Shipping Destination</span>
                                                <p className="text-xs text-white/60 leading-relaxed max-w-[200px]">{order.shipping_address}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-3">
                                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                                            <a
                                                href={`${API_BASE_URL}${order.final_stl_r2_path}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                                            >
                                                <Download className="w-3 h-3" /> STL
                                            </a>
                                            <a
                                                href={`${API_BASE_URL}${order.gcode_r2_path}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                                            >
                                                <Download className="w-3 h-3" /> G-CODE
                                            </a>
                                        </div>

                                        <div className="w-px h-8 bg-white/10 hidden xl:block" />

                                        {order.status === 'paid' ? (
                                            <button
                                                onClick={() => markAsShipped(order.id)}
                                                className="w-full sm:w-auto px-8 py-5 gradient-bg rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs glow-shadow-primary hover:scale-[1.02] active:scale-[0.98] transition-all"
                                            >
                                                <Truck className="w-4 h-4" /> SHIP MANIFEST
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2 text-green-400 px-6">
                                                <CheckCircle2 className="w-5 h-5" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Shipped</span>
                                                    <span className="text-[10px] font-mono opacity-50">{order.tracking_number}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
