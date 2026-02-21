import os
import sys
import uuid
import torch
import requests
import trimesh
import numpy as np
from fastapi import FastAPI, BackgroundTasks, Request
import io
from PIL import Image
from pydantic import BaseModel
from typing import Optional
import logging

# Setup Logging (must be before any logger.* calls)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AI-Engine")

try:
    from rembg import remove, new_session
    # isnet-general-use has sharper edge detection and handles dark/gradient backgrounds
    # much better than u2net — critical for Flux-generated images with dark gradient BGs
    REMBG_SESSION = new_session("isnet-general-use")
    REMBG_AVAILABLE = True
    logger.info("rembg loaded with model: isnet-general-use")
except ImportError:
    REMBG_AVAILABLE = False
    logger.warning("rembg not installed, background removal will be skipped.")

# 2. MODEL CONFIGURATION
# Default to Windows path if not in env (Docker sets this env var)
DEFAULT_MODEL_PATH = r"C:\Users\Administrator\Downloads\ComfyUI_windows_portable_nvidia\ComfyUI_windows_portable\ComfyUI\models\checkpoints\hunyuan3d-dit-v2_fp16.safetensors"
MODEL_PATH = os.environ.get("MODEL_PATH", DEFAULT_MODEL_PATH)

# GPU is MANDATORY. CPU execution is strictly forbidden.
if not torch.cuda.is_available():
    logger.error("FATAL: CUDA is not available. GPU is required for mesh generation.")
    sys.exit(1)

DEVICE = "cuda"

# Docker IPv4 Compatibility Fix
# Force Requests/Urllib3 to use IPv4 only, avoiding "Network Unreachable" on dual-stack envs
if os.environ.get("IS_DOCKER", "false").lower() == "true":
    import socket
    import urllib3.util.connection as connection
    
    def allowed_gai_family():
        return socket.AF_INET
        
    connection.allowed_gai_family = allowed_gai_family
    logger.info("Forced IPv4 for requests (Docker fix applied).")

try:
    # Ensure we use OUR local vendor lib, not the system one
    # We need to add the DIRECTORY CONTAINING hy3dgen to path, not hy3dgen itself
    CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, CURRENT_DIR) 

    from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline, Hunyuan3DDiTPipeline
    
    IMPORT_SUCCESS = True
    logger.info("Successfully loaded Hunyuan engine from local vendor lib.")
except Exception as e:
    import traceback
    logger.error(f"Failed to load Hunyuan engine: {e}")
    logger.error(traceback.format_exc())
    IMPORT_SUCCESS = False

app = FastAPI()

# 2. MODEL CONFIGURATION
# DEVICE already defined above

pipeline = None
vae = None # Added vae global variable

@app.on_event("startup")
async def load_model():
    if not IMPORT_SUCCESS:
        logger.error("Skipping model load due to import error.")
        return

    try:
        logger.info(f"Loading Hunyuan3D-V2 model into {DEVICE}...")
        
        # We use the from_single_file method to load your existing safetensors
        global pipeline, vae
        pipeline, vae = Hunyuan3DDiTFlowMatchingPipeline.from_single_file(
            ckpt_path=MODEL_PATH,
            device=DEVICE,
            use_safetensors=True
        )
        # Move VAE to GPU — from_single_file loads vae onto offload_device (cpu) by default
        vae.to(DEVICE)
        vae.eval()
        logger.info(f"VAE moved to {DEVICE}.")
        logger.info("Model loaded successfully!")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        import traceback
        logger.error(traceback.format_exc())

class GenRequest(BaseModel):
    image_url: str
    webhook_url: str
    session_id: str
    asset_id: str

def process_3d(image_url: str, webhook_url: str, session_id: str, asset_id: str):
    logger.info(f"Starting 3D generation for session {session_id}...")
    
    try:
        # 1. Download Image
        resp = requests.get(image_url)
        if resp.status_code != 200:
            raise Exception(f"Failed to download image: {resp.status_code}")
        
        # 2. Placeholder for real inference
        # In a production script, we'd run:
        # 1. Download Image (already done in the new block)
        # 2. Placeholder for real inference (now implemented)
        
        output_path = f"output_{asset_id}.stl" # Define output_path here
        
        # 3. Generate 3D
        logger.info(f"Downloading image: {image_url}")
        image_resp = requests.get(image_url)
        raw_image = Image.open(io.BytesIO(image_resp.content))
        
        if REMBG_AVAILABLE:
            logger.info("[REMBG] Running isnet-general-use background removal...")
            rgba_image = remove(raw_image, session=REMBG_SESSION)
            
            # ✅ VERIFICATION STEP: Check how well rembg removed the background
            verify_data = np.array(rgba_image)
            total_pixels = verify_data.shape[0] * verify_data.shape[1]
            transparent_pixels = np.sum(verify_data[:, :, 3] < 10)   # near-fully transparent
            opaque_pixels = np.sum(verify_data[:, :, 3] > 245)        # near-fully opaque (object)
            semi_pixels = total_pixels - transparent_pixels - opaque_pixels  # fringe/semi
            transparent_pct = (transparent_pixels / total_pixels) * 100
            opaque_pct = (opaque_pixels / total_pixels) * 100
            semi_pct = (semi_pixels / total_pixels) * 100
            logger.info(f"[REMBG-VERIFY] Transparent BG: {transparent_pct:.1f}% | Solid Subject: {opaque_pct:.1f}% | Fringe: {semi_pct:.1f}%")
            
            if transparent_pct < 20:
                logger.warning(f"[REMBG-VERIFY] ⚠️ WARNING: Only {transparent_pct:.1f}% of pixels are transparent — background removal may have failed! Dark gradient BG detected?")
            elif transparent_pct > 50:
                logger.info(f"[REMBG-VERIFY] ✅ Good isolation: {transparent_pct:.1f}% transparent background.")
            
            # 1. 🔍 Strict Alpha Thresholding
            # Kill ALL fringe pixels early. If it's not mostly solid, it's gone.
            data = np.array(rgba_image)
            alpha = data[:, :, 3]
            data[:, :, 3] = np.where(alpha < 200, 0, 255)  # Strict binary: 0 or 255
            rgba_image = Image.fromarray(data)
            
            # 2. 🧹 Super-Clear Borders (20px border wipe)
            w, h = rgba_image.size
            import PIL.ImageDraw as ImageDraw
            draw = ImageDraw.Draw(rgba_image)
            border = 20
            draw.rectangle([0, 0, w, border], fill=(0,0,0,0))
            draw.rectangle([0, h-border, w, h], fill=(0,0,0,0))
            draw.rectangle([0, 0, border, h], fill=(0,0,0,0))
            draw.rectangle([w-border, 0, w, h], fill=(0,0,0,0))
            
            # 3. 🎯 Tight Bounding Box
            bbox = rgba_image.getbbox()
            if bbox:
                rgba_image = rgba_image.crop(bbox)
            
            # 4. 📏 Safe Scaling (75% canvas fill to maximize padding)
            max_size = 512
            side_len = int(max_size * 0.75)  # 25% total padding
            w, h = rgba_image.size
            scale = side_len / max(w, h)
            new_w, new_h = int(w * scale), int(h * scale)
            rgba_image = rgba_image.resize((new_w, new_h), Image.Resampling.LANCZOS)
            
            # 5. 🖼️ Centre subject on a TRANSPARENT canvas (NOT white!)
            # CRITICAL: alpha=0 background tells Hunyuan3D "this is empty space".
            # A solid white (alpha=255) background gets interpreted as geometry
            # → extruded into the box/wall artifact we want to eliminate.
            canvas = Image.new("RGBA", (max_size, max_size), (0, 0, 0, 0))  # fully transparent
            paste_x = (max_size - new_w) // 2
            paste_y = (max_size - new_h) // 2
            canvas.paste(rgba_image, (paste_x, paste_y), rgba_image)
            
            # 6. Keep as RGBA — pass the transparent image directly to Hunyuan3D.
            # The alpha channel lets the pipeline know exactly which pixels are
            # subject (α=255) vs background (α=0). No RGB conversion = no box artifact.
            image = canvas  # RGBA, transparent background
            
            # ✅ FINAL VERIFICATION: log the resulting transparent pixel ratio
            final_data = np.array(image)
            final_transparent = np.sum(final_data[:, :, 3] < 10)
            final_opaque = np.sum(final_data[:, :, 3] > 245)
            final_total = max_size * max_size
            logger.info(f"[REMBG-VERIFY] ✅ Final RGBA canvas — Transparent: {(final_transparent/final_total*100):.1f}% | Subject: {(final_opaque/final_total*100):.1f}%")
            logger.info("[REMBG] Done — RGBA image with transparent BG ready for Hunyuan3D.")
        else:
            image = raw_image.convert("RGB")
        
        # If pipeline is loaded, use it
        logger.info(f"Checking pipeline status: pipeline={'LOADED' if pipeline else 'NONE'}, vae={'LOADED' if vae else 'NONE'}")
        if pipeline is not None and vae is not None:
            logger.info("Running HunyuanAI Inference...")
            # We use the pipeline to get latents
            # and then VAE to get the mesh
            with torch.no_grad():
                # 1. Pipeline call (DiT diffusion -> raw latents)
                logger.info(f"Step 1: Pipeline call started (device={DEVICE})...")
                latents = pipeline(
                    image=image, 
                    num_inference_steps=50, 
                    enable_pbar=True
                )
                logger.info(f"Step 1 Complete. Latents shape: {latents.shape}")

                # 1b. CRITICAL: Run VAE forward pass (post_kl + transformer)
                # Raw pipeline latents must be processed by ShapeVAE before
                # being passed to the volume decoder.
                logger.info(f"Step 1b: VAE forward pass...")
                logger.info(f"  Raw latents — min:{latents.min():.4f} max:{latents.max():.4f} shape:{latents.shape}")
                # Apply scale_factor (standard latent diffusion: divide before decoding)
                latents = latents / vae.scale_factor
                logger.info(f"  After scale_factor ({vae.scale_factor:.6f}) — min:{latents.min():.4f} max:{latents.max():.4f}")
                latents = vae(latents)
                logger.info(f"Step 1b Complete. Processed latents: {latents.shape}, min:{latents.min():.4f} max:{latents.max():.4f}")

                # 2. VAE Decode — production settings
                # mc_level=-1/512 is Hunyuan3D's calibrated isovalue (from original _export in pipelines.py)
                # octree_resolution=256 gives a good quality/speed tradeoff for production
                # num_chunks=8000 controls how many query points are processed per GPU batch
                logger.info("Step 2: VAE mesh generation started (octree_resolution=256)...")
                meshes = vae.latents2mesh(
                    latents,
                    bounds=1.01,
                    octree_resolution=256,
                    mc_level=-1/512,
                    num_chunks=8000
                )
                logger.info("Step 2 Complete.")
                
                # meshes is a list, take the first one
                mesh_obj = meshes[0] if isinstance(meshes, list) else meshes
                
                # Convert to trimesh for export (it's often a custom mesh type)
                try:
                    from hy3dgen.shapegen.pipelines import export_to_trimesh
                    mesh = export_to_trimesh(mesh_obj)
                    logger.info("Mesh exported to trimesh format.")
                except Exception as e:
                    logger.warning(f"Export to trimesh failed, using raw mesh: {e}")
                    mesh = mesh_obj
                
                mesh.export(output_path)
            logger.info(f"Actual AI model generated at {output_path}")
        else:
            logger.warning(f"Pipeline not loaded (pipeline={pipeline}, vae={vae}), using fallback cube.")
            mesh = trimesh.creation.box(extents=[1, 1, 1])
            mesh.export(output_path)
        
        # 4. Call Webhook back at the Worker
        logger.info(f"Uploading STL to Webhook: {webhook_url}")
        with open(output_path, "rb") as f:
            webhook_resp = requests.post(
                webhook_url,
                files={"file": (f"{asset_id}.stl", f, "model/stl")},
                data={
                    "session_id": session_id,
                    "asset_id": asset_id,
                    "status": "completed"
                }
            )
        
        logger.info(f"Webhook response: {webhook_resp.status_code}")
        
        # Cleanup
        if os.path.exists(output_path):
            os.remove(output_path)
            
    except Exception as e:
        logger.error(f"Generation failed: {e}")
        # Notify failure
        requests.post(webhook_url, data={
            "session_id": session_id,
            "asset_id": asset_id,
            "status": "failed",
            "error": str(e)
        })

@app.post("/generate-3d")
async def generate_3d(req: GenRequest, background_tasks: BackgroundTasks):
    logger.info(f"Received request for {req.session_id}")

    # Handle Docker networking
    is_docker = os.environ.get("IS_DOCKER", "false").lower() == "true"
    image_to_use = req.image_url
    webhook_to_use = req.webhook_url
    
    if is_docker:
        # Patch Image URL
        if "localhost" in image_to_use:
            image_to_use = image_to_use.replace("localhost", "host.docker.internal")
        if "127.0.0.1" in image_to_use:
            image_to_use = image_to_use.replace("127.0.0.1", "host.docker.internal")
            
        # Patch Webhook URL
        if webhook_to_use:
            if "localhost" in webhook_to_use:
                webhook_to_use = webhook_to_use.replace("localhost", "host.docker.internal")
            if "127.0.0.1" in webhook_to_use:
                webhook_to_use = webhook_to_use.replace("127.0.0.1", "host.docker.internal")
                
        logger.info(f"Docker Patched URLs:\nImage: {image_to_use}\nWebhook: {webhook_to_use}")

    background_tasks.add_task(process_3d, image_to_use, webhook_to_use, req.session_id, req.asset_id)
    return {"status": "processing", "message": "Inference started in background"}

@app.get("/health")
def health():
    return {"status": "ok", "gpu": torch.cuda.is_available(), "import_success": IMPORT_SUCCESS}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
