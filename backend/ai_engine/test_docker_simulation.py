
import requests
import json
import time
import os
import threading
import sys
import subprocess
import uvicorn
from fastapi import FastAPI, File, UploadFile, Form, BackgroundTasks
import pytest

# Test Configuration
DOCKER_URL = "http://localhost:8000"
HEALTH_URL = f"{DOCKER_URL}/health"
GENERATE_URL = f"{DOCKER_URL}/generate-3d"
WEBHOOK_PORT = 9999
MOCK_WEBHOOK_URL = f"http://host.docker.internal:{WEBHOOK_PORT}/webhook"
TEST_IMAGE_URL = "https://raw.githubusercontent.com/Tencent/Hunyuan3D-2/main/assets/demo.png"
OUTPUT_FILE = "test_result.stl"
MAX_WAIT_TIME = 300  # 300 seconds (5 min) timeout — diffusion + VAE + marching cubes

# Webhook Server
webhook_app = FastAPI()
webhook_received = threading.Event()
webhook_status = None

@webhook_app.post("/webhook")
async def receive_webhook(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    asset_id: str = Form(...),
    status: str = Form(...)
):
    global webhook_status
    print(f"\n[Webhook] Received callback! Status: {status}")
    webhook_status = status
    
    content = await file.read()
    with open(OUTPUT_FILE, "wb") as f:
        f.write(content)
        
    print(f"[Webhook] Saved file ({len(content)} bytes).")
    webhook_received.set()
    return {"status": "received"}

def start_webhook_server():
    # Run uvicorn in a separate thread
    uvicorn.run(webhook_app, host="0.0.0.0", port=WEBHOOK_PORT, log_level="error")

def test_docker_health():
    """Wait for Docker container to be healthy."""
    print(f"\n[Test] Checking health at {HEALTH_URL}...")
    start_time = time.time()
    while time.time() - start_time < 60: # Wait 60s for boot
        try:
            resp = requests.get(HEALTH_URL, timeout=2)
            if resp.status_code == 200:
                print("[Test] Server is UP!")
                data = resp.json()
                print(f"[Test] Health Data: {data}")
                assert data["status"] == "ok"
                # Ensure GPU is visible (if running on GPU machine)
                # assert data["gpu"] is True
                return
        except requests.exceptions.ConnectionError:
            pass
        time.sleep(2)
    
    pytest.fail("Docker container failed to start (Health Check Timeout)")

def test_3d_generation():
    """End-to-end test of the generation flow."""
    # 1. Start Webhook Listener
    local_thread = threading.Thread(target=start_webhook_server, daemon=True)
    local_thread.start()
    
    # Allow webhook server to bind
    time.sleep(2)
    
    # 2. Trigger Generation
    payload = {
        "session_id": "automated_test_001",
        "asset_id": "automated_asset_001",
        "image_url": TEST_IMAGE_URL,
        "webhook_url": MOCK_WEBHOOK_URL
    }
    
    print(f"[Test] Sending generation request...")
    try:
        resp = requests.post(GENERATE_URL, json=payload, timeout=5)
        assert resp.status_code == 200
        print(f"[Test] Request accepted: {resp.json()}")
    except Exception as e:
        pytest.fail(f"Failed to send request: {e}")

    # 3. Wait for Webhook Callback
    print(f"[Test] Waiting for webhook (max {MAX_WAIT_TIME}s)...")
    success = webhook_received.wait(timeout=MAX_WAIT_TIME)
    
    if not success:
        pytest.fail("Webhook callback timed out! Generation took too long or failed silently.")
        
    assert webhook_status == "completed"
    assert os.path.exists(OUTPUT_FILE)
    assert os.path.getsize(OUTPUT_FILE) > 100 # Should be a valid file
    print(f"[Test] SUCCESS! proper STL generated.")

if __name__ == "__main__":
    # If run directly, convert to pytest execution
    sys.exit(pytest.main(["-v", __file__]))
