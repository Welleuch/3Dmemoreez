import { Suspense, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
    OrbitControls,
    PerspectiveCamera,
    Text,
    Stage
} from '@react-three/drei';
import { ChevronLeft, ArrowRight, Type, Box, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

function PlaceholderModel() {
    const meshRef = useRef();

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (meshRef.current) {
            meshRef.current.position.y = Math.sin(t) * 0.1;
        }
    });

    return (
        <mesh ref={meshRef} castShadow receiveShadow>
            <torusKnotGeometry args={[1, 0.4, 256, 64]} />
            <meshStandardMaterial
                color="#8b5cf6"
                roughness={0.1}
                metalness={0.9}
            />
        </mesh>
    );
}

export default function ThreeSceneViewer({ selectedConcept, onNext, onBack }) {
    const [engravingText, setEngravingText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFinalize = () => {
        setIsProcessing(true);
        setTimeout(() => {
            setIsProcessing(false);
            onNext();
        }, 3000);
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-4 animate-fade-in">
            <div className="flex flex-col gap-12">
                {/* Header Info */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 mb-3 block">Stage 03 • 3D Studio</span>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter italic">{selectedConcept?.title}</h2>
                    </div>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-3 text-white/30 hover:text-white transition-all px-10 py-4 rounded-full border border-white/5 hover:bg-white/5 group"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Alternate Concept</span>
                    </button>
                </div>

                {/* Main Viewport Container */}
                <div className="relative group">
                    <div className="h-[600px] md:h-[750px] rounded-[3rem] md:rounded-[4rem] bg-[#07090d] border border-white/5 overflow-hidden shadow-2xl relative">
                        <Canvas shadows gl={{ antialias: true }}>
                            <PerspectiveCamera makeDefault position={[4, 4, 4]} fov={40} />
                            <Suspense fallback={null}>
                                <Stage environment="city" intensity={0.5} contactShadow={{ opacity: 0.6, blur: 3 }}>
                                    <PlaceholderModel />
                                    {engravingText && (
                                        <Text
                                            position={[0, -1.8, 0]}
                                            fontSize={0.2}
                                            color="white"
                                            font="https://fonts.gstatic.com/s/outfit/v11/QGYxz_WzptA6326dX55uRf8.woff"
                                        >
                                            {engravingText.toUpperCase()}
                                        </Text>
                                    )}
                                </Stage>
                            </Suspense>
                            <OrbitControls enablePan={false} minDistance={3} maxDistance={10} autoRotate autoRotateSpeed={0.4} />
                        </Canvas>

                        {/* Top Left Floating Stats */}
                        <div className="absolute top-8 left-8 md:top-10 md:left-10 flex flex-col gap-4 pointer-events-none">
                            <div className="glass px-6 py-4 rounded-[2rem] border border-white/10 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/20 shadow-xl">
                                    <img src={selectedConcept?.url} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Crystallized</p>
                                    <h4 className="text-sm font-black text-white truncate max-w-[120px]">{selectedConcept?.title}</h4>
                                </div>
                            </div>
                        </div>

                        {/* Top Right Controls */}
                        <div className="absolute top-8 right-8 md:top-10 md:right-10 w-full max-w-[280px]">
                            <div className="glass p-10 rounded-[2.5rem] border border-white/10 backdrop-blur-2xl">
                                <label className="flex items-center gap-2 text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4">
                                    <Type className="w-3 h-3" />
                                    Cortex Engraving
                                </label>
                                <input
                                    type="text"
                                    value={engravingText}
                                    onChange={(e) => setEngravingText(e.target.value)}
                                    placeholder="SENTIMENT..."
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-5 text-sm font-black text-white placeholder-white/5 focus:outline-none focus:border-primary tracking-widest transition-all"
                                    maxLength={20}
                                />
                            </div>
                        </div>

                        {/* Bottom Stats Overlay */}
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 px-10 py-5 glass rounded-full border border-white/10 pointer-events-none whitespace-nowrap">
                            <div className="flex items-center gap-3">
                                <Box className="w-4 h-4 text-primary" />
                                <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">FDM RIGIDITY OK</span>
                            </div>
                            <div className="w-px h-4 bg-white/10" />
                            <div className="flex items-center gap-3">
                                <Zap className="w-4 h-4 text-green-400" />
                                <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">TOPOLOGY PURIFIED</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Final CTA */}
                <div className="flex flex-col items-center pt-16 md:pt-24">
                    <motion.button
                        onClick={handleFinalize}
                        disabled={isProcessing}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`group relative overflow-hidden px-20 md:px-40 py-8 md:py-10 rounded-full font-black text-base md:text-xl transition-all duration-700 ${isProcessing
                            ? 'bg-white/5 text-white/10 cursor-not-allowed'
                            : 'bg-white text-black tracking-[0.4em] uppercase shadow-[0_20px_60px_rgba(255,255,255,0.15)]'
                            }`}
                    >
                        <div className="relative z-10 flex items-center gap-6">
                            {isProcessing ? (
                                <>
                                    <div className="w-6 h-6 border-2 border-white/10 border-t-white rounded-full animate-spin" />
                                    ENGINEERING...
                                </>
                            ) : (
                                <>
                                    Finalize Print
                                    <ArrowRight className="w-6 h-6 md:w-8 md:h-8 group-hover:translate-x-2 transition-transform duration-500" />
                                </>
                            )}
                        </div>
                    </motion.button>
                    <p className="mt-12 text-[10px] font-black text-white/10 tracking-[0.8em] uppercase">Ready for export to .3MF</p>
                </div>
            </div>
        </div>
    );
}
