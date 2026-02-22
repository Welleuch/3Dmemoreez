import * as THREE from 'three';
import { SUBTRACTION, ADDITION, Brush, Evaluator } from 'three-bvh-csg';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';

import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry';

const evaluator = new Evaluator();
evaluator.usePrecomputedNormals = true;
evaluator.attributes = ['position', 'normal']; // Force ignore UVs globally

/**
 * Bends a geometry around a cylinder of the given radius.
 * Text is assumed to be on the XY plane.
 */
function wrapGeometry(geometry, radius) {
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);

        // Map X to Angle around the cylinder
        const angle = x / radius;

        // Polar transformation
        // (radius + z) ensures the thickness 'z' of the text is preserved as radial depth
        pos.setX(i, (radius + z) * Math.sin(angle));
        pos.setZ(i, (radius + z) * Math.cos(angle));
        pos.setY(i, y);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
}

/**
 * Loads the font for engraving
 */
export async function loadFont() {
    const loader = new FontLoader();
    try {
        return await loader.loadAsync('/fonts/helvetiker_bold.json');
    } catch (e) {
        console.warn("[CSG] Failed to load local JSON font, trying CDN fallback");
        return await loader.loadAsync('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json');
    }
}

/**
 * Generates a unified 3D printable model using CSG.
 * Ensures the pedestal is correctly positioned under the model base.
 */
export async function createEngravedPedestalCSG(figurineMesh, _unusedBounds, line1, line2, padding = 0.35, height = 0.4) {
    console.log("[CSG] Starting CSG Pipeline...");

    // 1. Calculate Local Bounding Box for absolute accuracy
    figurineMesh.geometry.computeBoundingBox();
    const localBounds = figurineMesh.geometry.boundingBox;
    const { min, max } = localBounds;

    const modelWidth = (max.x - min.x);
    const modelDepth = (max.z - min.z);

    const radius = Math.max(modelWidth, modelDepth) / 2 + padding;
    const width = radius * 2; // Fixed ReferenceError

    // Using CylinderGeometry for a premium, circular look
    const pedestalGeom = new THREE.CylinderGeometry(radius, radius, height, 64);

    // STL models don't have UVs, so we strip them from the pedestal to avoid mismatch errors
    pedestalGeom.deleteAttribute('uv');

    const pedestalBrush = new Brush(pedestalGeom);

    const centerX = (min.x + max.x) / 2;
    const centerZ = (min.z + max.z) / 2;
    // POSITIONING: Top of cylinder = model bottom + 0.1 overlap
    const centerY = min.y + 0.1 - (height / 2);

    pedestalBrush.position.set(centerX, centerY, centerZ);
    pedestalBrush.updateMatrixWorld();

    let resultBrush = pedestalBrush;

    // 2. Engrave Text
    if (line1 || line2) {
        try {
            const font = await loadFont();
            // In a cylinder, the front face is 'radius' away from center
            const frontFaceZ = centerZ + radius;

            const createTextBrush = (text, size, yOffset) => {
                if (!text || text.trim() === "") return null;
                const textThickness = 0.06; // Shallow but clear definition
                const textGeom = new TextGeometry(text, {
                    font: font,
                    size: size,
                    height: textThickness,
                    curveSegments: 8,
                });

                // 1. Center the geometry horizontally first so x=0 is the center of the word
                textGeom.computeBoundingBox();
                const textCenter = new THREE.Vector3();
                textGeom.boundingBox.getCenter(textCenter);
                textGeom.translate(-textCenter.x, 0, 0);

                // 2. Wrap it around the cylinder curve
                // We sink it exactly 0.04 units (approx 0.4mm - one nozzle diameter)
                // z in [-0.04, 0.02] relative to radius
                textGeom.translate(0, 0, -0.04);
                wrapGeometry(textGeom, radius);

                // 3. Clean attributes for CSG
                const cleanGeom = new THREE.BufferGeometry();
                cleanGeom.setAttribute('position', textGeom.getAttribute('position'));
                cleanGeom.setAttribute('normal', textGeom.getAttribute('normal'));

                const brush = new Brush(cleanGeom);
                // Position brush at pedestal center
                brush.position.set(centerX, centerY + yOffset - textCenter.y, centerZ);
                brush.updateMatrixWorld();
                return brush;
            };

            const fontSize1 = Math.min(height * 0.35, width * 0.1);
            // Increased vertical separation (yOffset)
            if (line1) {
                const b1 = createTextBrush(line1, fontSize1, height * 0.22);
                if (b1) {
                    resultBrush = evaluator.evaluate(resultBrush, b1, SUBTRACTION);
                    resultBrush.updateMatrixWorld();
                }
            }

            if (line2) {
                const b2 = createTextBrush(line2, fontSize1 * 0.75, -height * 0.22);
                if (b2) {
                    resultBrush = evaluator.evaluate(resultBrush, b2, SUBTRACTION);
                    resultBrush.updateMatrixWorld();
                }
            }
        } catch (err) {
            console.error("[CSG] Engraving failed:", err);
        }
    }

    // 3. Union with Figurine
    console.log("[CSG] Merging figurine...");

    // Create a clean figurine geometry with only the necessary attributes
    const cleanFigurineGeom = new THREE.BufferGeometry();
    cleanFigurineGeom.setAttribute('position', figurineMesh.geometry.getAttribute('position'));
    cleanFigurineGeom.setAttribute('normal', figurineMesh.geometry.getAttribute('normal'));
    if (figurineMesh.geometry.index) {
        cleanFigurineGeom.setIndex(figurineMesh.geometry.index);
    }

    const figurineBrush = new Brush(cleanFigurineGeom);
    figurineBrush.position.copy(figurineMesh.position);
    figurineBrush.rotation.copy(figurineMesh.rotation);
    figurineBrush.scale.copy(figurineMesh.scale);
    figurineBrush.updateMatrixWorld();

    try {
        const finalResult = evaluator.evaluate(resultBrush, figurineBrush, ADDITION);
        return finalResult.geometry;
    } catch (err) {
        console.error("[CSG] Union failed:", err);
        return resultBrush.geometry;
    }
}
