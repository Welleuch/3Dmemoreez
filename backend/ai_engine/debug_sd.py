import os
import sys
import torch
import yaml
import safetensors.torch

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, CURRENT_DIR)

from hy3dgen.shapegen.models import Hunyuan3DDiT
from hy3dgen.shapegen.pipelines import instantiate_from_config

MODEL_PATH = r"C:\Users\Administrator\Downloads\ComfyUI_windows_portable_nvidia\ComfyUI_windows_portable\ComfyUI\models\checkpoints\hunyuan_3d_v2.1.safetensors"

with open(os.path.join(CURRENT_DIR, "configs", "dit_config.yaml"), 'r') as f:
    config = yaml.safe_load(f)

model = instantiate_from_config(config['model'])
safetensors_ckpt = safetensors.torch.load_file(MODEL_PATH, device='cpu')

model_sd = model.state_dict()
ckpt_model = {k[6:]: v for k, v in safetensors_ckpt.items() if k.startswith('model.')}

print(f"Model keys: {len(model_sd.keys())}")
print(f"Checkpoint keys: {len(ckpt_model.keys())}")

missing = set(model_sd.keys()) - set(ckpt_model.keys())
unexpected = set(ckpt_model.keys()) - set(model_sd.keys())

# Let's try to find potential matches
print(f"Missing (example): {sorted(list(missing))[:20]}")
print(f"Unexpected (example): {sorted(list(unexpected))[:20]}")
