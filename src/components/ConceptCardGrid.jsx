import { ChevronLeft, CheckCircle2, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ConceptCardGrid({ concepts, onSelect, onBack }) {
    return (
        <div className="w-full max-w-7xl mx-auto px-4">
            <div className="text-center mb-16 md:mb-32">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                >
                    <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter italic">
                        Choose Your <span className="gradient-text">Concept</span>
                    </h2>
                    <p className="text-white/30 text-lg md:text-2xl font-light mb-12 tracking-wide">
                        Select the artistic direction that resonates with your sentiment.
                    </p>
                    <button
                        onClick={onBack}
                        className="inline-flex items-center gap-3 text-white/30 hover:text-white transition-all px-12 py-5 rounded-full border border-white/5 hover:bg-white/5 group"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-xs font-black uppercase tracking-[0.3em]">Reverse Sentiment</span>
                    </button>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-32 mb-40">
                {concepts.map((concept, idx) => (
                    <motion.div
                        key={concept.id}
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: idx * 0.2 }}
                        className="group relative cursor-pointer"
                        onClick={() => onSelect(concept)}
                    >
                        {/* Image Container */}
                        <div className="aspect-[4/5] md:aspect-[3/4] overflow-hidden rounded-[2.5rem] md:rounded-[4rem] relative premium-input mb-8 md:mb-12">
                            <img
                                src={concept.url}
                                alt={concept.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-transparent to-transparent opacity-80" />

                            {/* Overlay Info */}
                            <div className="absolute bottom-8 left-8 right-8 md:bottom-12 md:left-12 md:right-12">
                                <div className="flex items-center gap-4 mb-4">
                                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${concept.type === 'Literal' ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]'}`}>
                                        {concept.type}
                                    </span>
                                    <div className="flex items-center gap-2 px-4 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                                        <TrendingUp className="w-3 h-3 text-green-400" />
                                        <span className="text-[10px] font-black text-white/80">{concept.score}% PRINTABLE</span>
                                    </div>
                                </div>
                                <h3 className="text-3xl md:text-5xl font-black text-white tracking-tighter group-hover:gradient-text transition-all duration-500">{concept.title}</h3>
                            </div>
                        </div>

                        {/* Description & Action */}
                        <div className="px-8 md:px-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
                            <div className="max-w-md">
                                <p className="text-white/40 text-sm md:text-lg font-light leading-relaxed">
                                    {concept.type === 'Literal'
                                        ? 'A precise, recognizable fusion of your story into a tangible geometry.'
                                        : 'A fluid, evocative interpretation focusing on the emotional resonance.'}
                                </p>
                            </div>
                            <div className="shrink-0">
                                <span className="inline-flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.4em] group-hover:gap-4 transition-all">
                                    Initiate Blueprint
                                    <CheckCircle2 className="w-4 h-4" />
                                </span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="text-center py-24 glass rounded-[3rem] border-dashed border-2 border-white/5 mx-4">
                <p className="text-white/20 mb-8 italic text-lg md:text-xl font-light">"Seeking a different resonance?"</p>
                <button
                    onClick={onBack}
                    className="text-white font-black uppercase tracking-[0.4em] text-xs hover:text-primary transition-all border-b border-white/10 pb-2"
                >
                    Regenerate All Concepts
                </button>
            </div>
        </div>
    );
}
