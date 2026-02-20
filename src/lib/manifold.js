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
