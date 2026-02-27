import runpod
import os
import subprocess
import tempfile
import base64
from pathlib import Path
import requests
import io
import trimesh
import numpy as np

# PrusaSlicer configuration
PRUSASLICER_PATH = "/app/squashfs-root/usr/bin/prusa-slicer"
OUTPUT_DIR = Path("/output")
OUTPUT_DIR.mkdir(exist_ok=True)

SLICER_CONFIG = {
    "nozzle_diameter": 0.4,
    "layer_height": 0.2,
    "infill": "20%",
    "filament_type": "PLA",
    "filament_density": 1.24,
    "temperature": 210,
    "bed_temperature": 60,
    "first_layer_temperature": 215,
    "support_material": True,
}

TARGET_HEIGHT_MM = 100.0
MATERIAL_COST_PER_GRAM = 0.03

def parse_time_to_seconds(time_str: str) -> int:
    time_str = time_str.lower().strip()
    total_seconds = 0
    h_idx = time_str.find("h")
    m_idx = time_str.find("m")
    s_idx = time_str.find("s")
    if h_idx > 0:
        hours = int("".join(c for c in time_str[:h_idx] if c.isdigit() or c == "."))
        total_seconds += int(hours * 3600)
    if m_idx > 0:
        part = time_str[max(0, h_idx + 1) : m_idx]
        minutes = int("".join(c for c in part if c.isdigit() or c == "."))
        total_seconds += int(minutes * 60)
    if s_idx > 0:
        part = time_str[max(0, max(h_idx, m_idx) + 1) : s_idx]
        seconds = int("".join(c for c in part if c.isdigit() or c == "."))
        total_seconds += seconds
    return total_seconds

def parse_slicer_output(stdout: str, stderr: str, gcode_path: str = None):
    output = stdout + "\n" + stderr
    material_grams = None
    support_material_grams = None
    print_time_seconds = None

    for line in output.split("\n"):
        line = line.strip()
        if "filament used [mm]" in line.lower() or "filament used [m]" in line.lower():
            try:
                if "[mm]" in line:
                    mm = float(line.split("[mm]")[0].split()[-1].replace(",", "."))
                    material_grams = round(mm * 1.24 / 1000, 2)
                elif "[m]" in line:
                    m = float(line.split("[m]")[0].split()[-1].replace(",", "."))
                    material_grams = round(m * 1.24, 2)
            except: pass

        if "support" in line.lower() and "filament" in line.lower():
            try:
                if "[mm]" in line:
                    mm = float(line.split("[mm]")[0].split()[-1].replace(",", "."))
                    support_material_grams = round(mm * 1.24 / 1000, 2)
                elif "[m]" in line:
                    m = float(line.split("[m]")[0].split()[-1].replace(",", "."))
                    support_material_grams = round(m * 1.24, 2)
            except: pass

        if "print time" in line.lower():
            try:
                time_str = line.split("print time")[-1].strip()
                seconds = parse_time_to_seconds(time_str)
                if seconds: print_time_seconds = seconds
            except: pass

    support_e_total = 0.0
    total_e = 0.0
    last_e = 0.0
    in_support = False

    if gcode_path and os.path.exists(gcode_path):
        try:
            with open(gcode_path, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    stripped = line.strip()
                    if stripped.startswith(";"):
                        lower_line = stripped.lower()
                        if "; total filament used [g]" in lower_line:
                            try:
                                total_g = float(stripped.split("=")[-1].strip())
                                if material_grams is None: material_grams = round(total_g, 2)
                            except: pass
                        if "estimated printing time" in lower_line:
                            try:
                                time_str = stripped.split("=")[-1].strip()
                                seconds = parse_time_to_seconds(time_str)
                                if seconds and print_time_seconds is None: print_time_seconds = seconds
                            except: pass
                        if lower_line.startswith(";type:support"): in_support = True
                        elif lower_line.startswith(";type:"): in_support = False
                    elif stripped.startswith("G92 "):
                        parts = stripped.split()
                        for p in parts:
                            if p.startswith("E"):
                                try: last_e = float(p[1:])
                                except: pass
                    elif stripped.startswith("G1 ") or stripped.startswith("G0 "):
                        parts = stripped.split()
                        for p in parts:
                            if p.startswith("E"):
                                try:
                                    new_e = float(p[1:])
                                    delta = new_e - last_e
                                    if delta > 0:
                                        total_e += delta
                                        if in_support: support_e_total += delta
                                    last_e = new_e
                                except: pass
        except: pass

    if material_grams is None: material_grams = 0.0
    if support_material_grams is None: support_material_grams = 0.0
    if print_time_seconds is None: print_time_seconds = 0

    if total_e > 0 and support_e_total > 0 and material_grams > 0:
        support_ratio = support_e_total / total_e
        actual_total = material_grams 
        support_material_grams = round(actual_total * support_ratio, 2)
        material_grams = round(actual_total - support_material_grams, 2)

    total_material_grams = round(material_grams + support_material_grams, 2)
    total_material_cost = round(total_material_grams * MATERIAL_COST_PER_GRAM, 2)

    hours = print_time_seconds // 3600
    minutes = (print_time_seconds % 3600) // 60

    return {
        "material_grams": material_grams,
        "support_material_grams": support_material_grams,
        "total_material_grams": total_material_grams,
        "total_material_cost": total_material_cost,
        "print_time_seconds": print_time_seconds,
        "print_time_display": f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m",
    }

def handler(job):
    job_input = job.get("input", {})
    stl_url = job_input.get("stl_url")
    stl_base64 = job_input.get("stl_base64")
    
    if not stl_url and not stl_base64:
        return {"error": "Missing stl_url or stl_base64"}

    try:
        # 1. Get STL Content (Download or Decode)
        stl_content = None
        if stl_base64:
            logger.info("Processing STL from base64 data...")
            stl_content = base64.b64decode(stl_base64)
        else:
            logger.info(f"Downloading STL from {stl_url}")
            resp = requests.get(stl_url, timeout=60)
            resp.raise_for_status()
            stl_content = resp.content
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".stl") as tmp_in:
            tmp_in.write(stl_content)
            tmp_in_path = Path(tmp_in.name)

        input_stl = tmp_in_path
        
        # 2. Scaling logic
        mesh = trimesh.load(str(input_stl))
        bbox = mesh.bounding_box
        raw_extents = bbox.extents
        current_dims_mm = raw_extents * 25.4 # conversion from inches
        max_dim = max(current_dims_mm)
        scale_factor = TARGET_HEIGHT_MM / max_dim
        
        if abs(scale_factor - 1.0) > 0.001:
            scaled_mesh = mesh.copy()
            scaled_mesh.apply_scale(25.4 * scale_factor)
            input_stl = input_stl.parent / f"{input_stl.stem}_scaled.stl"
            scaled_mesh.export(str(input_stl))

        # 3. Running Slicer
        output_gcode = OUTPUT_DIR / f"{input_stl.stem}.gcode"
        cmd = [
            PRUSASLICER_PATH, "--slice", "--repair",
            f"--nozzle-diameter={SLICER_CONFIG['nozzle_diameter']}",
            f"--layer-height={SLICER_CONFIG['layer_height']}",
            f"--fill-density={SLICER_CONFIG['infill']}",
            f"--filament-type={SLICER_CONFIG['filament_type']}",
            f"--filament-density={SLICER_CONFIG['filament_density']}",
            f"--temperature={SLICER_CONFIG['temperature']}",
            f"--bed-temperature={SLICER_CONFIG['bed_temperature']}",
            f"--first-layer-temperature={SLICER_CONFIG['first_layer_temperature']}",
            "--support-material" if SLICER_CONFIG["support_material"] else "--no-support-material",
            "--export-gcode", f"--output={output_gcode}",
            str(input_stl),
        ]
        
        result = subprocess.run([c for c in cmd if c], capture_output=True, text=True, timeout=300)
        
        if result.returncode != 0 and not output_gcode.exists():
            return {"error": f"Slicing failed: {result.stderr}"}

        stats = parse_slicer_output(result.stdout, result.stderr, str(output_gcode))
        
        # 4. Read G-code and encode to base64
        with open(output_gcode, "rb") as f:
            gcode_base64 = base64.b64encode(f.read()).decode("utf-8")

        return {
            "status": "success",
            "stats": stats,
            "gcode_base64": gcode_base64,
            "filename": output_gcode.name
        }

    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}
    finally:
        # Cleanup
        try: os.remove(tmp_in_path)
        except: pass
        try: os.remove(input_stl)
        except: pass
        try: os.remove(output_gcode)
        except: pass

runpod.serverless.start({"handler": handler})
