import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Type,
    Layers,
    Box,
    CreditCard,
    ChevronRight,
    ChevronLeft,
    Sparkles
} from 'lucide-react';

// Components (will be moved to separate files)
import FactsInputForm from './components/FactsInputForm';
import ConceptCardGrid from './components/ConceptCardGrid';
import ThreeSceneViewer from './components/ThreeSceneViewer';
import Checkout from './components/Checkout';

const STEPS = [
    { id: 'input', title: 'Sentiment', icon: Type },
    { id: 'selection', title: 'Concepts', icon: Layers },
    { id: 'view', title: '3D Studio', icon: Box },
    { id: 'checkout', title: 'Checkout', icon: CreditCard },
];

// Always use the deployed worker — wrangler dev --remote can be slow to start
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8787'
    : 'https://3d-memoreez-orchestrator.walid-elleuch.workers.dev';

export default function App() {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({
        hobbies: ['', '', ''],
    });
    const [concepts, setConcepts] = useState([]);
    const [selectedConcept, setSelectedConcept] = useState(null);
    const [sessionId, setSessionId] = useState(() => localStorage.getItem('3dmemoreez_session_id'));
    const [isGenerating, setIsGenerating] = useState(false);
    const [finalizedData, setFinalizedData] = useState(null);

    // Initial load: check for Stripe success redirect OR restore session
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);

        // 1. Handle Stripe Success
        if (urlParams.get('session_id') && window.location.pathname === '/checkout/success') {
            setCurrentStep(4);
            return;
        }

        // 2. Restore Session
        const savedSessionId = localStorage.getItem('3dmemoreez_session_id');
        if (savedSessionId && currentStep === 0) {
            const recoverSession = async () => {
                try {
                    const resp = await fetch(`${API_BASE_URL}/api/session/status?session_id=${savedSessionId}`);
                    if (!resp.ok) throw new Error("Session expired or invalid");

                    const { session, assets } = await resp.json();

                    // Re-hydrate state
                    setFormData({ hobbies: session.hobbies });
                    setSessionId(savedSessionId);

                    if (assets && assets.length > 0) {
                        setConcepts(assets.map(a => ({
                            id: a.id || a.image_url.split('___').pop().split('.')[0],
                            url: a.image_url.startsWith('http') ? a.image_url : `${API_BASE_URL}${a.image_url}`,
                            title: a.title || "Recovered Concept",
                            type: a.type || "Literal",
                            score: 95
                        })));
                    }

                    // Map step string to index
                    const stepMap = { 'input': 0, 'selection': 1, 'view': 2, 'checkout': 3 };
                    const targetStep = stepMap[session.current_step] || 0;

                    // If a concept was selected, ensure it's set
                    if (session.selected_concept_id && assets) {
                        const selected = assets.find(a => a.id === session.selected_concept_id || a.image_url.includes(session.selected_concept_id));
                        if (selected) {
                            setSelectedConcept({
                                id: session.selected_concept_id,
                                url: selected.image_url.startsWith('http') ? selected.image_url : `${API_BASE_URL}${selected.image_url}`,
                                title: selected.title || "Selected Concept"
                            });
                        }
                    }

                    setCurrentStep(targetStep);
                } catch (err) {
                    console.warn("Session recovery failed:", err);
                    localStorage.removeItem('3dmemoreez_session_id');
                }
            };
            recoverSession();
        }
    }, []);

    // Save step to localStorage
    useEffect(() => {
        if (sessionId) {
            localStorage.setItem('3dmemoreez_session_id', sessionId);
        }
    }, [sessionId, currentStep]);

    const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

    const handleFinalize = (data) => {
        setFinalizedData(data);
        nextStep();
    };

    const handleInputSubmit = async (data) => {
        setFormData(data);
        setIsGenerating(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hobbies: data.hobbies })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Generation failed');
            }

            const result = await response.json();
            setConcepts(result.concepts);
            setSessionId(result.session_id);
            localStorage.setItem('3dmemoreez_session_id', result.session_id);
            setIsGenerating(false);
            nextStep();
        } catch (error) {
            console.error('Generation Error:', error);
            setIsGenerating(false);
            alert(`Failed to crystallize form: ${error.message}`);
        }
    };

    const handleConceptSelect = async (concept) => {
        setSelectedConcept(concept);

        try {
            await fetch(`${API_BASE_URL}/api/session/select`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    concept_id: concept.id,
                    image_url: concept.url
                })
            });
        } catch (error) {
            console.error('Failed to save selection:', error);
        }

        nextStep();
    };

    return (
        <div className="min-h-screen flex flex-col font-sans selection:bg-primary/30 selection:text-white">
            {/* Header / Stepper */}
            <header className="glass sticky top-0 z-50 py-6 md:py-8 px-8 md:px-16 border-b border-white/[0.05]">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 gradient-bg rounded-xl md:rounded-2xl flex items-center justify-center glow-shadow rotate-3 hover:rotate-0 transition-transform duration-500">
                            <Sparkles className="text-white w-5 h-5 md:w-7 md:h-7" />
                        </div>
                        <h1 className="text-xl md:text-3xl font-black tracking-tighter gradient-text leading-none">3Dmemoreez</h1>
                    </div>

                    <nav className="flex items-center gap-3 md:gap-6">
                        {STEPS.map((step, idx) => {
                            const isActive = idx === currentStep;
                            const isCompleted = idx < currentStep;
                            const isClickable = idx < currentStep && currentStep < 4;

                            return (
                                <div key={step.id} className="flex items-center group">
                                    <button
                                        onClick={() => isClickable && setCurrentStep(idx)}
                                        disabled={!isClickable}
                                        className={`flex items-center gap-2 md:gap-3 px-2 md:px-4 py-2 rounded-2xl transition-all duration-500 ${isActive ? 'bg-white/[0.05]' : ''} ${isClickable ? 'hover:bg-white/10 cursor-pointer' : 'cursor-default'}`}
                                    >
                                        <div className={`w-7 h-7 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-bold border-2 transition-all duration-700 ${isActive ? 'border-primary bg-primary shadow-[0_0_20px_rgba(139,92,246,0.5)] text-white scale-110' : isCompleted ? 'border-green-400/50 bg-green-400/20 text-green-400' : 'border-white/10 text-white/20'}`}>
                                            {isCompleted ? '✓' : idx + 1}
                                        </div>
                                        <span className={`hidden sm:inline font-bold text-[11px] md:text-xs uppercase tracking-[0.2em] ${isActive ? 'text-white' : 'text-white/20'}`}>{step.title}</span>
                                    </button>
                                    {idx < STEPS.length - 1 && (
                                        <div className="mx-2 md:mx-4 w-4 md:w-8 h-[2px] bg-white/[0.03] rounded-full overflow-hidden">
                                            <div className={`h-full bg-primary transition-all duration-1000 ${isCompleted ? 'w-full' : 'w-0'}`} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        <button
                            onClick={() => {
                                if (confirm("Start a new gift from scratch? Current progress will be cleared.")) {
                                    localStorage.removeItem('3dmemoreez_session_id');
                                    window.location.href = '/';
                                }
                            }}
                            className="ml-4 p-2 md:px-4 md:py-2 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 transition-all"
                        >
                            Reset
                        </button>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow w-full flex flex-col items-center px-8 md:px-16 section-spacing">
                <div className="w-full max-w-6xl mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, scale: 0.98, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 1.02, y: -30 }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className="w-full flex flex-col items-center"
                        >
                            <div className="w-full">
                                {currentStep === 0 && (
                                    <FactsInputForm
                                        onSubmit={handleInputSubmit}
                                        isGenerating={isGenerating}
                                        initialData={formData}
                                    />
                                )}
                                {currentStep === 1 && (
                                    <ConceptCardGrid
                                        concepts={concepts}
                                        onSelect={handleConceptSelect}
                                        onBack={prevStep}
                                    />
                                )}
                                {currentStep === 2 && (
                                    <ThreeSceneViewer
                                        selectedConcept={selectedConcept}
                                        sessionId={sessionId}
                                        onNext={handleFinalize}
                                        onBack={prevStep}
                                    />
                                )}
                                {currentStep === 3 && (
                                    <Checkout
                                        selectedConcept={selectedConcept}
                                        finalizedData={finalizedData}
                                        onBack={prevStep}
                                    />
                                )}
                                {currentStep === 4 && (
                                    <div className="w-full max-w-2xl mx-auto px-4 animate-fade-in text-center py-20">
                                        <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-500/20 glow-shadow">
                                            <Sparkles className="w-12 h-12 text-green-400" />
                                        </div>
                                        <h2 className="text-5xl font-black mb-6 tracking-tighter italic text-white">Order <span className="text-green-400">Secured</span></h2>
                                        <p className="text-white/60 text-lg md:text-xl font-light leading-relaxed mb-12">
                                            Your 3D blueprint has been transmitted to our slicing engine. We've sent a <strong>confirmation email</strong> to your inbox with your receipt. Production will begin shortly.
                                        </p>
                                        <button
                                            onClick={() => window.location.href = '/'}
                                            className="px-8 py-4 bg-white/5 border border-white/10 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-white/10 transition-colors"
                                        >
                                            Return to Origin
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-12 md:py-20 text-center border-t border-white/[0.03] bg-white/[0.01]">
                <div className="flex items-center justify-center gap-2 mb-4 group cursor-default">
                    <Sparkles className="w-4 h-4 text-primary group-hover:rotate-12 transition-transform" />
                    <span className="text-sm font-bold uppercase tracking-[0.4em] text-white/20">3Dmemoreez</span>
                </div>
                <p className="text-white/10 text-xs font-light tracking-widest">
                    &copy; 2026 • FROM SENTIMENT TO PHYSICAL FORM
                </p>
            </footer>
        </div>
    );
}
