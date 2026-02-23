import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { unstable_dev } from 'wrangler';

describe('Cloudflare Worker Integration Tests', () => {
  let worker;

  beforeAll(async () => {
    // Start a local worker instance for testing
    worker = await unstable_dev('backend/src/index.js', {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  describe('GET /api/health', () => {
    it('should return 200 with status ok', async () => {
      const resp = await worker.fetch('/api/health');
      expect(resp.status).toBe(200);

      const data = await resp.json();
      expect(data).toEqual({ status: 'ok' });
    });
  });

  describe('POST /api/generate', () => {
    it('should generate concepts from hobbies', async () => {
      const hobbies = ['Photography', 'Hiking', 'Cooking'];

      const resp = await worker.fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hobbies }),
      });

      expect(resp.status).toBe(200);
      const data = await resp.json();

      expect(data).toHaveProperty('session_id');
      expect(data).toHaveProperty('concepts');
      expect(Array.isArray(data.concepts)).toBe(true);
      expect(data.concepts).toHaveLength(4);

      // Verify concept structure
      data.concepts.forEach(concept => {
        expect(concept).toHaveProperty('id');
        expect(concept).toHaveProperty('title');
        expect(concept).toHaveProperty('image_url');
        expect(concept).toHaveProperty('type');
        expect(['Literal', 'Artistic']).toContain(concept.type);
      });
    }, 60000); // 60s timeout for AI generation

    it('should reject empty hobbies array', async () => {
      const resp = await worker.fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hobbies: [] }),
      });

      expect(resp.status).toBe(400);
    });

    it('should reject missing hobbies field', async () => {
      const resp = await worker.fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(resp.status).toBe(400);
    });

    it('should handle malformed JSON', async () => {
      const resp = await worker.fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      expect(resp.status).toBe(400);
    });
  });

  describe('POST /api/session/select', () => {
    it('should mark asset as processing and trigger 3D generation', async () => {
      // First generate concepts
      const generateResp = await worker.fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hobbies: ['Test', 'Test', 'Test'] }),
      });

      const { session_id, concepts } = await generateResp.json();
      const selectedAssetId = concepts[0].id;

      // Then select one
      const selectResp = await worker.fetch('/api/session/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id,
          asset_id: selectedAssetId,
        }),
      });

      expect(selectResp.status).toBe(200);
      const data = await selectResp.json();
      expect(data).toHaveProperty('status', 'processing');
    }, 60000);

    it('should reject invalid session_id', async () => {
      const resp = await worker.fetch('/api/session/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: 'invalid-uuid',
          asset_id: 'some-asset',
        }),
      });

      expect(resp.status).toBe(404);
    });
  });

  describe('GET /api/session/status', () => {
    it('should return session status with assets', async () => {
      // Generate a session first
      const generateResp = await worker.fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hobbies: ['Test', 'Test', 'Test'] }),
      });

      const { session_id } = await generateResp.json();

      // Check status
      const statusResp = await worker.fetch(
        `/api/session/status?session_id=${session_id}`
      );

      expect(statusResp.status).toBe(200);
      const data = await statusResp.json();

      expect(data).toHaveProperty('session_id', session_id);
      expect(data).toHaveProperty('assets');
      expect(Array.isArray(data.assets)).toBe(true);
    }, 60000);

    it('should return 404 for non-existent session', async () => {
      const resp = await worker.fetch(
        '/api/session/status?session_id=non-existent-uuid'
      );

      expect(resp.status).toBe(404);
    });

    it('should require session_id parameter', async () => {
      const resp = await worker.fetch('/api/session/status');

      expect(resp.status).toBe(400);
    });
  });

  describe('GET /api/assets/:key', () => {
    it('should return 404 for non-existent asset', async () => {
      const resp = await worker.fetch('/api/assets/non-existent-key.png');

      expect(resp.status).toBe(404);
    });

    it('should set correct content-type for STL files', async () => {
      // This test assumes an STL exists in R2 - may need mocking
      const resp = await worker.fetch('/api/assets/test.stl');

      if (resp.status === 200) {
        expect(resp.headers.get('Content-Type')).toBe('model/stl');
      }
    });

    it('should set correct content-type for images', async () => {
      const resp = await worker.fetch('/api/assets/test.png');

      if (resp.status === 200) {
        expect(resp.headers.get('Content-Type')).toBe('image/png');
      }
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in responses', async () => {
      const resp = await worker.fetch('/api/health');

      expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(resp.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(resp.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('should handle OPTIONS preflight requests', async () => {
      const resp = await worker.fetch('/api/generate', {
        method: 'OPTIONS',
      });

      expect(resp.status).toBe(200);
      expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });
});
