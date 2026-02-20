import os
import sys
import torch
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Test-Load")

MODEL_PATH = r"C:\Users\Administrator\Downloads\ComfyUI_windows_portable_nvidia\ComfyUI_windows_portable\ComfyUI\models\checkpoints\hunyuan3d-dit-v2_fp16.safetensors"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, CURRENT_DIR)

try:
    from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline
    logger.info("Import successful")
    
    pipeline, vae = Hunyuan3DDiTFlowMatchingPipeline.from_single_file(
        ckpt_path=MODEL_PATH,
        device=DEVICE,
        use_safetensors=True
    )
    logger.info("Model loaded successfully")
except Exception as e:
    import traceback
    logger.error(f"Load failed: {e}")
    logger.error(traceback.format_exc())
