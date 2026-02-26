import requests
import time
import os
import threading
import sys
import subprocess
import uvicorn
from fastapi import FastAPI, File, UploadFile, Form

DOCKER_URL = "http://localhost:8000"
HEALTH_URL = f"{DOCKER_URL}/health"
GENERATE_URL = f"{DOCKER_URL}/generate-3d"
WEBHOOK_PORT = 9999
MOCK_WEBHOOK_URL = f"http://host.docker.internal:{WEBHOOK_PORT}/webhook"
TEST_IMAGE_URL = "https://raw.githubusercontent.com/Tencent/Hunyuan3D-2/main/assets/demo.png"
OUTPUT_FILE = "benchmark_result.stl"

webhook_app = FastAPI()
webhook_received = threading.Event()

@webhook_app.post("/webhook")
async def receive_webhook(file: UploadFile = File(...), session_id: str = Form(...), asset_id: str = Form(...), status: str = Form(...)):
    print(f"\n[Webhook] Received callback! Status: {status}")
    webhook_received.set()
    return {"status": "received"}

def start_webhook_server():
    uvicorn.run(webhook_app, host="0.0.0.0", port=WEBHOOK_PORT, log_level="critical")

def run_benchmark(image_name):
    # 1. Start Webhook server if not running
    print(f"\n========== BENCHMARKING {image_name} ==========")
    
    # 2. Start container
    print("Starting container...")
    cname = f"bench-container-{int(time.time())}"
    cmd = [
        "docker", "run", "-d", "--rm", "--name", cname, "--gpus", "all",
        "-v", r"C:\Users\Administrator\Downloads\ComfyUI_windows_portable_nvidia\ComfyUI_windows_portable\ComfyUI\models\checkpoints\hunyuan3d-dit-v2_fp16.safetensors:/app/models/hunyuan3d-dit-v2_fp16.safetensors",
        "-e", "MODEL_PATH=/app/models/hunyuan3d-dit-v2_fp16.safetensors",
        "-p", "8000:8000",
        image_name
    ]
    
    t0 = time.time()
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL)
    
    # 3. Measure cold start (health check)
    print("Waiting for health endpoint (cold start)...")
    while True:
        try:
            resp = requests.get(HEALTH_URL, timeout=1)
            if resp.status_code == 200:
                break
        except Exception:
            pass
        time.sleep(1)
        if time.time() - t0 > 120:
            print("ERROR: Container failed to start within 120s")
            subprocess.run(["docker", "stop", cname], stdout=subprocess.DEVNULL)
            return None, None
            
    cold_start_time = time.time() - t0
    print(f"-> Cold Start Time: {cold_start_time:.2f} seconds")
    
    # 4. Measure first inference
    webhook_received.clear()
    payload = {
        "session_id": "bench_test",
        "asset_id": "bench_asset",
        "image_url": TEST_IMAGE_URL,
        "webhook_url": MOCK_WEBHOOK_URL
    }
    
    print("Triggering first inference (mesh gen)...")
    t1 = time.time()
    try:
        resp = requests.post(GENERATE_URL, json=payload, timeout=5)
    except Exception as e:
        print(f"Failed to trigger: {e}")
        subprocess.run(["docker", "stop", cname], stdout=subprocess.DEVNULL)
        return cold_start_time, None
        
    print("Waiting for webhook...")
    success = webhook_received.wait(timeout=300)
    inference_time = time.time() - t1
    
    if success:
        print(f"-> First Inference Time: {inference_time:.2f} seconds")
    else:
        print("ERROR: Inference timeout")
        inference_time = None
        
    # 5. Stop container
    print("Stopping container...")
    subprocess.run(["docker", "stop", cname], stdout=subprocess.DEVNULL)
    return cold_start_time, inference_time

if __name__ == "__main__":
    t = threading.Thread(target=start_webhook_server, daemon=True)
    t.start()
    time.sleep(2) # wait for server to bind
    
    # Ensure no old container is running
    subprocess.run(["docker", "stop", "ai_engine-ai-engine-1"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    old_cold, old_inf = run_benchmark("3dmemoreez-ai-engine:old")
    
    print("\n[VRAM COOLDOWN] Waiting 15 seconds to ensure WSL2/Docker releases GPU memory...")
    time.sleep(15)
    
    new_cold, new_inf = run_benchmark("3dmemoreez-ai-engine:local-test")
    
    print("\n\n================ RESULTS ================")
    print(f"OLD IMAGE (Unoptimized):")
    print(f"  Cold Start: {old_cold:.2f}s")
    print(f"  First Inference: {old_inf:.2f}s")
    print(f"NEW IMAGE (Optimized):")
    print(f"  Cold Start: {new_cold:.2f}s")
    print(f"  First Inference: {new_inf:.2f}s")
    print("=========================================")
