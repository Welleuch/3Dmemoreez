import os
import logging
from rembg import new_session

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("PreDownload")

def download_models():
    """
    Downloads models required by the AI engine so they are baked into the Docker image.
    Run this script during the Docker build process.
    """
    try:
        logger.info("Starting pre-download of required models...")
        
        # Ensure U2NET_HOME is set (defaulting to ~/.u2net if not, but Dockerfile should set it)
        u2net_home = os.environ.get("U2NET_HOME", os.path.expanduser("~/.u2net"))
        logger.info(f"U2NET_HOME is set to: {u2net_home}")
        
        os.makedirs(u2net_home, exist_ok=True)
        
        # Download rembg’s isnet-general-use model (~180MB)
        logger.info("Downloading rembg session model: isnet-general-use...")
        new_session("isnet-general-use")
        logger.info("rembg model downloaded and cached successfully!")
        
        # Add any HuggingFace tokenizer downloads here in the future if needed
        # e.g., from transformers import AutoTokenizer; AutoTokenizer.from_pretrained(...)
        
        logger.info("All pre-downloads completed successfully.")
        
    except Exception as e:
        logger.error(f"Failed to pre-download models: {e}")
        raise

if __name__ == "__main__":
    download_models()
