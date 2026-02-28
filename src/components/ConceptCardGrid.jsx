import { useEffect } from 'react';
import { ChevronLeft, CheckCircle2, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8787'
    : 'https://3d-memoreez-orchestrator.walid-elleuch.workers.dev';

export default function ConceptCardGrid({ concepts, onSelect, onBack, onGenerateMore, isGenerating }) {
    // Proactive GPU Warmup when the user lands on the concept selection page
    useEffect(() => {
        fetch(`${API_BASE_URL}/api/warmup`, { method: "POST" }).catch(() => { });
    }, []);

    return (
        <div className="w-full max-w-6xl mx-auto px-4 py-8 md:py-16">
            <div className="text-center mb-16 md:mb-24">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                >
                    <h2 className="text-4xl md:text-5xl font-light text-slate-800 mb-6 tracking-tight">
                        Choose Your Concept
                    </h2>
                    <p className="text-slate-500 text-lg md:text-xl font-light max-w-2xl mx-auto">
                        Select the artistic direction that best resonates with your story.
                    </p>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 mb-32">
                {concepts.map((concept, idx) => (
                    <motion.div
                        key={concept.id}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: idx * 0.1 }}
                        className="group relative cursor-pointer flex flex-col"
                        onClick={() => onSelect(concept)}
                    >
                        {/* Image Container */}
                        <div className="aspect-[4/5] object-cover rounded-3xl overflow-hidden relative shadow-sm border border-slate-100 mb-6 bg-slate-50">
                            <img
                                src={concept.url}
                                alt={concept.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                            />
                            {/* We keep a subtle dark gradient overlay just so the white text on the image remains legible */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-90 transition-opacity group-hover:opacity-100" />

                            {/* Overlay Info on Image */}
                            <div className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-8">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-white shadow-sm ${concept.type === 'Literal' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                                        {concept.type}
                                    </span>
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-black/30 backdrop-blur-md rounded-full border border-white/20">
                                        <TrendingUp className="w-3 h-3 text-green-400" />
                                        <span className="text-[10px] font-bold text-white/90">{concept.score}% Printable</span>
                                    </div>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-medium text-white tracking-tight leading-tight">{concept.title}</h3>
                            </div>
                        </div>

                        {/* Description & Action (Below Image) */}
                        <div className="px-2 flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div className="max-w-md">
                                <p className="text-slate-600 text-base font-light leading-relaxed">
                                    {concept.type === 'Literal'
                                        ? 'A precise, recognizable fusion of your story into a tangible geometry.'
                                        : 'A fluid, evocative interpretation focusing on emotional resonance.'}
                                </p>
                            </div>
                            <div className="shrink-0 flex items-center justify-end">
                                <span className="inline-flex items-center gap-2 text-primary font-medium text-sm group-hover:gap-3 transition-all bg-primary/5 px-4 py-2 rounded-lg">
                                    Select Concept
                                    <CheckCircle2 className="w-4 h-4" />
                                </span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="flex flex-col md:flex-row gap-6 justify-center items-center py-20 border-t border-slate-100 mt-12">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-all px-8 py-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 font-medium text-sm md:text-base group"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Revise Story
                </button>

                <button
                    onClick={onGenerateMore}
                    disabled={isGenerating}
                    className={`flex items-center gap-2 px-10 py-4 rounded-2xl font-medium text-sm md:text-base transition-all shadow-sm ${isGenerating
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-lg'
                        }`}
                >
                    {isGenerating ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Exploring Directions...
                        </>
                    ) : (
                        <>
                            Explore More Concepts
                            <TrendingUp className="w-4 h-4" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
