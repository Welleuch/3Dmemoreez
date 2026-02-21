import { useState } from 'react';
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
    ? 'https://3d-memoreez-orchestrator.walid-elleuch.workers.dev'
    : 'https://3d-memoreez-orchestrator.walid-elleuch.workers.dev';

export default function App() {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({
        hobbies: ['', '', ''],
    });
    const [concepts, setConcepts] = useState([]);
    const [selectedConcept, setSelectedConcept] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

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

                            return (
                                <div key={step.id} className="flex items-center group">
                                    <div className={`flex items-center gap-2 md:gap-3 px-2 md:px-4 py-2 rounded-2xl transition-all duration-500 ${isActive ? 'bg-white/[0.05]' : ''}`}>
                                        <div className={`w-7 h-7 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-bold border-2 transition-all duration-700 ${isActive ? 'border-primary bg-primary shadow-[0_0_20px_rgba(139,92,246,0.5)] text-white scale-110' : isCompleted ? 'border-green-400/50 bg-green-400/20 text-green-400' : 'border-white/10 text-white/20'}`}>
                                            {isCompleted ? '✓' : idx + 1}
                                        </div>
                                        <span className={`hidden sm:inline font-bold text-[11px] md:text-xs uppercase tracking-[0.2em] ${isActive ? 'text-white' : 'text-white/20'}`}>{step.title}</span>
                                    </div>
                                    {idx < STEPS.length - 1 && (
                                        <div className="mx-2 md:mx-4 w-4 md:w-8 h-[2px] bg-white/[0.03] rounded-full overflow-hidden">
                                            <div className={`h-full bg-primary transition-all duration-1000 ${isCompleted ? 'w-full' : 'w-0'}`} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
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
                                        onNext={nextStep}
                                        onBack={prevStep}
                                    />
                                )}
                                {currentStep === 3 && (
                                    <Checkout
                                        selectedConcept={selectedConcept}
                                        onBack={prevStep}
                                    />
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
