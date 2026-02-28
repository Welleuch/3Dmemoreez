import * as THREE from 'three';
import { SUBTRACTION, ADDITION, Brush, Evaluator } from 'three-bvh-csg';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';

const evaluator = new Evaluator();
evaluator.usePrecomputedNormals = true;
evaluator.attributes = ['position', 'normal'];

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
 * Creates a cylinder with rounded top and bottom edges (fillet).
 */
function createRoundedCylinderGeometry(radius, height, bevel, segments = 64) {
    const points = [];
    const innerRadius = radius - bevel;
    const halfH = height / 2;

    // Bottom center part
    points.push(new THREE.Vector2(0, -halfH));
    points.push(new THREE.Vector2(innerRadius, -halfH));

    // Bottom corner arc
    for (let i = 1; i <= 8; i++) {
        const angle = (i / 8) * Math.PI * 0.5;
        points.push(new THREE.Vector2(
            innerRadius + Math.sin(angle) * bevel,
            -halfH + bevel - Math.cos(angle) * bevel
        ));
    }

    // Top corner arc
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 0.5 + Math.PI * 0.5;
        points.push(new THREE.Vector2(
            innerRadius + Math.sin(angle) * bevel,
            halfH - bevel - Math.cos(angle) * bevel
        ));
    }

    // Top center part
    points.push(new THREE.Vector2(innerRadius, halfH));
    points.push(new THREE.Vector2(0, halfH));

    return new THREE.LatheGeometry(points, segments);
}

/**
 * Generates a unified 3D printable model using CSG.
 * Ensures the pedestal is correctly positioned under the model base.
 */
/**
 * Generates only the engraved pedestal part. Used for live configuration UI.
 */
export async function createEngravedPedestalCSG(figurineMesh, providedBounds, line1, line2, padding = 0.35, height = 0.4) {
    console.log("[CSG] Generating Pedestal for config...");

    // 1. Calculate / Use Bounding Box
    let localBounds = providedBounds;
    if (!localBounds && figurineMesh) {
        figurineMesh.geometry.computeBoundingBox();
        localBounds = figurineMesh.geometry.boundingBox;
    }

    if (!localBounds) {
        throw new Error("No bounding box or figurine provided to CSG engine");
    }

    const { min, max } = localBounds;

    const modelWidth = (max.x - min.x);
    const modelDepth = (max.z - min.z);

    const radius = Math.max(modelWidth, modelDepth) / 2 + padding;
    const bevel = 0.05;

    const pedestalGeom = createRoundedCylinderGeometry(radius, height, bevel, 64);
    if (!pedestalGeom.getAttribute('normal')) pedestalGeom.computeVertexNormals();

    const pedestalBrush = new Brush(pedestalGeom);
    const centerX = (min.x + max.x) / 2;
    const centerZ = (min.z + max.z) / 2;
    // Top of cylinder sits 0.05 units *above* model bottom for solid contact
    const centerY = min.y + 0.05 - (height / 2);

    pedestalBrush.position.set(centerX, centerY, centerZ);
    pedestalBrush.updateMatrixWorld();

    let resultBrush = pedestalBrush;

    // 2. Engrave Text
    if (line1 || line2) {
        try {
            const font = await loadFont();
            const createTextBrush = (text, size, yOffset) => {
                if (!text || text.trim() === "") return null;
                const textThickness = 0.06;
                const textGeom = new TextGeometry(text, {
                    font: font,
                    size: size,
                    height: textThickness,
                    curveSegments: 8,
                });

                textGeom.computeBoundingBox();
                const textCenter = new THREE.Vector3();
                textGeom.boundingBox.getCenter(textCenter);
                textGeom.translate(-textCenter.x, -textCenter.y, 0);

                textGeom.translate(0, 0, -0.04);
                wrapGeometry(textGeom, radius);

                const brush = new Brush(textGeom);
                brush.position.set(centerX, centerY + yOffset, centerZ);
                brush.updateMatrixWorld();
                return brush;
            };

            const fontSize1 = Math.min(height * 0.35, radius * 0.2);
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

    return resultBrush.geometry;
}

/**
 * Merges a figurine and a pedestal into a single monolithic 3D printable mass.
 */
export async function createUnionCSG(figurineMesh, pedestalGeometry) {
    if (!figurineMesh || !pedestalGeometry) {
        throw new Error("Missing mesh for union");
    }

    // Capture clean geometries
    const figurineGeom = figurineMesh.geometry.clone();
    if (!figurineGeom.getAttribute('normal')) figurineGeom.computeVertexNormals();

    const figurineBrush = new Brush(figurineGeom);
    // Explicitly set figurine at its "grounded" position (Y=0 relative to its base)
    // We ignore the landing animation position for the export
    figurineBrush.position.set(0, 0, 0);
    figurineBrush.updateMatrixWorld();

    const pedestalBrush = new Brush(pedestalGeometry);
    // Pedestal already has its calculated offset relative to 0,0,0 figurine base
    pedestalBrush.position.set(0, 0, 0);
    pedestalBrush.updateMatrixWorld();

    try {
        const finalResult = evaluator.evaluate(figurineBrush, pedestalBrush, ADDITION);
        return finalResult.geometry;
    } catch (err) {
        console.error("[CSG] Union failed:", err);
        return figurineGeom;
    }
}


