import pytest
import tempfile
import os
from pathlib import Path


class TestScalingCalculations:
    """Test STL scaling from inches to mm"""

    def test_inch_to_mm_conversion(self):
        """Verify 1 inch = 25.4mm conversion"""
        inches = 1.0
        mm = inches * 25.4
        assert mm == 25.4

    def test_hunyuan_output_scaling(self):
        """Test typical Hunyuan3D output scaling"""
        # Hunyuan3D outputs in inches
        raw_extents_inches = [1.95, 1.99, 0.95]
        
        # Convert to mm
        extents_mm = [dim * 25.4 for dim in raw_extents_inches]
        
        expected = [49.53, 50.546, 24.13]
        for actual, exp in zip(extents_mm, expected):
            assert abs(actual - exp) < 0.01

    def test_target_height_scaling(self):
        """Test scaling to target height of 100mm"""
        target_height = 100.0
        current_dims_mm = [49.53, 50.546, 24.13]
        
        max_dim = max(current_dims_mm)
        scale_factor = target_height / max_dim
        
        # Combined scale: inch->mm + target scaling
        combined_scale = 25.4 * scale_factor
        
        # Verify largest dimension becomes 100mm
        scaled_dims = [dim * scale_factor for dim in current_dims_mm]
        assert abs(max(scaled_dims) - target_height) < 0.01


class TestGCodeParsing:
    """Test G-code parsing for material calculation"""

    def test_extrusion_line_detection(self):
        """Test detection of extrusion moves (G1 with E parameter)"""
        lines = [
            "G1 X10 Y10 E0.5",  # Extrusion
            "G1 X20 Y20",  # Travel move (no E)
            "G0 X30 Y30",  # Rapid move
            "G1 X40 Y40 E1.0",  # Extrusion
        ]
        
        extrusion_count = 0
        for line in lines:
            if line.startswith("G1") and " E" in line:
                extrusion_count += 1
        
        assert extrusion_count == 2

    def test_extrusion_value_extraction(self):
        """Test extracting E value from G-code line"""
        line = "G1 X100.5 Y200.3 Z0.2 E5.12345"
        
        # Extract E value
        parts = line.split()
        e_value = None
        for part in parts:
            if part.startswith("E"):
                e_value = float(part[1:])
                break
        
        assert e_value == 5.12345

    def test_support_material_detection(self):
        """Test detection of support material sections"""
        gcode = """
; printing object
G1 X10 Y10 E1.0
; support material
G1 X20 Y20 E0.5
; printing object
G1 X30 Y30 E1.0
"""
        
        lines = gcode.strip().split('\n')
        in_support = False
        support_lines = 0
        
        for line in lines:
            if '; support material' in line.lower():
                in_support = True
            elif '; printing object' in line.lower():
                in_support = False
            elif in_support and line.startswith('G1') and ' E' in line:
                support_lines += 1
        
        assert support_lines == 1

    def test_material_weight_calculation(self):
        """Test material weight calculation from extrusion length"""
        # PLA density: 1.24 g/cm³
        # Filament diameter: 1.75mm
        # Nozzle diameter: 0.4mm
        
        filament_density = 1.24  # g/cm³
        filament_diameter = 1.75  # mm
        
        # Calculate cross-sectional area
        import math
        radius = filament_diameter / 2
        area_mm2 = math.pi * (radius ** 2)
        area_cm2 = area_mm2 / 100
        
        # Total extrusion length in mm
        total_extrusion_mm = 10000  # Example
        
        # Volume in cm³
        volume_cm3 = (total_extrusion_mm / 10) * area_cm2
        
        # Weight in grams
        weight_g = volume_cm3 * filament_density
        
        assert weight_g > 0
        assert isinstance(weight_g, float)


class TestPrusaSlicerConfig:
    """Test PrusaSlicer configuration parameters"""

    def test_valid_layer_height(self):
        """Test layer height is within valid range"""
        layer_height = 0.2
        nozzle_diameter = 0.4
        
        # Layer height should be 25-75% of nozzle diameter
        min_height = nozzle_diameter * 0.25
        max_height = nozzle_diameter * 0.75
        
        assert min_height <= layer_height <= max_height

    def test_infill_percentage(self):
        """Test infill is valid percentage"""
        infill = "20%"
        
        # Extract numeric value
        infill_value = int(infill.rstrip('%'))
        
        assert 0 <= infill_value <= 100

    def test_temperature_ranges(self):
        """Test temperatures are within safe ranges for PLA"""
        first_layer_temp = 215
        temp = 210
        bed_temp = 60
        
        # PLA typical ranges
        assert 190 <= first_layer_temp <= 220
        assert 190 <= temp <= 220
        assert 50 <= bed_temp <= 70

    def test_filament_density(self):
        """Test PLA density is correct"""
        filament_density = 1.24  # g/cm³
        
        # PLA density range: 1.23-1.25 g/cm³
        assert 1.23 <= filament_density <= 1.25


@pytest.mark.integration
class TestSlicerIntegration:
    """Integration tests for slicer service"""

    @pytest.fixture
    def temp_stl_file(self):
        """Create a temporary STL file for testing"""
        # Minimal valid STL (single triangle)
        stl_content = b"""solid test
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 1 0 0
    vertex 0 1 0
  endloop
endfacet
endsolid test
"""
        with tempfile.NamedTemporaryFile(suffix='.stl', delete=False) as f:
            f.write(stl_content)
            temp_path = f.name
        
        yield temp_path
        
        # Cleanup
        if os.path.exists(temp_path):
            os.unlink(temp_path)

    def test_stl_file_validation(self, temp_stl_file):
        """Test STL file can be read and validated"""
        assert os.path.exists(temp_stl_file)
        assert os.path.getsize(temp_stl_file) > 0
        
        # Check file extension
        assert temp_stl_file.endswith('.stl')

    def test_output_gcode_structure(self):
        """Test G-code output has expected structure"""
        # Mock G-code output
        gcode = """
; generated by PrusaSlicer
; filament_density = 1.24
M104 S210
M140 S60
G28
G1 X10 Y10 E1.0
"""
        
        lines = gcode.strip().split('\n')
        
        # Should have comments
        assert any(line.startswith(';') for line in lines)
        
        # Should have M-codes (temperature)
        assert any(line.startswith('M') for line in lines)
        
        # Should have G-codes (movement)
        assert any(line.startswith('G') for line in lines)


class TestPricingCalculation:
    """Test pricing calculation logic"""

    def test_material_cost_calculation(self):
        """Test material cost at $0.03/gram"""
        material_grams = 64.21
        cost_per_gram = 0.03
        
        material_cost = material_grams * cost_per_gram
        
        assert abs(material_cost - 1.93) < 0.01

    def test_total_price_calculation(self):
        """Test total price calculation"""
        material_grams = 64.21
        material_cost = material_grams * 0.03
        service_fee = 12.00
        shipping = 9.00
        
        total = material_cost + service_fee + shipping
        
        # Should match the screenshot: $22.93
        assert abs(total - 22.93) < 0.01

    def test_price_formatting(self):
        """Test price is formatted to 2 decimal places"""
        price = 22.9263
        formatted = f"${price:.2f}"
        
        assert formatted == "$22.93"
