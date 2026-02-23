import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';

// Mock three-bvh-csg
vi.mock('three-bvh-csg', () => ({
  Evaluator: vi.fn().mockImplementation(() => ({
    evaluate: vi.fn((a, b, operation) => {
      // Return a mock geometry
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0], 3));
      return geometry;
    }),
  })),
  ADDITION: 0,
  SUBTRACTION: 1,
  INTERSECTION: 2,
}));

describe('CSG Engine', () => {
  let csgEngine;

  beforeEach(async () => {
    // Dynamically import to apply mocks
    csgEngine = await import('@/lib/csgEngine.js');
  });

  describe('createPedestal', () => {
    it('should create a cylindrical pedestal with correct dimensions', () => {
      const radius = 2;
      const height = 1;
      const pedestal = csgEngine.createPedestal(radius, height);

      expect(pedestal).toBeInstanceOf(THREE.BufferGeometry);
      expect(pedestal.attributes.position).toBeDefined();
      expect(pedestal.attributes.normal).toBeDefined();
    });

    it('should handle edge case of zero radius', () => {
      expect(() => csgEngine.createPedestal(0, 1)).toThrow();
    });

    it('should handle edge case of negative height', () => {
      expect(() => csgEngine.createPedestal(2, -1)).toThrow();
    });
  });

  describe('wrapTextToCylinder', () => {
    it('should transform flat text geometry to cylindrical coordinates', () => {
      const textGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array([
        1, 0, 0,  // vertex 1
        2, 1, 0,  // vertex 2
        1, 2, 0,  // vertex 3
      ]);
      textGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const radius = 5;
      const wrapped = csgEngine.wrapTextToCylinder(textGeometry, radius);

      expect(wrapped).toBeInstanceOf(THREE.BufferGeometry);
      const wrappedPositions = wrapped.attributes.position.array;
      
      // Verify transformation occurred (positions should be different)
      expect(wrappedPositions[0]).not.toBe(positions[0]);
      expect(wrappedPositions[1]).toBe(positions[1]); // Y should remain unchanged
    });
  });

  describe('sanitizeGeometry', () => {
    it('should remove all attributes except position and normal', () => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0], 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0], 2));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1], 3));

      const sanitized = csgEngine.sanitizeGeometry(geometry);

      expect(sanitized.attributes.position).toBeDefined();
      expect(sanitized.attributes.normal).toBeDefined();
      expect(sanitized.attributes.uv).toBeUndefined();
      expect(sanitized.attributes.color).toBeUndefined();
    });
  });

  describe('normalizeToGround', () => {
    it('should translate geometry so minimum Y is at 0', () => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array([
        0, 5, 0,   // min Y = 5
        0, 10, 0,
        0, 7, 0,
      ]);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const normalized = csgEngine.normalizeToGround(geometry);
      const newPositions = normalized.attributes.position.array;

      // Check that minimum Y is now 0
      const minY = Math.min(newPositions[1], newPositions[4], newPositions[7]);
      expect(minY).toBeCloseTo(0, 5);
    });
  });

  describe('calculateBoundingBox', () => {
    it('should return correct bounding box dimensions', () => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array([
        -1, -2, -3,
        1, 2, 3,
        0, 0, 0,
      ]);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const bbox = csgEngine.calculateBoundingBox(geometry);

      expect(bbox.min.x).toBe(-1);
      expect(bbox.min.y).toBe(-2);
      expect(bbox.min.z).toBe(-3);
      expect(bbox.max.x).toBe(1);
      expect(bbox.max.y).toBe(2);
      expect(bbox.max.z).toBe(3);
    });
  });
});
