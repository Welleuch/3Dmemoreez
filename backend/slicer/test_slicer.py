import requests
import sys
import os

SLICER_URL = "http://localhost:8001"


def test_slicer(stl_path):
    print(f"Testing slicer with: {stl_path}")
    print("-" * 50)

    with open(stl_path, "rb") as f:
        files = {"file": ("model.stl", f, "application/octet-stream")}
        response = requests.post(f"{SLICER_URL}/slice", files=files)

    if response.status_code != 200:
        print(f"ERROR: {response.status_code}")
        print(response.text)
        return

    data = response.json()
    stats = data["stats"]

    print("SLICING SUCCESSFUL")
    print("-" * 50)
    print(f"Material used:    {stats['material_grams']}g")
    print(f"Material cost:    €{stats['material_cost']}")
    print(f"Print time:       {stats['print_time_display']}")
    print(f"G-code size:      {data['gcode_size']} bytes")
    print("-" * 50)

    print()
    print("PRICING BREAKDOWN (Germany)")
    print("-" * 50)
    print(f"Material:         €{stats['material_cost']:.2f}")
    print(f"Service fee:      €12.00")
    print(f"Shipping:         €3.90")
    total = stats["material_cost"] + 12.00 + 3.90
    print(f"TOTAL:            €{total:.2f}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        stl_file = r"C:\Users\Administrator\Downloads\CatModel_test.stl"
        if os.path.exists(stl_file):
            print(f"No STL provided, using default: {stl_file}")
        else:
            print("Usage: python test_slicer.py <path_to_stl>")
            sys.exit(1)
    else:
        stl_file = sys.argv[1]

    try:
        r = requests.get(f"{SLICER_URL}/health")
        if r.status_code != 200:
            print("Slicer not ready!")
            sys.exit(1)
        print("Slicer health: OK")
    except Exception as e:
        print(f"Cannot connect to slicer: {e}")
        sys.exit(1)

    test_slicer(stl_file)
