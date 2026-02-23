import { describe, it, expect, beforeEach } from 'vitest';
import { unstable_dev } from 'wrangler';

describe('D1 Database Integration Tests', () => {
  let worker;

  beforeEach(async () => {
    worker = await unstable_dev('backend/src/index.js', {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterEach(async () => {
    await worker.stop();
  });

  describe('Sessions Table', () => {
    it('should create a new session on generate', async () => {
      const resp = await worker.fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hobbies: ['Test1', 'Test2', 'Test3'] }),
      });

      const data = await resp.json();
      expect(data.session_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    }, 60000);

    it('should store hobbies as JSON in session', async () => {
      const hobbies = ['Photography', 'Hiking', 'Cooking'];
      const resp = await worker.fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hobbies }),
      });

      const { session_id } = await resp.json();

      // Verify by fetching status
      const statusResp = await worker.fetch(
        `/api/session/status?session_id=${session_id}`
      );
      const statusData = await statusResp.json();

      expect(statusData.session_id).toBe(session_id);
    }, 60000);

    it('should update selected_concept_id on selection', async () => {
      // Generate session
      const generateResp = await worker.fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hobbies: ['Test', 'Test', 'Test'] }),
      });

      const { session_id, concepts } = await generateResp.json();

      // Select concept
      await worker.fetch('/api/session/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id,
          asset_id: concepts[0].id,
        }),
      });

      // Verify selection
      const statusResp = await worker.fetch(
        `/api/session/status?session_id=${session_id}`
      );
      const statusData = await statusResp.json();

      expect(statusData.selected_concept_id).toBe(concepts[0].id);
    }, 60000);
  });

  describe('Assets Table', () => {
    it('should create 4 assets on generate', async () => {
      const resp = await worker.fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hobbies: ['Test', 'Test', 'Test'] }),
      });

      const { concepts } = await resp.json();
      expect(concepts).toHaveLength(4);

      concepts.forEach(concept => {
        expect(concept).toHaveProperty('id');
        expect(concept).toHaveProperty('image_url');
      });
    }, 60000);

    it('should set asset status to processing on selection', async () => {
      const generateResp = await worker.fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hobbies: ['Test', 'Test', 'Test'] }),
      });

      const { session_id, concepts } = await generateResp.json();

      await worker.fetch('/api/session/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id,
          asset_id: concepts[0].id,
        }),
      });

      const statusResp = await worker.fetch(
        `/api/session/status?session_id=${session_id}&asset_id=${concepts[0].id}`
      );
      const statusData = await statusResp.json();

      const selectedAsset = statusData.assets.find(a => a.id === concepts[0].id);
      expect(selectedAsset.status).toBe('processing');
    }, 60000);
  });
});
