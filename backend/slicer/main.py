import os
import json
import subprocess
import tempfile
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import trimesh
import numpy as np

app = FastAPI(title="3Dmemoreez Slicer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

PRUSASLICER_PATH = "/app/squashfs-root/usr/bin/prusa-slicer"
INPUT_DIR = Path("/input")
OUTPUT_DIR = Path("/output")

INPUT_DIR.mkdir(exist_ok=True)
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


@app.get("/health")
async def health():
    return {"status": "ok", "slicer": "ready"}


@app.post("/slice")
async def slice_stl(file: UploadFile = File(...)):
    if not file.filename.endswith((".stl", ".STL")):
        raise HTTPException(status_code=400, detail="Only STL files supported")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".stl") as tmp_in:
        content = await file.read()
        tmp_in.write(content)
        tmp_in_path = tmp_in.name

    input_stl = Path(tmp_in_path)
    output_gcode = OUTPUT_DIR / f"{input_stl.stem}.gcode"
    warnings = []
    model_repaired = False

    try:
        try:
            import trimesh

            mesh = trimesh.load(str(input_stl))  # type: ignore
            bbox = mesh.bounding_box  # type: ignore
            raw_extents = bbox.extents  # type: ignore
            raw_height = raw_extents[2]

            # STL files don't store units - Hunyuan3D exports in inches
            # Convert from inches to mm (1 inch = 25.4mm)
            current_dims_mm = raw_extents * 25.4  # [X, Y, Z] in mm

            # Scale so the largest dimension fits within TARGET_HEIGHT_MM
            max_dim = max(current_dims_mm)
            scale_factor = TARGET_HEIGHT_MM / max_dim

            print(
                f"DEBUG: raw_extents={raw_extents}, max_dim={max_dim}, scale_factor={scale_factor}"
            )

            if abs(scale_factor - 1.0) > 0.001:
                scaled_mesh = mesh.copy()  # type: ignore
                # Combined scale: convert from inches (×25.4) then scale to target (×scale_factor)
                combined_scale = 25.4 * scale_factor
                scaled_mesh.apply_scale(combined_scale)  # type: ignore
                scaled_path = input_stl.parent / f"{input_stl.stem}_scaled.stl"
                scaled_mesh.export(str(scaled_path))  # type: ignore

                # Verify export (trimesh will read it as mm)
                verify_mesh = trimesh.load(str(scaled_path))
                verify_height = verify_mesh.bounding_box.extents[2]
                print(f"DEBUG: exported height={verify_height}mm")

                input_stl = scaled_path
                warnings.append(
                    f"Model scaled from {max_dim:.1f}mm (target: {TARGET_HEIGHT_MM:.1f}mm)"
                )
        except ImportError:
            pass

        cmd = [
            PRUSASLICER_PATH,
            "--slice",
            "--repair",
            f"--nozzle-diameter={SLICER_CONFIG['nozzle_diameter']}",
            f"--layer-height={SLICER_CONFIG['layer_height']}",
            f"--fill-density={SLICER_CONFIG['infill']}",
            f"--filament-type={SLICER_CONFIG['filament_type']}",
            f"--filament-density={SLICER_CONFIG['filament_density']}",
            f"--temperature={SLICER_CONFIG['temperature']}",
            f"--bed-temperature={SLICER_CONFIG['bed_temperature']}",
            f"--first-layer-temperature={SLICER_CONFIG['first_layer_temperature']}",
            "--support-material"
            if SLICER_CONFIG["support_material"]
            else "--no-support-material",
            "--export-gcode",
            f"--output={output_gcode}",
            str(input_stl),
        ]
        cmd = [c for c in cmd if c]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
        )

        stderr_lower = result.stderr.lower()
        if "repair" in stderr_lower or "non-manifold" in stderr_lower:
            model_repaired = True
            warnings.append("Model was automatically repaired")

        if result.returncode != 0 and not output_gcode.exists():
            raise HTTPException(
                status_code=500, detail=f"Slicing failed: {result.stderr}"
            )

        stats = parse_slicer_output(result.stdout, result.stderr, str(output_gcode))

        if output_gcode.exists():
            gcode_size = output_gcode.stat().st_size
            gcode_filename = output_gcode.name
        else:
            gcode_size = 0
            gcode_filename = None

        return JSONResponse(
            {
                "status": "success",
                "stats": stats,
                "model_repaired": model_repaired,
                "warnings": warnings,
                "gcode_filename": gcode_filename,
                "gcode_size": gcode_size,
            }
        )

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Slicing timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        for f in [
            Path(tmp_in_path),
            Path(tmp_in_path).parent / f"{Path(tmp_in_path).stem}_scaled.stl",
        ]:
            if f.exists():
                try:
                    os.remove(f)
                except:
                    pass


@app.get("/gcode/{filename}")
async def download_gcode(filename: str):
    gcode_path = OUTPUT_DIR / filename
    if not gcode_path.exists():
        raise HTTPException(status_code=404, detail="G-code file not found")
    return FileResponse(
        gcode_path, media_type="application/octet-stream", filename=filename
    )


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
            except:
                pass

        if "support" in line.lower() and "filament" in line.lower():
            try:
                if "[mm]" in line:
                    mm = float(line.split("[mm]")[0].split()[-1].replace(",", "."))
                    support_material_grams = round(mm * 1.24 / 1000, 2)
                elif "[m]" in line:
                    m = float(line.split("[m]")[0].split()[-1].replace(",", "."))
                    support_material_grams = round(m * 1.24, 2)
                elif "[g]" in line:
                    support_material_grams = float(
                        line.split("[g]")[0].split()[-1].replace(",", ".")
                    )
            except:
                pass

        if "print time" in line.lower():
            try:
                time_str = line.split("print time")[-1].strip()
                seconds = parse_time_to_seconds(time_str)
                if seconds:
                    print_time_seconds = seconds
            except:
                pass

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
                                if material_grams is None:
                                    material_grams = round(total_g, 2)
                            except:
                                pass
                        if "; total filament used [m]" in lower_line:
                            try:
                                total_m = float(stripped.split("=")[-1].strip())
                                material_grams = round(total_m * 1.24, 2)
                            except:
                                pass
                        if "estimated printing time" in lower_line:
                            try:
                                time_str = stripped.split("=")[-1].strip()
                                seconds = parse_time_to_seconds(time_str)
                                if seconds and print_time_seconds is None:
                                    print_time_seconds = seconds
                            except:
                                pass
                        
                        # Track which part we are printing (Support vs Model)
                        if lower_line.startswith(";type:support"):
                            in_support = True
                        elif lower_line.startswith(";type:"):
                            in_support = False

                    # Handle extrusion resets
                    elif stripped.startswith("G92 "):
                        parts = stripped.split()
                        for p in parts:
                            if p.startswith("E"):
                                try:
                                    last_e = float(p[1:])
                                except:
                                    pass
                    
                    # Handle extrusions
                    elif stripped.startswith("G1 ") or stripped.startswith("G0 "):
                        parts = stripped.split()
                        for p in parts:
                            if p.startswith("E"):
                                try:
                                    new_e = float(p[1:])
                                    delta = new_e - last_e
                                    if delta > 0:
                                        total_e += delta
                                        if in_support:
                                            support_e_total += delta
                                    last_e = new_e
                                except:
                                    pass
        except:
            pass

    if material_grams is None:
        material_grams = 0.0
    if support_material_grams is None:
        support_material_grams = 0.0
    if print_time_seconds is None:
        print_time_seconds = 0

    if total_e > 0 and support_e_total > 0 and material_grams > 0:
        support_ratio = support_e_total / total_e
        # material_grams actually holds the *total* right now due to parsing logic
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


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
