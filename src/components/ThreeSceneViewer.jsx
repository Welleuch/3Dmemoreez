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
import { ChevronLeft, ArrowRight, Type, Box, Zap, Loader2, Printer, Sparkles, Gauge } from 'lucide-react';
import { motion } from 'framer-motion';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8787'
    : 'https://3d-memoreez-orchestrator.walid-elleuch.workers.dev';

import { createEngravedPedestalCSG } from '../lib/csgEngine';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';

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
                    if (onMerged) onMerged(csgGeom);
                }
            } catch (err) {
                console.error("[STUDIO] CSG Failure:", err);
            } finally {
                if (active) setIsGenerating(false);
            }
        }

        const timer = setTimeout(init, 300); // Updated to 300ms as per TODO
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
    // Overlap adjusted to 0.05 as per TODO
    const centerY = localBounds ? localBounds.min.y + 0.05 - boxH / 2 : 0;

    const roundedCylinderFallback = useMemo(() => createRoundedCylinderGeometry(radius, boxH, 0.05), [radius, boxH]);

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
                <mesh position={[centerX, centerY, centerZ]} receiveShadow castShadow geometry={roundedCylinderFallback}>
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
            // BUGFIX: Check if already centered to avoid cumulative translation on remount
            if (Math.abs(center.x) > 0.001 || Math.abs(min.y) > 0.001 || Math.abs(center.z) > 0.001) {
                console.log("[STUDIO] Centering figurine geometry...");
                geom.translate(-center.x, -min.y, -center.z);
                geom.computeBoundingBox();
            }

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

export default function ThreeSceneViewer({ selectedConcept, sessionId, line1, setLine1, line2, setLine2, onNext, onBack }) {
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [status, setStatus] = useState('processing');
    const [stlUrl, setStlUrl] = useState(null);
    const [modelData, setModelData] = useState({ bounds: null, mesh: null });
    const [mergedGeometry, setMergedGeometry] = useState(null);

    // Pre-slicing states
    const [bgJobId, setBgJobId] = useState(null);
    const [bgJobStatus, setBgJobStatus] = useState("IDLE"); // IDLE, UPLOADING, SLICING, POLLING, COMPLETED, FAILED
    const [bgJobResult, setBgJobResult] = useState(null);

    // Mesh Gen progress (fake but engaging)
    const [meshProgress, setMeshProgress] = useState(0);

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
                    setMeshProgress(100);
                    setStatus('completed');
                    setStlUrl(`${API_BASE_URL}/api/assets/${currentAsset.stl_r2_path}`);
                } else if (currentAsset?.status === 'failed') {
                    setStatus('failed');
                } else {
                    // Slowly increment progress up to 95% while waiting
                    setMeshProgress(prev => Math.min(prev + (Math.random() * 5), 95));
                }
            } catch (err) { console.error("Polling error:", err); }
        };
        const interval = setInterval(poll, 3000);
        return () => clearInterval(interval);
    }, [sessionId, status]);

    // Background Pre-Slicing Logic
    useEffect(() => {
        if (!mergedGeometry || !selectedConcept) return;

        console.log("[PRE-SLICE] Geometry updated, starting background slice in 1.5 seconds...");
        setBgJobId(null);
        setBgJobStatus("IDLE");
        setBgJobResult(null);

        let isMounted = true;
        let pollInterval = null;

        // Debounce the pre-slice slightly in case of rapid text updates
        const timeoutId = setTimeout(async () => {
            try {
                setBgJobStatus("UPLOADING");

                // 1. Export
                const exporter = new STLExporter();
                const mesh = new THREE.Mesh(mergedGeometry, new THREE.MeshStandardMaterial());
                const stlData = exporter.parse(mesh, { binary: true });

                // 2. Upload
                const formData = new FormData();
                formData.append("file", new Blob([stlData], { type: "model/stl" }), "final_merged.stl");
                formData.append("session_id", sessionId);
                formData.append("asset_id", selectedConcept.id);

                const uploadResp = await fetch(`${API_BASE_URL}/api/assets/upload-final`, {
                    method: "POST",
                    body: formData
                });

                if (!uploadResp.ok) throw new Error("Upload failed");
                if (!isMounted) return;

                // 3. Trigger Slicer
                setBgJobStatus("SLICING");
                const resp = await fetch(`${API_BASE_URL}/api/slice`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        session_id: sessionId,
                        asset_id: selectedConcept.id
                    })
                });

                if (!resp.ok) throw new Error("Slice trigger failed");
                const initialResult = await resp.json();
                if (!isMounted) return;

                if (initialResult.job_id) {
                    setBgJobId(initialResult.job_id);
                    setBgJobStatus("POLLING");

                    pollInterval = setInterval(async () => {
                        try {
                            const statusResp = await fetch(`${API_BASE_URL}/api/slice/status?job_id=${initialResult.job_id}&session_id=${sessionId}&asset_id=${selectedConcept.id}`);
                            if (!statusResp.ok) return;

                            const statusData = await statusResp.json();
                            if (!isMounted) return;

                            if (statusData.status === "COMPLETED" || statusData.success) {
                                clearInterval(pollInterval);
                                console.log("[PRE-SLICE] Completed successfully in background!");
                                setBgJobStatus("COMPLETED");
                                setBgJobResult(statusData);
                            } else if (statusData.status === "FAILED") {
                                clearInterval(pollInterval);
                                setBgJobStatus("FAILED");
                            }
                        } catch (e) {
                            // Silently ignore poll errors
                        }
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

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [mergedGeometry, selectedConcept?.id, sessionId]);

    const handleFinalize = async () => {
        if (!mergedGeometry) return;

        // If background slice already finished, proceed instantly!
        if (bgJobStatus === "COMPLETED" && bgJobResult) {
            console.log("[FINALIZE] Using pre-sliced result!");
            onNext({
                sessionId: sessionId,
                printEstimate: bgJobResult.stats,
                line1,
                line2,
                stlUrl,
                gcode_r2_path: bgJobResult.gcode_r2_path
            });
            return;
        }

        if (bgJobStatus === "FAILED") {
            alert("Slicing failed formatting the geometry. Please adjust text slightly and try again.");
            return;
        }

        // Otherwise, show the dynamic loading modal while the background job finishes
        setIsFinalizing(true);
    };

    // Watch for bg job completion while the finalizing modal is open
    useEffect(() => {
        if (isFinalizing && bgJobStatus === "COMPLETED" && bgJobResult) {
            setIsFinalizing(false);
            onNext({
                sessionId: sessionId,
                printEstimate: bgJobResult.stats,
                line1,
                line2,
                stlUrl,
                gcode_r2_path: bgJobResult.gcode_r2_path
            });
        }
        if (isFinalizing && bgJobStatus === "FAILED") {
            setIsFinalizing(false);
            alert("Slicing failed. Please adjust text and try again.");
        }
    }, [isFinalizing, bgJobStatus, bgJobResult, sessionId, line1, line2, stlUrl, onNext]);

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
                                                    onMerged={(geom) => {
                                                        setMergedGeometry(geom);
                                                        setIsMerged(true);
                                                    }}
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
                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-md z-50">
                                <div className="flex flex-col items-center gap-6 p-10 bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm text-center">
                                    <div className="relative">
                                        <div className="w-20 h-20 border-4 border-slate-100 border-t-primary rounded-full animate-spin" />
                                        <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-primary animate-pulse" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-slate-800 mb-2">
                                            {meshProgress < 30 ? "Analyzing Vision..." :
                                                meshProgress < 60 ? "Sculpting Geometry..." :
                                                    meshProgress < 90 ? "Finalizing 3D Blueprint..." :
                                                        "Polishing Details..."}
                                        </h3>
                                        <p className="text-sm text-slate-500">
                                            Our AI is transforming your idea into a watertight 3D model. This usually takes 45-60 seconds.
                                        </p>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                                        <div
                                            className="h-full bg-primary transition-all duration-700 ease-out"
                                            style={{ width: `${meshProgress}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                                        <Gauge className="w-3 h-3 text-slate-400" />
                                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">
                                            Precision: 0.125mm
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* NEW: Dynamic Slicing UI while finalizing */}
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
                                                    bgJobStatus === "POLLING" ? "Generating Toolpaths & Supports..." :
                                                        "Finalizing..."}
                                        </h3>
                                        <p className="text-sm text-slate-500">
                                            This complex process ensures a perfect 3D print. It usually takes about 30 seconds.
                                        </p>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                                        <div className="h-full bg-primary transition-all duration-1000 ease-out"
                                            style={{ width: bgJobStatus === "UPLOADING" ? "20%" : bgJobStatus === "SLICING" ? "40%" : bgJobStatus === "POLLING" ? "85%" : "100%" }} />
                                    </div>
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
                        disabled={isFinalizing || status !== 'completed' || !isMerged}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-16 py-5 rounded-xl font-medium text-lg transition-all shadow-sm ${isFinalizing || status !== 'completed' || !isMerged
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md'
                            }`}
                    >
                        {isFinalizing ? 'Preparing Print...' : 'Finalize Print'}
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
