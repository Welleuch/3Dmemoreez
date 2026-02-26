import { useState, useRef, useEffect } from 'react';
import { Sparkles, User, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FactsInputForm({ onSubmit, isGenerating, initialData }) {
    // Check if initial data has meaningful content (ignoring empty strings)
    const meaningfulHobbies = initialData?.hobbies?.filter(h => h && h.trim().length > 0) || [];
    const hasInitialData = meaningfulHobbies.length > 0;
    const initialText = meaningfulHobbies.join("\n");

    const [messages, setMessages] = useState([
        { id: 1, role: 'system', content: "Hi! Who are we celebrating today?" }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [step, setStep] = useState(0); // 0: waiting for subject, 1: waiting for story, 2: ready to crystallize
    const [subject, setSubject] = useState("");
    const [story, setStory] = useState("");
    const messagesEndRef = useRef(null);

    // If there is meaningful initial data (e.g., coming back from a later step), pre-fill the chat
    useEffect(() => {
        if (hasInitialData && step === 0) {
            setMessages([
                { id: 1, role: 'system', content: "Hi! Who are we celebrating today?" },
                { id: 2, role: 'user', content: "Recovered Session" },
                { id: 3, role: 'system', content: "Great! Tell me more about them. What are their hobbies, defining traits, favorite memories, or pets? Let's make it special." },
                { id: 4, role: 'user', content: initialText },
                { id: 5, role: 'system', content: "Got it! Feel free to crystallize this concept, or adjust your story below." }
            ]);
            setSubject("Recovered");
            setStory(initialText);
            setStep(2);
        }
    }, [hasInitialData, initialText, step]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e) => {
        e?.preventDefault();
        if (!inputValue.trim()) return;

        const newUserMsg = { id: Date.now(), role: 'user', content: inputValue.trim() };
        setMessages(prev => [...prev, newUserMsg]);

        const currentInput = inputValue;
        setInputValue("");

        if (step === 0) {
            setSubject(currentInput);
            setStep(1);
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    role: 'system',
                    content: "Wonderful! Now tell me their story. What are their passions, hobbies, unique traits, or pets? (You can type it all in one go)."
                }]);
            }, 600);
        } else if (step === 1 || step === 2) {
            // Allow them to append/update the story even if in step 2
            setStory(prev => prev ? prev + "\n" + currentInput : currentInput);
            setStep(2);
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    role: 'system',
                    content: "Noted! Whenever you're ready, click 'Crystallize Form' to generate the concepts."
                }]);
            }, 600);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleCrystallize = () => {
        if (!subject.trim() && !story.trim()) {
            return;
        }
        const combinedPayload = [
            `Subject: ${subject}`,
            `Story: ${story}`
        ];
        onSubmit({ hobbies: combinedPayload });
    };

    return (
        <div className="w-full max-w-4xl mx-auto px-4 py-8 md:py-12 flex flex-col items-center">
            <div className="text-center mb-10">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    <h2 className="text-3xl md:text-5xl font-light mb-3 text-slate-800 tracking-tight">
                        Start with a Story
                    </h2>
                    <p className="text-slate-500 text-base md:text-xl font-light leading-relaxed max-w-xl mx-auto">
                        Tell us about the person you want to celebrate.
                    </p>
                </motion.div>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="w-full bg-white/60 backdrop-blur-2xl rounded-[2rem] border border-slate-200 shadow-md flex flex-col h-[65vh] min-h-[500px] max-h-[750px] overflow-hidden"
            >
                {/* Messages Area - flex-grow ensures this wrapper expands, and its children scroll */}
                <div className="flex-grow overflow-y-auto p-6 md:p-8 space-y-8 scroll-smooth will-change-scroll">
                    <AnimatePresence initial={false}>
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex gap-3 md:gap-4 max-w-[95%] md:max-w-[85%] ${msg.role === 'user' ? 'ml-auto justify-end' : ''}`}
                            >
                                {msg.role === 'system' && (
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 mt-1">
                                        <Sparkles className="w-5 h-5 text-primary" />
                                    </div>
                                )}

                                <div className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : ''}`}>
                                    <span className={`text-[10px] md:text-xs font-semibold uppercase tracking-widest text-slate-400 ${msg.role === 'user' ? 'mr-2' : 'ml-2'}`}>
                                        {msg.role === 'system' ? '3Dmemoreez AI' : 'You'}
                                    </span>
                                    <div className={`px-5 py-4 md:px-6 md:py-4 rounded-[1.5rem] font-light text-base md:text-lg leading-relaxed shadow-sm flex flex-col justify-center min-h-[40px] md:min-h-[48px] ${msg.role === 'user'
                                            ? 'bg-slate-800 text-white rounded-tr-sm'
                                            : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm'
                                        }`}>
                                        {msg.content.split('\n').map((line, i) => (
                                            <span key={i} className="block min-h-[1.2rem]">
                                                {line}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {msg.role === 'user' && (
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 mt-1">
                                        <User className="w-5 h-5 text-slate-500" />
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <div ref={messagesEndRef} className="h-4 shrink-0" />
                </div>

                {/* Input Area / Action Area - shrink-0 is CRITICAL here to prevent Flexbox from squishing this div! */}
                <div className="p-4 md:p-6 bg-white/80 border-t border-slate-100 backdrop-blur-xl shrink-0">
                    <div className="relative max-w-4xl mx-auto flex items-end gap-3 bg-white rounded-3xl border border-slate-200 shadow-sm p-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={step === 0 ? "Type their name..." : "Share their story or add more details..."}
                            className="w-full bg-transparent px-4 py-3 md:py-4 text-slate-700 placeholder-slate-400 focus:outline-none font-light text-base md:text-lg resize-none min-h-[56px] max-h-[120px]"
                            rows={1}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!inputValue.trim() || isGenerating}
                            className="w-12 h-12 shrink-0 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-300 transition-colors mb-0.5 mr-0.5 shadow-sm"
                        >
                            <ArrowUp className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex justify-between items-center mt-4 px-2 min-h-[48px]">
                        <span className="text-[11px] md:text-xs text-slate-400 font-light ml-2 hidden sm:block">
                            Press <kbd className="font-sans px-1 py-0.5 bg-slate-100 rounded">Enter</kbd> to send
                        </span>

                        <AnimatePresence>
                            {step >= 2 && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onClick={handleCrystallize}
                                    disabled={isGenerating}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`group relative overflow-hidden px-8 py-3 md:px-10 md:py-3.5 rounded-full shrink-0 font-medium text-sm md:text-base transition-all duration-300 shadow-sm ml-auto ${isGenerating
                                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                            : 'bg-primary text-white hover:bg-primary-hover shadow-md hover:shadow-lg'
                                        }`}
                                >
                                    <div className="relative z-10 flex items-center justify-center gap-2">
                                        {isGenerating ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                                                Crystallizing...
                                            </>
                                        ) : (
                                            <>
                                                Crystallize Data
                                                <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform duration-500 shrink-0" />
                                            </>
                                        )}
                                    </div>
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
