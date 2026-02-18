import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FactsInputForm({ onSubmit, isGenerating, initialData }) {
    const [hobbies, setHobbies] = useState(initialData.hobbies);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ hobbies });
    };

    const updateHobby = (index, value) => {
        const newHobbies = [...hobbies];
        newHobbies[index] = value;
        setHobbies(newHobbies);
    };

    return (
        <div className="w-full max-w-5xl mx-auto px-4">
            <div className="text-center mb-16 md:mb-32">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-[1.1] italic">
                        Start with <br /><span className="gradient-text">a Story</span>
                    </h2>
                    <p className="text-white/30 text-lg md:text-2xl font-light leading-relaxed max-w-2xl mx-auto tracking-wide">
                        Tell us 3 unique dimensions of your person. We'll crystallize these sentiments into a physical masterpiece.
                    </p>
                </motion.div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-20 md:gap-32 w-full">
                <div className="flex flex-col gap-20 md:gap-32 w-full">
                    {hobbies.map((hobby, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8, delay: idx * 0.2 }}
                            className="group transition-all duration-700 w-full flex flex-col items-center"
                        >
                            <label className="text-[10px] md:text-xs font-black text-white/10 mb-6 md:mb-10 group-focus-within:text-primary uppercase tracking-[0.6em] transition-all duration-700">
                                Dimension 0{idx + 1}
                            </label>
                            <input
                                type="text"
                                value={hobby}
                                onChange={(e) => updateHobby(idx, e.target.value)}
                                placeholder={idx === 0 ? "Their deepest passion..." : idx === 1 ? "A defining achievement..." : "A unique personality trait..."}
                                className="w-full bg-transparent border-b-2 border-white/5 px-4 md:px-0 py-8 md:py-12 text-white placeholder-white/5 focus:outline-none focus:border-primary transition-all text-center text-3xl md:text-5xl font-black tracking-tighter"
                                required
                            />
                        </motion.div>
                    ))}
                </div>

                <div className="flex flex-col items-center pt-20 md:pt-32 w-full">
                    <motion.button
                        type="submit"
                        disabled={isGenerating}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`group relative overflow-hidden px-20 md:px-40 py-8 md:py-10 rounded-full font-black text-base md:text-xl transition-all duration-700 ${isGenerating
                            ? 'bg-white/5 text-white/10 cursor-not-allowed'
                            : 'bg-white text-black tracking-[0.4em] uppercase shadow-[0_20px_50px_rgba(255,255,255,0.2)]'
                            }`}
                    >
                        <div className="relative z-10 flex items-center gap-6">
                            {isGenerating ? (
                                <>
                                    <div className="w-6 h-6 border-2 border-white/10 border-t-white rounded-full animate-spin" />
                                    Crystallizing...
                                </>
                            ) : (
                                <>
                                    Crystallize Form
                                    <Sparkles className="w-6 h-6 md:w-8 md:h-8 group-hover:rotate-12 transition-transform duration-500" />
                                </>
                            )}
                        </div>
                    </motion.button>

                    <div className="mt-16 flex flex-col items-center gap-8 text-center">
                        <div className="w-px h-20 bg-gradient-to-b from-white/10 to-transparent" />
                        <p className="text-white/20 text-[10px] uppercase tracking-[0.5em] font-black">Powered by Llama 3 • Manifold Engine</p>
                    </div>
                </div>
            </form>
        </div>
    );
}
