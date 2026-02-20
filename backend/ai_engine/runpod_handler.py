import runpod
import os
import sys
import torch
import logging
import requests
import io
import time

# Ensure hy3dgen is in path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, CURRENT_DIR)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("RunPod-Handler")

# Load Pipeline Globally (Warm Start)
try:
    from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline
    
    MODEL_PATH = os.environ.get("MODEL_PATH", "/app/models/hunyuan3d-dit-v2_fp16.safetensors")
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    
    logger.info(f"Loading model from {MODEL_PATH} on {DEVICE}...")
    pipeline, vae = Hunyuan3DDiTFlowMatchingPipeline.from_single_file(
        ckpt_path=MODEL_PATH,
        device=DEVICE,
        use_safetensors=True
    )
    logger.info("Model loaded successfully!")
    
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
    from PIL import Image
    return Image.open(io.BytesIO(resp.content)).convert("RGB")

def handler(job):
    job_input = job["input"]
    
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
        # 1. Download Image
        image = download_image(image_url)
        
        # 2. Inference
        logger.info(f"Starting inference for {session_id}...")
        start_time = time.time()
        
        # Step 1: Diffusion
        latents = pipeline(
            image=image, 
            num_inference_steps=50, # Production quality
            enable_pbar=False
        )
        
        # Step 2: VAE
        meshes = vae.latents2mesh(latents, octree_resolution=256)
        
        duration = time.time() - start_time
        logger.info(f"Generation took {duration:.2f}s")
        
        if not meshes:
             return {"error": "No mesh generated"}
             
        # Export to Buffer
        mesh_obj = meshes[0]
        mesh_buffer = io.BytesIO()
        mesh_obj.export(mesh_buffer, file_type='stl')
        mesh_bytes = mesh_buffer.getvalue()
        
        logger.info(f"Mesh generated: {len(mesh_bytes)} bytes")
        
        # 3. Webhook Callback (Custom)
        if webhook_url:
            logger.info(f"Sending result to webhook: {webhook_url}")
            files = {
                'file': ('model.stl', mesh_bytes, 'application/octet-stream')
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
