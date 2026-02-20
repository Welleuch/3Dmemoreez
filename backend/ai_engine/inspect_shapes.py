import safetensors.torch
MODEL_PATH = r"C:\Users\Administrator\Downloads\ComfyUI_windows_portable_nvidia\ComfyUI_windows_portable\ComfyUI\models\checkpoints\hunyuan_3d_v2.1.safetensors"
ckpt = safetensors.torch.load_file(MODEL_PATH)
for k, v in ckpt.items():
    if k.startswith('model.') and 'blocks.' not in k:
        print(f"{k}: {list(v.shape)}")
