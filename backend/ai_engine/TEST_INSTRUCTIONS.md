
# Testing the AI Engine Docker Container

The Docker build is currently downloading the large NVIDIA base image (~10GB) required for RTX 5090 (Blackwell) support. This may take some time depending on your internet connection.

## Once the download completes:

1.  **Start the Container:**
    ```powershell
    cd backend/ai_engine
    docker compose up
    ```
    *Wait for the server to log `Uvicorn running on http://0.0.0.0:8000`.*

2.  **Run the Test Simulation:**
    Open a new terminal and run:
    ```powershell
    cd backend/ai_engine
    python test_docker_simulation.py
    ```

3.  **Verify Results:**
    *   The script should receive a response from the Docker container.
    *   A file `test_result.stl` will be saved in the `backend/ai_engine` folder.
    *   Open `test_result.stl` in a 3D viewer to confirm the mesh is generated correctly.

## Debugging
If the container fails to start or the test fails:
*   Check `server.log` for Python errors.
*   Ensure your GPU drivers are up to date (r550+ required for Blackwell).
*   Verify GPU visibility inside the container:
    ```powershell
    docker exec -it ai_engine-ai-engine-1 python -c "import torch; print(torch.cuda.get_arch_list())"
    ```
