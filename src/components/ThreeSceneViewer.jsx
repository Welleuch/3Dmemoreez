import { Suspense, useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import {
    OrbitControls,
    PerspectiveCamera,
    Stage,
    Html
} from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import * as THREE from 'three';
import { ChevronLeft, ArrowRight, Type, Box, Zap, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const API_BASE_URL = 'https://3d-memoreez-orchestrator.walid-elleuch.workers.dev';

import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry';
import { extend } from '@react-three/fiber';
import { createEngravedPedestalCSG } from '../lib/csgEngine';

extend({ RoundedBoxGeometry });

function Pedestal({ modelMesh, modelBounds, line1, line2, onMerged }) {
    const [geometry, setGeometry] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Compute local bounds for consistent positioning between fallback and CSG
    const localBounds = useMemo(() => {
        if (!modelMesh) return modelBounds;
        modelMesh.geometry.computeBoundingBox();
        return modelMesh.geometry.boundingBox;
    }, [modelMesh, modelBounds]);

    useEffect(() => {
        if (!modelMesh || !localBounds) return;

        let active = true;
        async function init() {
            setIsGenerating(true);
            try {
                const size = new THREE.Vector3();
                localBounds.getSize(size);

                const h = Math.max(0.35, size.y * 0.08);
                const p = Math.max(0.35, size.x * 0.12);

                const csgGeom = await createEngravedPedestalCSG(
                    modelMesh,
                    localBounds,
                    line1,
                    line2,
                    p,
                    h
                );

                if (active) {
                    setGeometry(csgGeom);
                    if (onMerged) onMerged();
                }
            } catch (err) {
                console.error("[STUDIO] CSG Failure:", err);
            } finally {
                if (active) setIsGenerating(false);
            }
        }

        const timer = setTimeout(init, 400);
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [modelMesh, localBounds, line1, line2]);

    // Fallback display logic
    const size = new THREE.Vector3();
    if (localBounds) localBounds.getSize(size);
    const boxH = Math.max(0.35, size.y * 0.08);
    const radius = Math.max(size.x, size.z) / 2 + 0.35; // Synced with CSG padding
    const centerX = localBounds ? (localBounds.min.x + localBounds.max.x) / 2 : 0;
    const centerZ = localBounds ? (localBounds.min.z + localBounds.max.z) / 2 : 0;
    const centerY = localBounds ? localBounds.min.y + 0.1 - boxH / 2 : 0;

    return (
        <group>
            {geometry ? (
                <mesh geometry={geometry} receiveShadow castShadow>
                    <meshStandardMaterial
                        color="#e5e7eb"
                        roughness={0.3}
                        metalness={0.4}
                    />
                </mesh>
            ) : (
                <mesh position={[centerX, centerY, centerZ]} receiveShadow castShadow>
                    <cylinderGeometry args={[radius, radius, boxH, 64]} />
                    <meshStandardMaterial
                        color="#e5e7eb"
                        roughness={0.3}
                        metalness={0.4}
                    />
                </mesh>
            )}

            {isGenerating && (
                <Html position={[centerX, centerY + boxH / 2 + 0.2, centerZ]}>
                    <div className="flex items-center gap-2 bg-black/80 px-3 py-1 rounded-full border border-white/10 whitespace-nowrap">
                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        <span className="text-[10px] font-bold text-white/80 tracking-widest italic">Engraving...</span>
                    </div>
                </Html>
            )}
        </group>
    );
}

function AIModel({ url, onLoaded }) {
    const geom = useLoader(STLLoader, url);
    const meshRef = useRef();

    useEffect(() => {
        if (geom) {
            geom.computeBoundingBox();
            const { min, max } = geom.boundingBox;
            const center = new THREE.Vector3();
            geom.boundingBox.getCenter(center);

            // Shift geometry so the bottom is exactly at Y=0 
            // and the object is centered on the X and Z axes.
            geom.translate(-center.x, -min.y, -center.z);
            geom.computeBoundingBox();

            if (onLoaded) {
                onLoaded(geom.boundingBox, meshRef.current);
            }
        }
    }, [geom, url]); // url change should re-trigger this

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

export default function ThreeSceneViewer({ selectedConcept, sessionId, onNext, onBack }) {
    const [line1, setLine1] = useState('');
    const [line2, setLine2] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState('processing');
    const [stlUrl, setStlUrl] = useState(null);
    const [modelData, setModelData] = useState({ bounds: null, mesh: null });

    useEffect(() => {
        if (status === 'completed' || status === 'failed') return;
        const poll = async () => {
            try {
                const assetIdParam = selectedConcept?.id ? `&asset_id=${selectedConcept.id}` : '';
                const resp = await fetch(`${API_BASE_URL}/api/session/status?session_id=${sessionId}${assetIdParam}`);
                const data = await resp.json();
                if (data.status === 'completed' && data.stl_r2_path) {
                    setStatus('completed');
                    setStlUrl(`${API_BASE_URL}/api/models/${data.stl_r2_path}`);
                } else if (data.status === 'failed') {
                    setStatus('failed');
                }
            } catch (err) { console.error("Polling error:", err); }
        };
        const interval = setInterval(poll, 3000);
        return () => clearInterval(interval);
    }, [sessionId, status]);

    const handleFinalize = async () => {
        setIsProcessing(true);
        // We'll pass the estimate and engraving data
        // For final order, we calculate the estimated price once
        const price = 45.00; // Standard price fallback
        onNext({
            printEstimate: { priceBeforeShipping: price },
            line1,
            line2,
            stlUrl
        });
    };

    const [isMerged, setIsMerged] = useState(false);
    const [hasPositioned, setHasPositioned] = useState(false);

    // Reset states when asset changes
    useEffect(() => {
        setIsMerged(false);
        setHasPositioned(false);
    }, [selectedConcept?.id]);

    return (
        <div className="w-full max-w-7xl mx-auto px-4 animate-fade-in">
            <div className="flex flex-col gap-12">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 mb-3 block">Stage 03 • 3D Studio</span>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter italic">{selectedConcept?.title}</h2>
                    </div>
                </div>

                <div className="relative group">
                    <div className="h-[600px] md:h-[750px] rounded-[3rem] md:rounded-[4rem] bg-[#07090d] border border-white/5 overflow-hidden shadow-2xl relative">
                        <Canvas shadows gl={{ antialias: true, alpha: true }}>
                            <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={35} />
                            <color attach="background" args={['#07090d']} />

                            <ambientLight intensity={0.4} />
                            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
                            <pointLight position={[-10, -10, -10]} intensity={1} color="#8b5cf6" />

                            <Suspense fallback={null}>
                                <Stage
                                    environment="city"
                                    intensity={0.6}
                                    contactShadow={{ opacity: 0.4, blur: 2 }}
                                    adjustCamera={!hasPositioned}
                                    center={false}
                                >
                                    {status === 'completed' && stlUrl && (
                                        <group>
                                            {!isMerged && (
                                                <AIModel
                                                    url={stlUrl}
                                                    onLoaded={(bounds, mesh) => {
                                                        setModelData({ bounds, mesh });
                                                        setHasPositioned(true);
                                                    }}
                                                />
                                            )}
                                            {modelData.bounds && (
                                                <Pedestal
                                                    modelMesh={modelData.mesh}
                                                    modelBounds={modelData.bounds}
                                                    line1={line1}
                                                    line2={line2}
                                                    onMerged={() => setIsMerged(true)}
                                                />
                                            )}
                                        </group>
                                    )}
                                </Stage>
                            </Suspense>

                            <OrbitControls
                                enablePan={false}
                                minDistance={4}
                                maxDistance={12}
                                makeDefault
                            />
                        </Canvas>

                        {status === 'processing' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
                                <div className="flex flex-col items-center gap-6 p-12 glass rounded-[3rem] border border-white/10">
                                    <div className="relative">
                                        <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                        <Loader2 className="absolute inset-0 m-auto w-8 h-8 text-primary animate-pulse" />
                                    </div>
                                    <h3 className="text-xl font-black tracking-widest uppercase">Crystallizing...</h3>
                                </div>
                            </div>
                        )}

                        <div className="absolute top-10 right-10 w-full max-w-[280px]">
                            <div className="glass p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-2xl">
                                <label className="flex items-center gap-2 text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4">
                                    <Type className="w-3 h-3" />
                                    Engraving
                                </label>
                                <input
                                    type="text"
                                    value={line1}
                                    onChange={(e) => setLine1(e.target.value)}
                                    placeholder="LINE 1"
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-sm font-black text-white placeholder-white/5 focus:outline-none focus:border-primary tracking-widest transition-all mb-4"
                                />
                                <input
                                    type="text"
                                    value={line2}
                                    onChange={(e) => setLine2(e.target.value)}
                                    placeholder="LINE 2"
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-sm font-black text-white placeholder-white/5 focus:outline-none focus:border-primary tracking-widest transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center pt-8">
                    <motion.button
                        onClick={handleFinalize}
                        disabled={isProcessing || status !== 'completed'}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-20 py-8 rounded-full font-black text-xl transition-all duration-700 ${isProcessing || status !== 'completed'
                            ? 'bg-white/5 text-white/10 cursor-not-allowed'
                            : 'bg-white text-black tracking-[0.4em] uppercase shadow-[0_20px_60px_rgba(255,255,255,0.15)]'
                            }`}
                    >
                        Finalize Print
                    </motion.button>
                </div>
            </div>
        </div>
    );
}
