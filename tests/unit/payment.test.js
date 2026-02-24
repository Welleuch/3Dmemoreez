import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../../backend/src/index.js';

vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_123');
vi.stubEnv('RESEND_API_KEY', 're_test_123');

const mockConstructEvent = vi.fn((body, sig, secret) => {
    if (sig !== 't=123,v1=signature') throw new Error('Invalid signature');
    return {
        type: 'checkout.session.completed',
        data: {
            object: {
                metadata: { orderId: 'ord_123' },
                payment_intent: 'pi_123'
            }
        }
    };
});

vi.mock('stripe', () => {
    const StripeMock = vi.fn().mockImplementation(() => {
        return {
            checkout: {
                sessions: {
                    create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' })
                }
            },
            webhooks: {
                constructEvent: mockConstructEvent
            }
        };
    });
    return {
        Stripe: StripeMock
    };
});

const mockResend = {
    emails: {
        send: vi.fn()
    }
};

vi.mock('resend', () => ({
    Resend: vi.fn(() => mockResend)
}));

describe('Payment endpoints', () => {

    const env = {
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
        RESEND_API_KEY: 're_test_123',
        PROVIDER_EMAIL: 'provider@test.com',
        DB: {
            prepare: vi.fn()
        },
        ASSETS_BUCKET: {
            get: vi.fn()
        }
    };

    const ctx = { waitUntil: vi.fn() };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup generic mock for D1 Database
        const baseDbMock = {
            bind: vi.fn().mockReturnThis(),
            first: vi.fn().mockResolvedValue({
                stl_r2_path: 'mock/path.stl',
                receiver_first_name: 'Test',
                receiver_last_name: 'User',
                user_email: 'test@test.com',
                shipping_address: '123 Test St',
                material_grams: 50,
                gcode_r2_path: 'mock/path.gcode'
            }),
            run: vi.fn().mockResolvedValue({})
        };
        env.DB.prepare.mockReturnValue(baseDbMock);
    });

    it('should create a checkout session successfully', async () => {
        // Mock global crypto using vitest
        vi.stubGlobal('crypto', {
            randomUUID: () => '12345678-1234-1234-1234-123456789abc'
        });

        const request = new Request('http://localhost/api/checkout/create-session', {
            method: 'POST',
            body: JSON.stringify({
                session_id: 'sess-123',
                asset_id: 'asset-123',
                receiver_first_name: 'John',
                receiver_last_name: 'Doe',
                email: 'john@example.com',
                shipping_address: '123 Main St',
                stats: { total_material_grams: 50, estimated_print_time_seconds: 1800, total_material_cost: 1.5 }
            })
        });

        const response = await worker.fetch(request, env, ctx);
        const resultText = await response.text();

        if (response.status !== 200) {
            throw new Error(`Checkout API Failed: ${resultText}`);
        }

        const result = JSON.parse(resultText);

        expect(response.status).toBe(200);
        expect(result.url).toBe('https://checkout.stripe.com/test');
    });

    it('should process stripe webhook successfully', async () => {
        const request = new Request('http://localhost/api/webhook/stripe', {
            method: 'POST',
            headers: { 'stripe-signature': 't=123,v1=signature' },
            body: 'mock raw body'
        });

        const response = await worker.fetch(request, env, ctx);

        const resultText = await response.text();
        if (response.status !== 200) {
            throw new Error(`Webhook API Failed: ${resultText}`);
        }

        const result = JSON.parse(resultText);

        expect(response.status).toBe(200);
        expect(result.received).toBe(true);

        // Verify emails were sent
        expect(mockResend.emails.send).toHaveBeenCalledTimes(2);
    });
});
