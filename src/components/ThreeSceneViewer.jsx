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

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8787'
    : 'https://3d-memoreez-orchestrator.walid-elleuch.workers.dev';

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
                    <div className="flex items-center gap-2 bg-white/90 px-3 py-1 rounded-full border border-slate-200 shadow-sm whitespace-nowrap">
                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        <span className="text-[10px] font-medium text-slate-600 tracking-widest italic">Engraving...</span>
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

                // Find the specific asset we are waiting for
                const currentAsset = data.assets?.find(a => a.id === selectedConcept?.id || a.image_url.includes(selectedConcept?.id));

                if (currentAsset?.status === 'completed' && currentAsset.stl_r2_path) {
                    setStatus('completed');
                    setStlUrl(`${API_BASE_URL}/api/assets/${currentAsset.stl_r2_path}`);
                } else if (currentAsset?.status === 'failed') {
                    setStatus('failed');
                }
            } catch (err) { console.error("Polling error:", err); }
        };
        const interval = setInterval(poll, 3000);
        return () => clearInterval(interval);
    }, [sessionId, status]);

    const handleFinalize = async () => {
        setIsProcessing(true);
        try {
            const resp = await fetch(`${API_BASE_URL}/api/slice`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    session_id: sessionId,
                    asset_id: selectedConcept.id
                })
            });

            if (!resp.ok) throw new Error("Slicing coordination failed");

            const result = await resp.json();

            // Formula from TODO: (material_grams * 0.03) + 12 service + 5 shipping (est)
            // But we'll let Checkout handle the subtotal display
            onNext({
                sessionId: sessionId,
                printEstimate: result.stats,
                line1,
                line2,
                stlUrl,
                gcode_r2_path: result.gcode_r2_path
            });
        } catch (err) {
            console.error("Finalization Error:", err);
            // Fallback for demo stability
            onNext({
                sessionId: sessionId,
                printEstimate: { total_material_grams: 120, total_material_cost: 3.60, print_time_display: "9h 30m" },
                line1,
                line2,
                stlUrl
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const [isMerged, setIsMerged] = useState(false);
    const [hasPositioned, setHasPositioned] = useState(false);

    // Reset states when asset changes
    useEffect(() => {
        setIsMerged(false);
        setHasPositioned(false);
    }, [selectedConcept?.id]);

    return (
        <div className="w-full max-w-7xl mx-auto px-4 animate-fade-in py-8">
            <div className="flex flex-col gap-8 md:gap-12">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-center md:text-left">
                        <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400 mb-2 block">Stage 03 • 3D Studio</span>
                        <h2 className="text-3xl md:text-5xl font-light tracking-tight text-slate-800">{selectedConcept?.title}</h2>
                    </div>
                    <button
                        onClick={onBack}
                        className="inline-flex items-center gap-3 text-slate-500 hover:text-slate-900 transition-all px-6 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 shadow-sm group bg-white"
                    >
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-xs font-medium uppercase tracking-widest">Back to Concepts</span>
                    </button>
                </div>

                <div className="relative group">
                    <div className="h-[500px] md:h-[650px] rounded-3xl bg-slate-50 border border-slate-200 overflow-hidden shadow-inner relative">
                        <Canvas shadows gl={{ antialias: true, alpha: true }}>
                            <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={35} />
                            <color attach="background" args={['#f8fafc']} />

                            <ambientLight intensity={0.5} />
                            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1.5} castShadow />
                            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />

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
                            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-10">
                                <div className="flex flex-col items-center gap-6 p-10 bg-white/90 rounded-3xl border border-slate-200 shadow-xl">
                                    <div className="relative">
                                        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                        <Loader2 className="absolute inset-0 m-auto w-6 h-6 text-primary animate-pulse" />
                                    </div>
                                    <h3 className="text-lg font-medium tracking-wide text-slate-800">Crystallizing Blueprint...</h3>
                                </div>
                            </div>
                        )}

                        <div className="absolute top-8 right-8 w-full max-w-[280px]">
                            <div className="bg-white/80 p-6 rounded-2xl border border-slate-200 shadow-sm backdrop-blur-xl">
                                <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-4">
                                    <Type className="w-3 h-3" />
                                    Pedestal Engraving
                                </label>
                                <input
                                    type="text"
                                    value={line1}
                                    onChange={(e) => setLine1(e.target.value)}
                                    placeholder="LINE 1"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all mb-3 shadow-sm"
                                />
                                <input
                                    type="text"
                                    value={line2}
                                    onChange={(e) => setLine2(e.target.value)}
                                    placeholder="LINE 2"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-6 pt-6">
                    <motion.button
                        onClick={handleFinalize}
                        disabled={isProcessing || status !== 'completed'}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-16 py-5 rounded-xl font-medium text-lg transition-all shadow-sm ${isProcessing || status !== 'completed'
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md'
                            }`}
                    >
                        {isProcessing ? 'Slicing Geometry...' : 'Finalize Print'}
                    </motion.button>
                    <button
                        onClick={onBack}
                        className="text-slate-400 hover:text-slate-600 text-xs font-medium tracking-wide transition-all underline decoration-slate-200 underline-offset-4"
                    >
                        Adjust Blueprint Sentiment
                    </button>
                </div>
            </div>
        </div>
    );
}
