import { Suspense, useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import {
    OrbitControls,
    PerspectiveCamera,
    Text,
    Stage,
    Float,
    Html
} from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import * as THREE from 'three';
import { ChevronLeft, ArrowRight, Type, Box, Zap, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8787'
    : 'https://3d-memoreez-orchestrator.walid-elleuch.workers.dev';

import { getManifold, createPedestal } from '../lib/manifold';

function Pedestal({ modelBounds, text }) {
    const [geometry, setGeometry] = useState(null);
    const manifoldRef = useRef(null);

    const pedestalHeight = 0.4;
    const padding = 0.5;

    useEffect(() => {
        async function init() {
            const Manifold = await getManifold();
            manifoldRef.current = Manifold;

            // Create a slightly larger, more elegant pedestal
            let pedestal = createPedestal(Manifold, modelBounds, padding, pedestalHeight);

            const mesh = pedestal.getMesh();
            const threeGeom = new THREE.BufferGeometry();
            threeGeom.setAttribute('position', new THREE.BufferAttribute(mesh.vertProperties, 3));
            threeGeom.setIndex(new THREE.BufferAttribute(mesh.triVerts, 1));
            threeGeom.computeVertexNormals();

            setGeometry(threeGeom);
        }
        if (modelBounds) init();
    }, [modelBounds, text, padding, pedestalHeight]);

    if (!geometry) return null;

    // Calculate center of front face for text
    const { min, max } = modelBounds;
    const centerX = (min.x + max.x) / 2;
    const centerZ = (min.z + max.z) / 2;
    const frontZ = (max.z - min.z) / 2 + padding + centerZ;
    const textY = min.y - pedestalHeight / 2;

    return (
        <group>
            <mesh geometry={geometry} receiveShadow castShadow>
                <meshStandardMaterial
                    color="#111111"
                    roughness={0.1}
                    metalness={0.9}
                />
            </mesh>

            {text && (
                <Text
                    position={[centerX, textY, frontZ + 0.01]} // Tiny offset to prevent z-fighting
                    fontSize={0.12}
                    color="#8b5cf6"
                    font="https://fonts.gstatic.com/s/outfit/v11/QGYxz_WzptA6326dX55uRf8.woff"
                    anchorX="center"
                    anchorY="middle"
                    rotation={[0, 0, 0]}
                    maxWidth={(max.x - min.x) + padding}
                >
                    {text.toUpperCase()}
                    <meshStandardMaterial
                        color="#8b5cf6"
                        emissive="#8b5cf6"
                        emissiveIntensity={0.8}
                    />
                </Text>
            )}
        </group>
    );
}

function AIModel({ url, onLoaded }) {
    const geom = useLoader(STLLoader, url);
    const meshRef = useRef();

    useEffect(() => {
        if (geom && onLoaded) {
            geom.computeBoundingBox();
            onLoaded(geom.boundingBox);
        }
    }, [geom, onLoaded]);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (meshRef.current) {
            meshRef.current.rotation.y = t * 0.1;
        }
    });

    return (
        <mesh ref={meshRef} geometry={geom} castShadow receiveShadow>
            <meshStandardMaterial
                color="#e5e7eb"
                roughness={0.3}
                metalness={0.4}
            />
        </mesh>
    );
}

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
                transparent
                opacity={0.3}
            />
        </mesh>
    );
}

export default function ThreeSceneViewer({ selectedConcept, sessionId, onNext, onBack }) {
    const [engravingText, setEngravingText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState('processing'); // processing, completed, failed
    const [stlUrl, setStlUrl] = useState(null);
    const [modelBounds, setModelBounds] = useState(null);

    // Polling for 3D Model Status
    useEffect(() => {
        if (status === 'completed' || status === 'failed') return;

        const poll = async () => {
            try {
                console.log("[POLLING] Checking status for session:", sessionId, "asset:", selectedConcept?.id);
                const assetIdParam = selectedConcept?.id ? `&asset_id=${selectedConcept.id}` : '';
                const resp = await fetch(`${API_BASE_URL}/api/session/status?session_id=${sessionId}${assetIdParam}`);
                const data = await resp.json();
                console.log("[POLLING] Status response:", data);

                if (data.status === 'completed' && data.stl_r2_path) {
                    setStatus('completed');
                    // stl_r2_path is the R2 key e.g. "models___<session>___<asset>.stl"
                    // Worker serves it at /api/models/<key>
                    setStlUrl(`${API_BASE_URL}/api/models/${data.stl_r2_path}`);
                } else if (data.status === 'failed') {
                    setStatus('failed');
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        };

        const interval = setInterval(poll, 3000);
        return () => clearInterval(interval);
    }, [sessionId, status]);

    const handleFinalize = () => {
        setIsProcessing(true);
        setTimeout(() => {
            setIsProcessing(false);
            onNext();
        }, 2000);
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
                        <Canvas shadows gl={{ antialias: true, alpha: true }}>
                            <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={35} />

                            {/* Atmospheric Lighting */}
                            <color attach="background" args={['#07090d']} />
                            <fog attach="fog" args={['#07090d', 5, 15]} />

                            <ambientLight intensity={0.4} />
                            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
                            <pointLight position={[-10, -10, -10]} intensity={1} color="#8b5cf6" />

                            <Suspense fallback={null}>
                                <Stage
                                    environment="city"
                                    intensity={0.6}
                                    contactShadow={{ opacity: 0.4, blur: 2 }}
                                    adjustCamera={false}
                                >
                                    {status === 'completed' && stlUrl ? (
                                        <motion.group
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 2, ease: "easeOut" }}
                                        >
                                            <AIModel url={stlUrl} onLoaded={setModelBounds} />
                                            {modelBounds && <Pedestal modelBounds={modelBounds} text={engravingText} />}
                                        </motion.group>
                                    ) : (
                                        <PlaceholderModel />
                                    )}
                                </Stage>
                            </Suspense>

                            <OrbitControls
                                enablePan={false}
                                minDistance={4}
                                maxDistance={12}
                                autoRotate={status !== 'completed'}
                                autoRotateSpeed={0.5}
                                makeDefault
                            />
                        </Canvas>

                        {/* Status Overlay */}
                        {status === 'processing' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
                                <div className="flex flex-col items-center gap-6 p-12 glass rounded-[3rem] border border-white/10">
                                    <div className="relative">
                                        <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                        <Loader2 className="absolute inset-0 m-auto w-8 h-8 text-primary animate-pulse" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-xl font-black tracking-widest uppercase mb-2">Crystallizing</h3>
                                        <p className="text-[10px] font-bold text-white/40 tracking-[0.2em] uppercase">Forging 3D Geometry...</p>
                                    </div>
                                </div>
                            </div>
                        )}

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
                                <Box className={`w-4 h-4 ${status === 'completed' ? 'text-primary' : 'text-white/20'}`} />
                                <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">
                                    {status === 'completed' ? 'FDM RIGIDITY OK' : 'ANALYZING TOPOLOGY'}
                                </span>
                            </div>
                            <div className="w-px h-4 bg-white/10" />
                            <div className="flex items-center gap-3">
                                <Zap className={`w-4 h-4 ${status === 'completed' ? 'text-green-400' : 'text-white/20'}`} />
                                <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">
                                    {status === 'completed' ? 'TOPOLOGY PURIFIED' : 'WAITING FOR AI'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Final CTA */}
                <div className="flex flex-col items-center pt-16 md:pt-24">
                    <motion.button
                        onClick={handleFinalize}
                        disabled={isProcessing || status !== 'completed'}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`group relative overflow-hidden px-20 md:px-40 py-8 md:py-10 rounded-full font-black text-base md:text-xl transition-all duration-700 ${isProcessing || status !== 'completed'
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
                    <p className="mt-12 text-[10px] font-black text-white/10 tracking-[0.8em] uppercase">Ready for export to .STL</p>
                </div>
            </div>
        </div>
    );
}
