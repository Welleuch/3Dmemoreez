import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { mockAPIResponses, mockSTLContent, mockGCodeContent } from './mockData.js';

const API_BASE = 'https://3d-memoreez-orchestrator.walid-elleuch.workers.dev';

// Define request handlers
export const handlers = [
  // Health check
  http.get(`${API_BASE}/api/health`, () => {
    return HttpResponse.json(mockAPIResponses.health);
  }),

  // Generate concepts
  http.post(`${API_BASE}/api/generate`, async ({ request }) => {
    const body = await request.json();
    
    if (!body.hobbies || body.hobbies.length !== 3) {
      return new HttpResponse(null, { status: 400 });
    }
    
    return HttpResponse.json(mockAPIResponses.generate);
  }),

  // Select concept
  http.post(`${API_BASE}/api/session/select`, async ({ request }) => {
    const body = await request.json();
    
    if (!body.session_id || !body.asset_id) {
      return new HttpResponse(null, { status: 400 });
    }
    
    return HttpResponse.json({ status: 'processing' });
  }),

  // Session status
  http.get(`${API_BASE}/api/session/status`, ({ request }) => {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');
    
    if (!sessionId) {
      return new HttpResponse(null, { status: 400 });
    }
    
    return HttpResponse.json(mockAPIResponses.sessionStatus);
  }),

  // Get asset (STL or image)
  http.get(`${API_BASE}/api/assets/:key`, ({ params }) => {
    const { key } = params;
    
    if (key.endsWith('.stl')) {
      return new HttpResponse(mockSTLContent, {
        headers: { 'Content-Type': 'model/stl' },
      });
    }
    
    if (key.endsWith('.gcode')) {
      return new HttpResponse(mockGCodeContent, {
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    
    // Return mock PNG for images
    return new HttpResponse(new Uint8Array([137, 80, 78, 71]), {
      headers: { 'Content-Type': 'image/png' },
    });
  }),

  // Slice endpoint
  http.post(`${API_BASE}/api/slice`, async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return new HttpResponse(null, { status: 400 });
    }
    
    return HttpResponse.json(mockAPIResponses.slice);
  }),

  // Webhook (for testing)
  http.post(`${API_BASE}/api/webhook/runpod`, async ({ request }) => {
    const formData = await request.formData();
    
    return HttpResponse.json({ status: 'received' });
  }),
];

// Create and export mock server
export const mockServer = setupServer(...handlers);

// Setup/teardown helpers
export const setupMockServer = () => {
  beforeAll(() => mockServer.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => mockServer.resetHandlers());
  afterAll(() => mockServer.close());
};
