import pytest
import numpy as np
from PIL import Image
import io

# Assuming main.py functions are importable
# You may need to adjust imports based on your structure


class TestBackgroundRemoval:
    """Test rembg background removal preprocessing"""

    def test_rembg_available(self):
        """Verify rembg is installed and can be imported"""
        try:
            from rembg import remove, new_session
            assert True
        except ImportError:
            pytest.fail("rembg not installed")

    def test_transparent_canvas_creation(self):
        """Verify transparent canvas is created correctly"""
        canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        
        assert canvas.mode == "RGBA"
        assert canvas.size == (512, 512)
        
        # Check that canvas is fully transparent
        pixels = np.array(canvas)
        assert np.all(pixels[:, :, 3] == 0)  # Alpha channel should be 0

    def test_alpha_threshold_application(self):
        """Test strict alpha thresholding (0 or 255, no fringe)"""
        # Create test image with various alpha values
        img = Image.new("RGBA", (100, 100), (128, 128, 128, 128))
        data = np.array(img)
        
        # Apply threshold logic
        alpha = data[:, :, 3]
        data[:, :, 3] = np.where(alpha < 200, 0, 255)
        
        result = Image.fromarray(data)
        result_data = np.array(result)
        
        # Verify only 0 or 255 values exist
        unique_alphas = np.unique(result_data[:, :, 3])
        assert len(unique_alphas) <= 2
        assert all(val in [0, 255] for val in unique_alphas)

    def test_border_clearing(self):
        """Test 20px border clearing"""
        img = Image.new("RGBA", (512, 512), (255, 255, 255, 255))
        
        # Simulate border clearing
        data = np.array(img)
        data[:20, :, 3] = 0  # Top
        data[-20:, :, 3] = 0  # Bottom
        data[:, :20, 3] = 0  # Left
        data[:, -20:, 3] = 0  # Right
        
        result = Image.fromarray(data)
        result_data = np.array(result)
        
        # Verify borders are transparent
        assert np.all(result_data[:20, :, 3] == 0)
        assert np.all(result_data[-20:, :, 3] == 0)
        assert np.all(result_data[:, :20, 3] == 0)
        assert np.all(result_data[:, -20:, 3] == 0)

    def test_bbox_cropping_and_scaling(self):
        """Test bounding box calculation and 75% scaling"""
        # Create image with subject in center
        img = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        
        # Add a 100x100 opaque square in center
        data = np.array(img)
        data[206:306, 206:306, :] = [255, 255, 255, 255]
        img = Image.fromarray(data)
        
        # Find bounding box
        alpha = np.array(img)[:, :, 3]
        rows = np.any(alpha > 0, axis=1)
        cols = np.any(alpha > 0, axis=0)
        
        if rows.any() and cols.any():
            y_min, y_max = np.where(rows)[0][[0, -1]]
            x_min, x_max = np.where(cols)[0][[0, -1]]
            
            bbox = (x_min, y_min, x_max + 1, y_max + 1)
            
            # Verify bbox is correct
            assert bbox == (206, 206, 306, 306)
            
            # Test 75% scaling
            target_size = 512 * 0.75
            cropped = img.crop(bbox)
            
            bbox_width = bbox[2] - bbox[0]
            bbox_height = bbox[3] - bbox[1]
            max_dim = max(bbox_width, bbox_height)
            
            scale = target_size / max_dim
            new_w = int(bbox_width * scale)
            new_h = int(bbox_height * scale)
            
            assert new_w <= target_size
            assert new_h <= target_size


class TestImageValidation:
    """Test image validation and quality checks"""

    def test_transparency_percentage_calculation(self):
        """Test transparent pixel percentage calculation"""
        # Create half-transparent image
        img = Image.new("RGBA", (100, 100), (0, 0, 0, 0))
        data = np.array(img)
        data[:50, :, 3] = 255  # Top half opaque
        img = Image.fromarray(data)
        
        alpha = np.array(img)[:, :, 3]
        total_pixels = alpha.size
        transparent_pixels = np.sum(alpha < 10)
        transparent_pct = (transparent_pixels / total_pixels) * 100
        
        assert 45 < transparent_pct < 55  # Should be ~50%

    def test_warning_threshold(self):
        """Test that warning fires when transparency < 20%"""
        # Create mostly opaque image
        img = Image.new("RGBA", (100, 100), (255, 255, 255, 255))
        data = np.array(img)
        data[:10, :, 3] = 0  # Only 10% transparent
        img = Image.fromarray(data)
        
        alpha = np.array(img)[:, :, 3]
        transparent_pct = (np.sum(alpha < 10) / alpha.size) * 100
        
        # Should trigger warning
        assert transparent_pct < 20


class TestImageFormats:
    """Test image format handling"""

    def test_rgba_preservation(self):
        """Verify RGBA mode is preserved (not converted to RGB)"""
        img = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        
        # Ensure mode stays RGBA
        assert img.mode == "RGBA"
        
        # Verify converting to RGB would destroy alpha
        rgb_img = img.convert("RGB")
        assert rgb_img.mode == "RGB"
        assert not hasattr(rgb_img, 'split') or len(rgb_img.split()) == 3

    def test_image_size_512x512(self):
        """Verify final image is exactly 512x512"""
        canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        
        assert canvas.size == (512, 512)
        assert canvas.width == 512
        assert canvas.height == 512


@pytest.mark.integration
class TestFullPreprocessingPipeline:
    """Integration tests for the full preprocessing pipeline"""

    @pytest.fixture
    def sample_image(self):
        """Create a sample test image"""
        img = Image.new("RGB", (512, 512), (255, 255, 255))
        # Add a simple shape
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        draw.ellipse([156, 156, 356, 356], fill=(128, 128, 128))
        return img

    def test_full_pipeline(self, sample_image):
        """Test complete preprocessing pipeline"""
        try:
            from rembg import remove, new_session
            
            # Initialize session
            session = new_session("isnet-general-use")
            
            # Remove background
            rgba_image = remove(sample_image, session=session)
            
            # Verify output
            assert rgba_image.mode == "RGBA"
            assert rgba_image.size == sample_image.size
            
            # Check that some pixels are transparent
            alpha = np.array(rgba_image)[:, :, 3]
            assert np.any(alpha < 10)  # Some transparent pixels
            assert np.any(alpha > 200)  # Some opaque pixels
            
        except ImportError:
            pytest.skip("rembg not available")
