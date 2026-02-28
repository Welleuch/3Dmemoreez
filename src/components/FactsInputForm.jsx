import { useState } from 'react';
import { Sparkles, User, Heart, Star, Gift } from 'lucide-react';
import { motion } from 'framer-motion';

const OCCASIONS = [
    '', 'Birthday', 'Graduation', 'Anniversary', 'Mother\'s Day',
    'Father\'s Day', 'Christmas', 'Valentine\'s Day', 'Retirement', 'Just Because'
];

const MotionDiv = motion.div;

export default function FactsInputForm({ onSubmit, isGenerating, initialData }) {
    // Parse initial data back into fields if coming back from a later step
    const parseInitialData = () => {
        if (!initialData?.hobbies?.length) return { name: '', hobbies: '', quirk: '', occasion: '' };
        const combined = initialData.hobbies.join('\n');
        const nameMatch = combined.match(/Subject:\s*(.+)/);
        const storyMatch = combined.match(/Story:\s*([\s\S]+)/);
        const name = nameMatch ? nameMatch[1].trim() : '';
        const story = storyMatch ? storyMatch[1].trim() : combined;
        return { name, hobbies: story, quirk: '', occasion: '' };
    };

    const initial = parseInitialData();
    const [name, setName] = useState(initial.name);
    const [hobbies, setHobbies] = useState(initial.hobbies);
    const [quirk, setQuirk] = useState(initial.quirk);
    const [occasion, setOccasion] = useState(initial.occasion);

    const canSubmit = name.trim() || hobbies.trim();

    const handleSubmit = (e) => {
        e?.preventDefault();
        if (!canSubmit || isGenerating) return;

        const parts = [];
        if (name.trim()) parts.push(`Subject: ${name.trim()}`);
        if (hobbies.trim()) parts.push(`Passions & Hobbies: ${hobbies.trim()}`);
        if (quirk.trim()) parts.push(`Fun Fact: ${quirk.trim()}`);
        if (occasion) parts.push(`Occasion: ${occasion}`);

        onSubmit({ hobbies: parts });
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.08 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 18 },
        show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }
    };

    return (
        <div className="w-full max-w-2xl mx-auto px-4 py-8 md:py-14 flex flex-col items-center">
            {/* Header */}
            <MotionDiv
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="text-center mb-10"
            >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 border border-purple-100 text-purple-600 text-xs font-semibold uppercase tracking-widest mb-5">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Gift Generator
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight mb-3">
                    Start with a{' '}
                    <span className="gradient-text">Story</span>
                </h1>
                <p className="text-slate-500 text-lg font-light max-w-md mx-auto leading-relaxed">
                    Tell us about the person you want to celebrate and our AI will craft something truly unique.
                </p>
            </MotionDiv>

            {/* Form Card */}
            <MotionDiv
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="w-full"
            >
                <form onSubmit={handleSubmit} className="w-full bg-white rounded-[2rem] border border-slate-200/80 shadow-xl shadow-slate-100/60 overflow-hidden">

                    {/* Field: Who */}
                    <MotionDiv variants={itemVariants} className="px-7 pt-8 pb-6 border-b border-slate-100">
                        <label className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                                <User className="w-3 h-3 text-purple-600" />
                            </div>
                            Who are we celebrating?
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. My dad, Sophie, Uncle Marco…"
                            className="w-full bg-transparent text-slate-800 placeholder-slate-300 text-xl font-light focus:outline-none leading-relaxed"
                        />
                    </MotionDiv>

                    {/* Field: Hobbies */}
                    <MotionDiv variants={itemVariants} className="px-7 py-6 border-b border-slate-100">
                        <label className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                            <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center">
                                <Heart className="w-3 h-3 text-blue-500" />
                            </div>
                            Their passions &amp; hobbies
                        </label>
                        <textarea
                            value={hobbies}
                            onChange={(e) => setHobbies(e.target.value)}
                            placeholder="e.g. Tennis on weekends, making espresso, hiking mountain trails, reading sci-fi…"
                            rows={3}
                            className="w-full bg-transparent text-slate-700 placeholder-slate-300 text-base font-light focus:outline-none resize-none leading-relaxed"
                        />
                    </MotionDiv>

                    {/* Field: Quirky fun fact */}
                    <MotionDiv variants={itemVariants} className="px-7 py-6 border-b border-slate-100">
                        <label className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                            <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center">
                                <Star className="w-3 h-3 text-amber-500" />
                            </div>
                            Something quirky or fun <span className="text-slate-300 normal-case tracking-normal font-normal ml-1">— optional</span>
                        </label>
                        <textarea
                            value={quirk}
                            onChange={(e) => setQuirk(e.target.value)}
                            placeholder="e.g. Obsessed with cats, refuses to use an alarm clock, collects vintage maps…"
                            rows={2}
                            className="w-full bg-transparent text-slate-700 placeholder-slate-300 text-base font-light focus:outline-none resize-none leading-relaxed"
                        />
                    </MotionDiv>

                    {/* Field: Occasion */}
                    <MotionDiv variants={itemVariants} className="px-7 py-6">
                        <label className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                            <div className="w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center">
                                <Gift className="w-3 h-3 text-rose-400" />
                            </div>
                            Occasion <span className="text-slate-300 normal-case tracking-normal font-normal ml-1">— optional</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {OCCASIONS.filter(o => o).map((o) => (
                                <button
                                    key={o}
                                    type="button"
                                    onClick={() => setOccasion(prev => prev === o ? '' : o)}
                                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${occasion === o
                                            ? 'bg-purple-600 border-purple-600 text-white shadow-sm shadow-purple-200'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-purple-300 hover:text-purple-600'
                                        }`}
                                >
                                    {o}
                                </button>
                            ))}
                        </div>
                    </MotionDiv>

                    {/* Footer */}
                    <MotionDiv variants={itemVariants} className="px-7 pb-8 pt-2 flex items-center justify-between">
                        <p className="text-xs text-slate-400 font-light max-w-[200px]">
                            The more detail you share, the better the result ✦
                        </p>
                        <button
                            type="submit"
                            disabled={!canSubmit || isGenerating}
                            className={`group relative overflow-hidden flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base transition-all duration-300 shadow-lg ${!canSubmit || isGenerating
                                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                                    : 'bg-gradient-to-br from-purple-600 to-violet-700 text-white hover:shadow-purple-200/80 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0'
                                }`}
                        >
                            {/* shine effect */}
                            {canSubmit && !isGenerating && (
                                <span className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                            )}
                            <span className="relative z-10 flex items-center gap-2.5">
                                {isGenerating ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                                        Crystallizing…
                                    </>
                                ) : (
                                    <>
                                        Crystallize Data
                                        <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform duration-500" />
                                    </>
                                )}
                            </span>
                        </button>
                    </MotionDiv>
                </form>
            </MotionDiv>
        </div>
    );
}
