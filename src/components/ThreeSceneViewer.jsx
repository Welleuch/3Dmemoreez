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
import { ChevronLeft, ArrowRight, Type, Box, Zap, Loader2, Printer, Sparkles, Gauge, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8787'
    : 'https://3d-memoreez-orchestrator.walid-elleuch.workers.dev';

import { createEngravedPedestalCSG } from '../lib/csgEngine';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';

// --- CONFIG & CONSTANTS ---
const FUN_FACTS = [
    "Your sculpture is being carved from over 800,000 digital voxels.",
    "The AI runs 50 diffusion steps to capture every detail of your concept.",
    "No two models are identical – this geometry is unique to your gift.",
    "Your 3D blueprint will contain roughly 200,000 precise triangles.",
    "Real master sculptors take weeks; our AI does it in under a minute.",
    "Calculated precision: 0.125mm for maximum print quality."
];

function createRoundedCylinderGeometry(radius, height, bevel, segments = 64) {
    const points = [];
    const innerRadius = radius - bevel;
    const halfH = height / 2;
    points.push(new THREE.Vector2(0, -halfH));
    points.push(new THREE.Vector2(innerRadius, -halfH));
    for (let i = 1; i <= 8; i++) {
        const angle = (i / 8) * Math.PI * 0.5;
        points.push(new THREE.Vector2(innerRadius + Math.sin(angle) * bevel, -halfH + bevel - Math.cos(angle) * bevel));
    }
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 0.5 + Math.PI * 0.5;
        points.push(new THREE.Vector2(innerRadius + Math.sin(angle) * bevel, halfH - bevel - Math.cos(angle) * bevel));
    }
    points.push(new THREE.Vector2(innerRadius, halfH));
    points.push(new THREE.Vector2(0, halfH));
    return new THREE.LatheGeometry(points, segments);
}

// Separate component for the fun facts to avoid re-rendering the whole UI too often
function FunFactsLoader({ progress }) {
    const [factIndex, setFactIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setFactIndex(prev => (prev + 1) % FUN_FACTS.length);
        }, 6000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center gap-6 p-10 bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm text-center">
            <div className="relative">
                <div className="w-20 h-20 border-4 border-slate-100 border-t-primary rounded-full animate-spin" />
                <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-primary animate-pulse" />
            </div>
            <div className="min-h-[80px]">
                <h3 className="text-xl font-semibold text-slate-800 mb-2">
                    {progress < 30 ? "Analyzing Vision..." :
                        progress < 60 ? "Sculpting Geometry..." :
                            progress < 90 ? "Finalizing 3D Blueprint..." :
                                "Polishing Details..."}
                </h3>
                <AnimatePresence mode="wait">
                    <motion.p
                        key={factIndex}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-sm text-slate-500 italic"
                    >
                        "{FUN_FACTS[factIndex]}"
                    </motion.p>
                </AnimatePresence>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-4">
                <div
                    className="h-full bg-primary transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}

function Pedestal({ modelMesh, modelBounds, line1, line2, onMerged, isolationMode = false }) {
    const [geometry, setGeometry] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Compute local bounds
    const localBounds = useMemo(() => {
        if (isolationMode) {
            // Default bounds for a 2x2x4 object during isolation config
            const b = new THREE.Box3(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 4, 1));
            return b;
        }
        if (!modelMesh) return modelBounds;
        modelMesh.geometry.computeBoundingBox();
        return modelMesh.geometry.boundingBox;
    }, [modelMesh, modelBounds, isolationMode]);

    useEffect(() => {
        if (!localBounds) return;

        let active = true;
        async function init() {
            setIsGenerating(true);
            try {
                const size = new THREE.Vector3();
                localBounds.getSize(size);

                const h = Math.max(0.35, size.y * 0.08);
                const p = Math.max(0.35, size.x * 0.12);

                const csgGeom = await createEngravedPedestalCSG(
                    isolationMode ? null : modelMesh,
                    localBounds,
                    line1,
                    line2,
                    p,
                    h
                );

                if (active) {
                    setGeometry(csgGeom);
                    if (onMerged) onMerged(csgGeom);
                }
            } catch (err) {
                console.error("[STUDIO] CSG Failure:", err);
            } finally {
                if (active) setIsGenerating(false);
            }
        }

        const timer = setTimeout(init, 300);
        return () => { active = false; clearTimeout(timer); };
    }, [modelMesh, localBounds, line1, line2, isolationMode]);

    const size = new THREE.Vector3();
    if (localBounds) localBounds.getSize(size);
    const boxH = Math.max(0.35, size.y * 0.08);
    const radius = Math.max(size.x, size.z) / 2 + 0.35;
    const centerX = localBounds ? (localBounds.min.x + localBounds.max.x) / 2 : 0;
    const centerZ = localBounds ? (localBounds.min.z + localBounds.max.z) / 2 : 0;
    const centerY = localBounds ? localBounds.min.y + 0.05 - boxH / 2 : 0;

    const roundedCylinderFallback = useMemo(() => createRoundedCylinderGeometry(radius, boxH, 0.05), [radius, boxH]);

    return (
        <group>
            {geometry ? (
                <mesh geometry={geometry} receiveShadow castShadow>
                    <meshStandardMaterial color="#e5e7eb" roughness={0.3} metalness={0.4} />
                </mesh>
            ) : (
                <mesh position={[centerX, centerY, centerZ]} receiveShadow castShadow geometry={roundedCylinderFallback}>
                    <meshStandardMaterial color="#e5e7eb" roughness={0.3} metalness={0.4} />
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
    const [revealProgress, setRevealProgress] = useState(0);

    useEffect(() => {
        if (geom) {
            geom.computeBoundingBox();
            const { min, max } = geom.boundingBox;
            const center = new THREE.Vector3();
            geom.boundingBox.getCenter(center);

            if (Math.abs(center.x) > 0.001 || Math.abs(min.y) > 0.001 || Math.abs(center.z) > 0.001) {
                geom.translate(-center.x, -min.y, -center.z);
                geom.computeBoundingBox();
            }

            if (onLoaded) onLoaded(geom.boundingBox, meshRef.current);

            // Trigger landing animation
            setRevealProgress(0);
        }
    }, [geom, url]);

    useFrame((state) => {
        if (meshRef.current) {
            if (revealProgress < 1) {
                setRevealProgress(prev => Math.min(prev + 0.02, 1));
            }
            // Figurine "lands" from above (Y: 2.0 -> 0.0)
            meshRef.current.position.y = THREE.MathUtils.lerp(2, 0, revealProgress);
            meshRef.current.material.opacity = revealProgress;
            meshRef.current.material.transparent = true;
        }
    });

    return (
        <mesh ref={meshRef} geometry={geom} castShadow receiveShadow>
            <meshStandardMaterial color="#e5e7eb" roughness={0.3} metalness={0.4} />
        </mesh>
    );
}

export default function ThreeSceneViewer({ selectedConcept, sessionId, line1, setLine1, line2, setLine2, onNext, onBack }) {
    // UI Stages: 'PEDESTAL_STUDIO' or 'MODEL_PREVIEW'
    const [uiStage, setUiStage] = useState('PEDESTAL_STUDIO');
    const [isTransitioning, setIsTransitioning] = useState(false);

    const [status, setStatus] = useState('processing');
    const [stlUrl, setStlUrl] = useState(null);
    const [modelData, setModelData] = useState({ bounds: null, mesh: null });
    const [mergedGeometry, setMergedGeometry] = useState(null);

    // Pre-slicing states
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [bgJobStatus, setBgJobStatus] = useState("IDLE");
    const [bgJobResult, setBgJobResult] = useState(null);

    // Mesh Gen progress
    const [meshProgress, setMeshProgress] = useState(0);

    // Silent Polling for Mesh
    useEffect(() => {
        if (status === 'completed' || status === 'failed') return;
        const poll = async () => {
            try {
                const assetIdParam = selectedConcept?.id ? `&asset_id=${selectedConcept.id}` : '';
                const resp = await fetch(`${API_BASE_URL}/api/session/status?session_id=${sessionId}${assetIdParam}`);
                const data = await resp.json();
                const currentAsset = data.assets?.find(a => a.id === selectedConcept?.id || a.image_url.includes(selectedConcept?.id));

                if (currentAsset?.status === 'completed' && currentAsset.stl_r2_path) {
                    setMeshProgress(100);
                    setStatus('completed');
                    setStlUrl(`${API_BASE_URL}/api/assets/${currentAsset.stl_r2_path}`);
                } else if (currentAsset?.status === 'failed') {
                    setStatus('failed');
                } else {
                    setMeshProgress(prev => Math.min(prev + (Math.random() * 3), 95));
                }
            } catch (err) { console.error("Polling error:", err); }
        };
        const interval = setInterval(poll, 3000);
        return () => clearInterval(interval);
    }, [sessionId, status, selectedConcept?.id]);

    // Handle Stage Transition
    const handleConfirmEngraving = () => {
        if (status === 'completed') {
            setUiStage('MODEL_PREVIEW');
        } else {
            setIsTransitioning(true);
        }
    };

    // Auto-advance if we were waiting for the GPU
    useEffect(() => {
        if (isTransitioning && status === 'completed') {
            setIsTransitioning(false);
            setUiStage('MODEL_PREVIEW');
        }
    }, [isTransitioning, status]);

    // Background Pre-Slicing Logic
    useEffect(() => {
        if (!mergedGeometry || !selectedConcept || uiStage !== 'MODEL_PREVIEW') return;

        let isMounted = true;
        let pollInterval = null;

        const timeoutId = setTimeout(async () => {
            try {
                setBgJobStatus("UPLOADING");
                const exporter = new STLExporter();
                const mesh = new THREE.Mesh(mergedGeometry, new THREE.MeshStandardMaterial());
                const stlData = exporter.parse(mesh, { binary: true });
                const formData = new FormData();
                formData.append("file", new Blob([stlData], { type: "model/stl" }), "final_merged.stl");
                formData.append("session_id", sessionId);
                formData.append("asset_id", selectedConcept.id);

                const uploadResp = await fetch(`${API_BASE_URL}/api/assets/upload-final`, { method: "POST", body: formData });
                if (!uploadResp.ok) throw new Error("Upload failed");
                if (!isMounted) return;

                setBgJobStatus("SLICING");
                const resp = await fetch(`${API_BASE_URL}/api/slice`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ session_id: sessionId, asset_id: selectedConcept.id })
                });

                if (!resp.ok) throw new Error("Slice trigger failed");
                const initialResult = await resp.json();
                if (!isMounted) return;

                if (initialResult.job_id) {
                    setBgJobStatus("POLLING");
                    pollInterval = setInterval(async () => {
                        try {
                            const statusResp = await fetch(`${API_BASE_URL}/api/slice/status?job_id=${initialResult.job_id}&session_id=${sessionId}&asset_id=${selectedConcept.id}`);
                            if (!statusResp.ok) return;
                            const statusData = await statusResp.json();
                            if (!isMounted) return;
                            if (statusData.status === "COMPLETED" || statusData.success) {
                                clearInterval(pollInterval);
                                setBgJobStatus("COMPLETED");
                                setBgJobResult(statusData);
                            } else if (statusData.status === "FAILED") {
                                clearInterval(pollInterval);
                                setBgJobStatus("FAILED");
                            }
                        } catch (e) { }
                    }, 3000);
                } else if (initialResult.status === "success" || initialResult.success) {
                    setBgJobStatus("COMPLETED");
                    setBgJobResult(initialResult);
                }
            } catch (err) {
                console.error("[PRE-SLICE] Error:", err);
                if (isMounted) setBgJobStatus("FAILED");
            }
        }, 1500);

        return () => { isMounted = false; clearTimeout(timeoutId); if (pollInterval) clearInterval(pollInterval); };
    }, [mergedGeometry, selectedConcept?.id, sessionId, uiStage]);

    const handleFinalize = async () => {
        if (!mergedGeometry) return;
        if (bgJobStatus === "COMPLETED" && bgJobResult) {
            onNext({ sessionId, printEstimate: bgJobResult.stats, line1, line2, stlUrl, gcode_r2_path: bgJobResult.gcode_r2_path });
            return;
        }
        if (bgJobStatus === "FAILED") { alert("Slicing failed. Please adjust text slightly."); return; }
        setIsFinalizing(true);
    };

    // Watch for bg job completion during finalization
    useEffect(() => {
        if (isFinalizing && bgJobStatus === "COMPLETED" && bgJobResult) {
            setIsFinalizing(false);
            onNext({ sessionId, printEstimate: bgJobResult.stats, line1, line2, stlUrl, gcode_r2_path: bgJobResult.gcode_r2_path });
        }
    }, [isFinalizing, bgJobStatus, bgJobResult, sessionId, line1, line2, stlUrl, onNext]);

    return (
        <div className="w-full max-w-7xl mx-auto px-4 animate-fade-in py-8">
            <div className="flex flex-col gap-8 md:gap-12">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-center md:text-left">
                        <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400 mb-2 block">
                            Stage 03 • {uiStage === 'PEDESTAL_STUDIO' ? 'Custom Engraving' : '3D Revelations'}
                        </span>
                        <h2 className="text-3xl md:text-5xl font-light tracking-tight text-slate-800">
                            {uiStage === 'PEDESTAL_STUDIO' ? 'Design Your Base' : 'The Result'}
                        </h2>
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
                                <Stage environment="city" intensity={0.6} contactShadow={{ opacity: 0.4, blur: 2 }} adjustCamera={true} center={false}>
                                    {uiStage === 'PEDESTAL_STUDIO' ? (
                                        <Pedestal line1={line1} line2={line2} isolationMode={true} />
                                    ) : (
                                        <group>
                                            {stlUrl && (
                                                <AIModel url={stlUrl} onLoaded={(bounds, mesh) => setModelData({ bounds, mesh })} />
                                            )}
                                            {modelData.bounds && (
                                                <Pedestal
                                                    modelMesh={modelData.mesh}
                                                    modelBounds={modelData.bounds}
                                                    line1={line1}
                                                    line2={line2}
                                                    onMerged={setMergedGeometry}
                                                />
                                            )}
                                        </group>
                                    )}
                                </Stage>
                            </Suspense>
                            <OrbitControls enablePan={false} minDistance={4} maxDistance={12} makeDefault />
                        </Canvas>

                        {/* ENGRAVING PANEL */}
                        {uiStage === 'PEDESTAL_STUDIO' && (
                            <div className="absolute top-8 right-8 w-full max-w-[280px] z-10">
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-white/80 p-6 rounded-2xl border border-slate-200 shadow-sm backdrop-blur-xl"
                                >
                                    <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-4">
                                        <Type className="w-3 h-3" />
                                        Pedestal Engraving
                                    </label>
                                    <input
                                        type="text"
                                        value={line1}
                                        onChange={(e) => setLine1(e.target.value)}
                                        placeholder="LINE 1 (e.g. NAME)"
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all mb-3 shadow-sm"
                                    />
                                    <input
                                        type="text"
                                        value={line2}
                                        onChange={(e) => setLine2(e.target.value)}
                                        placeholder="LINE 2 (e.g. DATE)"
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                                    />
                                    <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400">
                                        <Info className="w-3 h-3" />
                                        <span>Text wraps automatically around the base.</span>
                                    </div>
                                </motion.div>
                            </div>
                        )}

                        {/* TRANSITION / WAIT OVERLAY */}
                        {isTransitioning && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-md z-50">
                                <FunFactsLoader progress={meshProgress} />
                            </div>
                        )}

                        {/* FINALIZING OVERLAY */}
                        {isFinalizing && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-md z-50">
                                <div className="flex flex-col items-center gap-6 p-10 bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm text-center">
                                    <div className="relative">
                                        <div className="w-20 h-20 border-4 border-slate-100 border-t-primary rounded-full animate-spin" />
                                        <Printer className="absolute inset-0 m-auto w-8 h-8 text-primary animate-pulse" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-slate-800 mb-2">
                                            {bgJobStatus === "UPLOADING" ? "Preparing Geometry..." :
                                                bgJobStatus === "SLICING" ? "Initializing Slicer Engine..." :
                                                    bgJobStatus === "POLLING" ? "Generating Toolpaths..." : "Finalizing..."}
                                        </h3>
                                        <p className="text-sm text-slate-500">Preparing your 3D print. Almost there.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-center gap-6 pt-6">
                    {uiStage === 'PEDESTAL_STUDIO' ? (
                        <motion.button
                            onClick={handleConfirmEngraving}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-16 py-5 rounded-xl font-medium text-lg bg-slate-900 text-white hover:bg-slate-800 shadow-md transition-all"
                        >
                            Confirm Engraving
                        </motion.button>
                    ) : (
                        <motion.button
                            onClick={handleFinalize}
                            disabled={isFinalizing || status !== 'completed' || !mergedGeometry}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`px-16 py-5 rounded-xl font-medium text-lg transition-all shadow-sm ${isFinalizing || status !== 'completed' || !mergedGeometry
                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md'
                                }`}
                        >
                            {isFinalizing ? 'Preparing Print...' : 'Proceed to Checkout'}
                        </motion.button>
                    )}

                    {uiStage === 'MODEL_PREVIEW' && (
                        <button
                            onClick={() => { setUiStage('PEDESTAL_STUDIO'); setMergedGeometry(null); }}
                            className="text-slate-400 hover:text-slate-600 text-xs font-medium tracking-wide transition-all underline decoration-slate-200 underline-offset-4"
                        >
                            Change Engraving Text
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
