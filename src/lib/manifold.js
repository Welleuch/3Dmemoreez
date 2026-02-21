import initManifold from 'manifold-3d';

let manifold = null;

export async function getManifold() {
    if (manifold) return manifold;
    manifold = await initManifold();
    return manifold;
}

export function createPedestal(Manifold, modelBounds, padding = 0.2, height = 0.5) {
    const { min, max } = modelBounds;
    const width = (max.x - min.x) + padding * 2;
    const depth = (max.z - min.z) + padding * 2;

    // Create a cube for the pedestal
    const pedestal = Manifold.cube([width, height, depth], true);

    // Shift it to be centered under the model
    const centerX = (min.x + max.x) / 2;
    const centerZ = (min.z + max.z) / 2;
    const bottomY = min.y - height / 2;

    return pedestal.translate([centerX, bottomY, centerZ]);
}

/**
 * Compute the real geometric volume of a Manifold mesh and estimate
 * PLA material weight for FDM printing.
 *
 * Uses the same mathematics as PrusaSlicer:
 *   - Shell volume  = surface_area × shell_thickness (perimeters × nozzle_diameter)
 *   - Infill volume = (total_volume - shell_volume) × infill_ratio
 *   - Printed volume = shell_volume + infill_volume
 *   - Material grams = printed_volume × PLA_density (1.24 g/cm³)
 *
 * @param {Manifold} manifoldMesh  - The merged/final Manifold object (model + pedestal)
 * @param {object}   options
 * @param {number}   options.infillRatio      - e.g. 0.15 for 15% infill (default)
 * @param {number}   options.perimeterCount   - number of perimeter walls, default 3
 * @param {number}   options.nozzleDiameter   - in mm, default 0.4mm
 *
 * @returns {{ volume_mm3, surface_area_mm2, material_grams, priceEur }}
 */
export function estimatePrintMaterial(manifoldMesh, options = {}) {
    const {
        infillRatio = 0.15,
        perimeterCount = 3,
        nozzleDiameter = 0.4,
    } = options;

    // Real geometric volume — divergence theorem on the closed mesh
    // NOT the bounding box volume
    const volume_mm3 = manifoldMesh.volume();
    const surface_area_mm2 = manifoldMesh.surfaceArea();

    // Shell = outer perimeter walls (solid material, no infill)
    const shellThickness_mm = perimeterCount * nozzleDiameter;  // 3 × 0.4 = 1.2mm
    const shellVolume_mm3 = surface_area_mm2 * shellThickness_mm;

    // Interior = total minus shell, filled at infill_ratio
    const interiorVolume_mm3 = Math.max(0, volume_mm3 - shellVolume_mm3);
    const printedVolume_mm3 = shellVolume_mm3 + (interiorVolume_mm3 * infillRatio);

    // PLA density: 1.24 g/cm³ = 0.00124 g/mm³
    const PLA_DENSITY_G_PER_MM3 = 0.00124;
    const material_grams = printedVolume_mm3 * PLA_DENSITY_G_PER_MM3;

    // Pricing formula (see specification.md §8)
    const SERVICE_FEE_EUR = 12.00;
    const MATERIAL_RATE_EUR_PER_G = 0.03;
    const priceBeforeShipping = material_grams * MATERIAL_RATE_EUR_PER_G + SERVICE_FEE_EUR;

    return {
        volume_mm3: Math.round(volume_mm3),
        surface_area_mm2: Math.round(surface_area_mm2),
        material_grams: Math.round(material_grams * 10) / 10,   // 1 decimal place
        priceBeforeShipping: Math.round(priceBeforeShipping * 100) / 100,
        // Debug breakdown (useful to compare against PrusaSlicer output)
        _debug: {
            shellVolume_mm3: Math.round(shellVolume_mm3),
            interiorVolume_mm3: Math.round(interiorVolume_mm3),
            printedVolume_mm3: Math.round(printedVolume_mm3),
            shellThickness_mm,
            infillRatio,
        },
    };
}
