import runpod
import os
import sys
import torch
import logging
import requests
import io
import time
import numpy as np
from PIL import Image

# Ensure hy3dgen is in path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, CURRENT_DIR)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("RunPod-Handler")

# REMBG setup
try:
    from rembg import remove, new_session
    REMBG_SESSION = new_session("isnet-general-use")
    REMBG_AVAILABLE = True
    logger.info("rembg loaded with model: isnet-general-use")
except ImportError:
    REMBG_AVAILABLE = False
    logger.warning("rembg not installed, background removal will be skipped.")

# Load Pipeline Globally (Warm Start)
try:
    from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline
    
    # We use typical RunPod network volume path
    MODEL_PATH = os.environ.get("MODEL_PATH", "/runpod-volume/hunyuan3d-dit-v2_fp16.safetensors")
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    
    logger.info(f"Loading model from {MODEL_PATH} on {DEVICE}...")
    pipeline, vae = Hunyuan3DDiTFlowMatchingPipeline.from_single_file(
        ckpt_path=MODEL_PATH,
        device=DEVICE,
        use_safetensors=True
    )
    vae.to(DEVICE)
    vae.eval()
    logger.info("Model loaded successfully and VAE moved to DEVICE!")
    
except Exception as e:
    logger.error(f"Failed to load model: {e}")
    import traceback
    logger.error(traceback.format_exc())
    pipeline = None
    vae = None

def download_image(url):
    logger.info(f"Downloading image from {url}")
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    # Return raw Image, do not convert to RGB yet
    return Image.open(io.BytesIO(resp.content))

def process_image(raw_image):
    if REMBG_AVAILABLE:
        logger.info("[REMBG] Running isnet-general-use background removal...")
        rgba_image = remove(raw_image, session=REMBG_SESSION)
        
        data = np.array(rgba_image)
        alpha = data[:, :, 3]
        data[:, :, 3] = np.where(alpha < 200, 0, 255)  # Strict binary: 0 or 255
        rgba_image = Image.fromarray(data)
        
        w, h = rgba_image.size
        import PIL.ImageDraw as ImageDraw
        draw = ImageDraw.Draw(rgba_image)
        border = 20
        draw.rectangle([0, 0, w, border], fill=(0,0,0,0))
        draw.rectangle([0, h-border, w, h], fill=(0,0,0,0))
        draw.rectangle([0, 0, border, h], fill=(0,0,0,0))
        draw.rectangle([w-border, 0, w, h], fill=(0,0,0,0))
        
        bbox = rgba_image.getbbox()
        if bbox:
            rgba_image = rgba_image.crop(bbox)
        
        max_size = 512
        side_len = int(max_size * 0.75)  # 25% total padding
        w, h = rgba_image.size
        # Protect against divide by zero if image becomes empty
        if w > 0 and h > 0:
            scale = side_len / max(w, h)
            new_w, new_h = int(w * scale), int(h * scale)
            rgba_image = rgba_image.resize((new_w, new_h), Image.Resampling.LANCZOS)
        else:
            new_w, new_h = w, h
        
        canvas = Image.new("RGBA", (max_size, max_size), (0, 0, 0, 0))  # fully transparent
        paste_x = (max_size - new_w) // 2
        paste_y = (max_size - new_h) // 2
        canvas.paste(rgba_image, (paste_x, paste_y), rgba_image)
        
        return canvas
    else:
        return raw_image.convert("RGB")

def handler(job):
    job_input = job.get("input", {})
    
    # Validation
    if not pipeline or not vae:
        return {"error": "Model failed to load during cold start."}
    
    image_url = job_input.get("image_url")
    webhook_url = job_input.get("webhook_url")
    session_id = job_input.get("session_id", "unknown-session")
    asset_id = job_input.get("asset_id", "unknown-asset")
    
    if not image_url:
        return {"error": "Missing image_url"}
    
    try:
        # 1. Download Image & Process
        raw_image = download_image(image_url)
        image = process_image(raw_image)
        
        # 2. Inference
        logger.info(f"Starting inference for {session_id}...")
        start_time = time.time()
        
        with torch.no_grad():
            # Step 1: Diffusion
            logger.info("Step 1: Pipeline call started...")
            latents = pipeline(
                image=image, 
                num_inference_steps=50, # Production quality
                enable_pbar=False
            )
            
            # Step 1b: VAE forward pass (CRITICAL: apply scale_factor and post_kl)
            logger.info("Step 1b: VAE forward pass...")
            latents = latents / vae.scale_factor
            latents = vae(latents)
            
            # Step 2: VAE Decode
            logger.info("Step 2: VAE mesh generation started... Using 256 resolution.")
            meshes = vae.latents2mesh(
                latents,
                bounds=1.01,
                octree_resolution=256,
                mc_level=-1/512,
                num_chunks=8000
            )
        
        duration = time.time() - start_time
        logger.info(f"Generation took {duration:.2f}s")
        
        if not meshes:
             return {"error": "No mesh generated"}
             
        # Export to Buffer
        mesh_obj = meshes[0] if isinstance(meshes, list) else meshes
        
        # Safe extraction if it's the custom struct format
        try:
            from hy3dgen.shapegen.pipelines import export_to_trimesh
            mesh = export_to_trimesh(mesh_obj)
        except Exception as e:
            logger.warning(f"Export to trimesh failed, using raw mesh: {e}")
            mesh = mesh_obj

        # Export binary STL
        mesh_buffer = io.BytesIO()
        mesh.export(mesh_buffer, file_type='stl')
        mesh_bytes = mesh_buffer.getvalue()
        
        logger.info(f"Mesh generated: {len(mesh_bytes)} bytes")
        
        # 3. Webhook Callback (Custom)
        if webhook_url:
            logger.info(f"Sending result to webhook: {webhook_url}")
            files = {
                'file': (f'{asset_id}.stl', mesh_bytes, 'model/stl')
            }
            data = {
                'session_id': session_id,
                'asset_id': asset_id,
                'status': 'completed'
            }
            try:
                r = requests.post(webhook_url, data=data, files=files, timeout=30)
                logger.info(f"Webhook response: {r.status_code}")
            except Exception as w_err:
                logger.error(f"Webhook failed: {w_err}")
                return {"error": f"Webhook failed: {w_err}", "mesh_size": len(mesh_bytes)}
            
        return {
            "status": "success",
            "message": "Mesh generated and sent via webhook",
            "duration": duration
        }
        
    except Exception as e:
        logger.error(f"Handler error: {e}")
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

runpod.serverless.start({"handler": handler})
