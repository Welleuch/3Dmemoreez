import { Stripe } from 'stripe';
import { Resend } from 'resend';

async function sendOrderEmails(env, orderId, apiUrlOrigin) {
    if (!env.RESEND_API_KEY) {
        console.log("RESEND_API_KEY not configured. Skipping emails.");
        return;
    }
    try {
        const order = await env.DB.prepare("SELECT * FROM Orders WHERE id = ?").bind(orderId).first();
        if (!order) {
            console.error(`Order ${orderId} not found for emailing.`);
            return;
        }

        const asset = await env.DB.prepare(
            "SELECT image_url FROM Assets WHERE session_id = ? AND status != 'failed' ORDER BY created_at DESC LIMIT 1"
        ).bind(order.session_id).first();

        // 3D Snapshot placeholder for now
        const referenceImageUrl = asset && asset.image_url ? `${apiUrlOrigin}${asset.image_url}` : 'https://placehold.co/600x400/eeeeee/999999?text=Reference+Image';
        const snapshotUrl = referenceImageUrl;

        const cleanStlPath = order.final_stl_r2_path ? order.final_stl_r2_path.replace('/api/assets/', '') : '';
        const cleanGcodePath = order.gcode_r2_path ? order.gcode_r2_path.replace('/api/assets/', '') : '';

        const stlDownloadUrl = cleanStlPath ? `${apiUrlOrigin}/api/assets/${cleanStlPath}` : '#';
        const gcodeDownloadUrl = cleanGcodePath ? `${apiUrlOrigin}/api/assets/${cleanGcodePath}` : '#';

        const resend = new Resend(env.RESEND_API_KEY);

        // 1. Admin Provider Alert
        const providerEmail = env.PROVIDER_EMAIL || 'walid.elleuch@outlook.de';
        try {
            const response = await resend.emails.send({
                from: '3Dmemoreez <onboarding@resend.dev>',
                to: providerEmail,
                subject: `🚨 NEW PRINT ORDER: ${order.receiver_first_name} ${order.receiver_last_name} (${orderId})`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                        <h2 style="color: #333;">New Order Requires Fulfillment</h2>
                        <div style="background: white; padding: 20px; border-radius: 8px;">
                            <h3 style="border-bottom: 1px solid #eee; padding-bottom: 10px;">Client Info</h3>
                            <p><strong>Name:</strong> ${order.receiver_first_name} ${order.receiver_last_name}</p>
                            <p><strong>Email:</strong> ${order.user_email}</p>
                            <p><strong>Shipping Address:</strong><br/>${order.shipping_address}</p>
                            
                            <h3 style="border-bottom: 1px solid #eee; padding-bottom: 10px;">Print Stats</h3>
                            <p><strong>Material Mass:</strong> ${order.material_grams}g PLA</p>
                            <p><strong>Estimated Print Time:</strong> ${order.print_duration_minutes} minutes</p>
                            <p><strong>Investment Collected:</strong> $${(order.price_cents / 100).toFixed(2)}</p>

                            <h3 style="border-bottom: 1px solid #eee; padding-bottom: 10px;">Production Assets</h3>
                            <div style="margin-bottom: 20px;">
                                <a href="${stlDownloadUrl}" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; margin-right: 10px; display: inline-block;">Download final .STL</a>
                                <a href="${gcodeDownloadUrl}" style="background-color: #28a745; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;">Download sliced .GCODE</a>
                            </div>

                            <h3 style="border-bottom: 1px solid #eee; padding-bottom: 10px;">Visual References</h3>
                            <div style="display: flex; gap: 20px;">
                                <div>
                                    <p><strong>2D Concept:</strong></p>
                                    <img src="${referenceImageUrl}" width="300" style="border-radius: 8px; border: 1px solid #ccc;" alt="2D Concept" />
                                </div>
                                <div>
                                    <p><strong>3D Snapshot (Placeholder):</strong></p>
                                    <img src="${snapshotUrl}" width="300" style="border-radius: 8px; border: 1px solid #ccc;" alt="3D Snapshot" />
                                </div>
                            </div>
                        </div>
                    </div>
                `
            });
            if (response.error) {
                console.error("[ERROR] Resend Admin Alert failed (API Error):", response.error);
            } else {
                console.log("[SUCCESS] Admin alert email sent. ID:", response.data?.id);
            }
        } catch (e) { console.error("[ERROR] Resend Admin Alert Exception:", e); }

        // 2. Client Order Receipt
        try {
            const response = await resend.emails.send({
                from: '3Dmemoreez <onboarding@resend.dev>',
                to: order.user_email,
                subject: `Your Custom 3D Artifact is in Production! (${orderId})`,
                html: `
                    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #07090d; color: #ffffff; padding: 40px 20px; border-radius: 16px;">
                        <div style="text-align: center; margin-bottom: 40px;">
                            <span style="font-size: 10px; font-weight: 900; letter-spacing: 0.5em; color: rgba(255,255,255,0.4); text-transform: uppercase;">Order Confirmed</span>
                            <h1 style="font-size: 28px; font-weight: 900; margin: 10px 0 0 0; font-style: italic;">The Artifact Enters <span style="color: #8b5cf6;">Production</span></h1>
                        </div>
                        
                        <p style="font-size: 16px; line-height: 1.6; color: rgba(255,255,255,0.8);">Hi ${order.receiver_first_name},</p>
                        <p style="font-size: 16px; line-height: 1.6; color: rgba(255,255,255,0.8);">Thank you for trusting 3Dmemoreez. Your custom 3D artifact has successfully entered our production queue. Our precision FDM machines are ready to crystallize your digital blueprint into reality.</p>
                        
                        <div style="background-color: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin: 30px 0;">
                            <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.2em; color: rgba(255,255,255,0.4); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-top: 0;">Order Summary</h3>
                            <p style="margin: 10px 0;"><strong style="color: #fff;">Order ID:</strong> <span style="color: rgba(255,255,255,0.7);">${orderId}</span></p>
                            <p style="margin: 10px 0;"><strong style="color: #fff;">Total Investment:</strong> <span style="color: rgba(255,255,255,0.7);">$${(order.price_cents / 100).toFixed(2)}</span></p>
                            <p style="margin: 10px 0;"><strong style="color: #fff;">Shipping To:</strong> <span style="color: rgba(255,255,255,0.7);">${order.shipping_address}</span></p>
                        </div>

                        <div style="margin: 30px 0; text-align: center;">
                            <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em; color: rgba(255,255,255,0.4);">Your Concept</p>
                            <img src="${referenceImageUrl}" style="width: 100%; max-width: 400px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); margin-top: 10px;" alt="2D Concept" />
                        </div>

                        <p style="font-size: 14px; line-height: 1.6; color: rgba(255,255,255,0.6); text-align: center; margin-top: 40px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px;">
                            You will receive another transmission with a tracking number as soon as your physical manifest leaves our facility. Securely yours,<br/><strong>The 3Dmemoreez Team</strong>
                        </p>
                    </div>
                `
            });
            if (response.error) {
                console.error("[ERROR] Resend Client Receipt failed (API Error):", response.error);
            } else {
                console.log("[SUCCESS] Client receipt email sent. ID:", response.data?.id);
            }
        } catch (e) { console.error("[ERROR] Resend Client Receipt Exception:", e); }
    } catch (e) {
        console.error("sendOrderEmails execution error:", e);
    }
}

async function sendShippingEmail(env, orderId, trackingNumber, apiUrlOrigin) {
    if (!env.RESEND_API_KEY) {
        console.log("RESEND_API_KEY not configured. Skipping shipping email.");
        return;
    }
    try {
        const order = await env.DB.prepare("SELECT * FROM Orders WHERE id = ?").bind(orderId).first();
        if (!order) return;

        const resend = new Resend(env.RESEND_API_KEY);

        await resend.emails.send({
            from: '3Dmemoreez <onboarding@resend.dev>',
            to: order.user_email,
            subject: `Action Required: Your 3D Artifact has Shipped! (${orderId})`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #07090d; color: #ffffff; padding: 40px 20px; border-radius: 16px;">
                    <h1 style="color: #8b5cf6; font-style: italic;">Transmitted to Logistics</h1>
                    <p>Hi ${order.receiver_first_name},</p>
                    <p>Your physical manifest has left our production facility and is now in transit.</p>
                    <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid rgba(255,255,255,0.1);">
                        <p><strong>Tracking Number:</strong> <span style="color: #8b5cf6; font-family: monospace;">${trackingNumber}</span></p>
                    </div>
                    <p style="font-size: 14px; color: rgba(255,255,255,0.6);">
                        Thank you for being part of the 3Dmemoreez journey.
                    </p>
                </div>
            `
        });
        console.log(`[SUCCESS] Shipping email sent for order ${orderId}`);
    } catch (e) {
        console.error("sendShippingEmail error:", e);
    }
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // CORS headers
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            // 0. Test Email Endpoint
            if (url.pathname === "/api/test-email" && request.method === "GET") {
                if (!env.RESEND_API_KEY) {
                    return new Response("No RESEND_API_KEY found in .dev.vars", { status: 500, headers: corsHeaders });
                }
                const resend = new Resend(env.RESEND_API_KEY);
                const providerEmail = url.searchParams.get("email") || env.PROVIDER_EMAIL || 'walid.elleuch@outlook.de';

                const response = await resend.emails.send({
                    from: '3Dmemoreez <onboarding@resend.dev>',
                    to: providerEmail,
                    subject: '🚨 Test Email from 3Dmemoreez',
                    html: '<p>This is a test email to verify the Resend connection.</p>'
                });

                return new Response(JSON.stringify(response), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            // 1. Health Check
            if (url.pathname === "/api/health") {
                return new Response(JSON.stringify({ status: "ok" }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            // 2. Serve Assets from R2
            if (url.pathname.startsWith("/api/assets/") && request.method === "GET") {
                const key = url.pathname.split("/").pop();
                const object = await env.ASSETS_BUCKET.get(key);

                if (!object) {
                    return new Response("Asset Not Found", { status: 404, headers: corsHeaders });
                }

                const headers = new Headers(corsHeaders);
                object.writeHttpMetadata(headers);
                headers.set("etag", object.httpEtag);

                if (key.endsWith(".gcode")) {
                    headers.append("Content-Type", "text/plain");
                } else if (key.endsWith(".stl")) {
                    headers.append("Content-Type", "model/stl");
                } else {
                    headers.append("Content-Type", "image/png"); // Default for Flux
                }

                return new Response(object.body, { headers });
            }

            // 2.1 Get Session Status (for Frontend Recovery)
            if (url.pathname === "/api/session/status" && request.method === "GET") {
                const sessionId = url.searchParams.get("session_id");
                if (!sessionId) {
                    return new Response(JSON.stringify({ error: "No session_id provided" }), {
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }

                const session = await env.DB.prepare(
                    "SELECT * FROM Sessions WHERE id = ?"
                ).bind(sessionId).first();

                if (!session) {
                    return new Response(JSON.stringify({ error: "Session not found" }), {
                        status: 404,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }

                const assets = await env.DB.prepare(
                    "SELECT * FROM Assets WHERE session_id = ?"
                ).bind(sessionId).all();

                return new Response(JSON.stringify({
                    session: {
                        ...session,
                        hobbies: JSON.parse(session.hobbies_json || "[]")
                    },
                    assets: assets.results
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            // 3. AI Generation (Llama + Flux)
            if (url.pathname === "/api/generate" && request.method === "POST") {
                const { hobbies } = await request.json();

                // Create a new session
                const sessionId = crypto.randomUUID();
                await env.DB.prepare(
                    "INSERT INTO Sessions (id, hobbies_json, current_step) VALUES (?, ?, ?)"
                ).bind(sessionId, JSON.stringify(hobbies), "selection").run();

                // 3.1 Llama Prompt Orchestration
                const systemPrompt = `You are an expert 3D Design Engineer specializing in Additive Manufacturing (FDM) and product photography.
Task: Convert user hobbies/facts into 4 distinct image generation prompts for Flux Schnell.

=== BACKGROUND & LIGHTING — NON-NEGOTIABLE ===
EVERY prompt MUST produce an image that looks like a professional product photo:
- PURE WHITE background. Not off-white, not gray, not gradient — pure white (#FFFFFF).
- NO shadows, NO drop shadows, NO reflections on the background.
- NO dark gradient behind the object.
- NO environmental context (no floor, no shelf, no studio visible).
- Isolated object floating or standing on a pure white void.
- Lighting: flat, even, diffuse studio softbox lighting. No dramatic rim lighting.

=== OBJECT STYLE ===
- The subject is ALWAYS a gray matte clay sculpture / gray PLA 3D-printed figurine.
- NO photorealistic textures. NO skin. NO hair. NO fur. NO glass. NO metals.
- Matte gray filament color — think: gray plastic toy or unpainted clay.
- Solid, monolithic form. No thin wires or floating disconnected parts.

=== 3D PRINTABILITY CONSTRAINTS ===
1. Base: Every object must have a clearly defined, flat, and wide structural base.
2. Overhangs: Avoid angles steeper than 45 degrees. Use organic, tapered transitions.
3. Thickness: No part thinner than 2.0mm. No whisker or hair textures.

=== SAFETY & COMPLIANCE — CRITICAL ===
- NO HUMAN SKIN, NO realistic anatomy, NO provocative poses.
- EVERYTHING must be SFW and family-friendly.
- If depicting humans: they MUST be fully clothed in thick, sculptural clothing or depicted as abstract, non-anatomical stone/clay silhouettes.
- Focus on inanimate objects, animals, or highly stylized, clothed figurines.
- AVOID words that often trigger false positives: "curvy", "fleshy", "skin", "naked", "tight", "sensual", "hot", "bottom", "top", "rear", "front" (when describing bodies).
- Instead use clinical/design terms: "structural", "volumetric", "geometric", "monolithic", "matte", "opaque".
- Use object-centric language (e.g., "A gray clay figurine of a hiker in a heavy coat" NOT "A realistic hiker").

Generate 4 concepts:
- 2 Literal: Sturdy, fused mashups of the objects.
- 2 Artistic: Solid, sculptural, low-poly or clay-sculpted aesthetic.

CRITICAL: Return ONLY a raw JSON object. NO conversational text. NO preamble (e.g., "Here are the prompts"). NO markdown code blocks.
START your response with "{" and END with "}".
Structure:
{
  "concepts": [
    { "title": "Concept Name", "prompt": "Flux prompt...", "type": "Literal" },
    { "title": "Concept Name", "prompt": "Flux prompt...", "type": "Literal" },
    { "title": "Concept Name", "prompt": "Flux prompt...", "type": "Artistic" },
    { "title": "Concept Name", "prompt": "Flux prompt...", "type": "Artistic" }
  ]
}`;

                const llamaResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `User Hobbies: ${hobbies.join(", ")}` }
                    ],
                    max_tokens: 1536
                });

                // Extract JSON from Llama response
                let result;
                const content = llamaResponse.response;
                try {
                    // More robust parsing: find first { and last }
                    const firstBrace = content.indexOf('{');
                    const lastBrace = content.lastIndexOf('}');
                    if (firstBrace === -1 || lastBrace === -1) {
                        throw new Error("No JSON object found in response");
                    }
                    const jsonString = content.substring(firstBrace, lastBrace + 1);
                    result = JSON.parse(jsonString);
                } catch (e) {
                    throw new Error(`Failed to parse Llama response into JSON. Raw response: ${content}`);
                }

                // 3.2 Flux Image Generation (Parallel)
                // Hard-coded suffix appended to every Flux prompt to guarantee white-background product shot
                const FLUX_SUFFIX = ", gray matte clay sculpture, SFW, family friendly, fully clothed, pure white studio background, product photography, isolated object, no shadows, no gradient, no environment, flat even lighting, professional product shot";

                const generationPromises = result.concepts.map(async (concept) => {
                    try {
                        const finalPrompt = concept.prompt + FLUX_SUFFIX;
                        console.log(`[FLUX] Prompt for "${concept.title}": ${finalPrompt.substring(0, 120)}...`);
                        const fluxResponse = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
                            prompt: finalPrompt,
                        });

                        if (!fluxResponse) {
                            throw new Error("AI.run returned no data");
                        }

                        let binaryData;

                        // 1. Check if it's already an acceptable binary type
                        if (fluxResponse instanceof ArrayBuffer ||
                            fluxResponse instanceof ReadableStream ||
                            fluxResponse instanceof Blob ||
                            (typeof Uint8Array !== 'undefined' && fluxResponse instanceof Uint8Array)) {
                            binaryData = fluxResponse;
                        }
                        // 2. Check if it's a Response object
                        else if (fluxResponse instanceof Response) {
                            binaryData = await fluxResponse.arrayBuffer();
                        }
                        // 3. Check if it's a plain object with a base64 'image' property
                        else if (typeof fluxResponse === 'object' && fluxResponse.image) {
                            const base64String = fluxResponse.image;
                            const binaryString = atob(base64String);
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            binaryData = bytes.buffer;
                        }
                        // 4. Check for .arrayBuffer() method
                        else if (typeof fluxResponse.arrayBuffer === 'function') {
                            binaryData = await fluxResponse.arrayBuffer();
                        }
                        // 5. Fallback
                        else {
                            binaryData = fluxResponse;
                        }

                        const assetId = crypto.randomUUID();
                        const safeKey = `concepts___${sessionId}___${assetId}.png`;

                        // Store binaryData directly in R2 (Removed bg-removal for stability)
                        await env.ASSETS_BUCKET.put(safeKey, binaryData, {
                            httpMetadata: { contentType: "image/png" }
                        });

                        // Store in D1
                        await env.DB.prepare(
                            "INSERT INTO Assets (session_id, image_url) VALUES (?, ?)"
                        ).bind(sessionId, `/api/assets/${safeKey}`).run();

                        return {
                            id: assetId,
                            url: `${url.origin}/api/assets/${safeKey}`,
                            title: concept.title,
                            type: concept.type,
                            score: Math.floor(Math.random() * 15) + 80
                        };
                    } catch (err) {
                        console.error(`Generation failed for ${concept.title}:`, err);
                        throw new Error(`Flux failed for ${concept.title}: ${err.message}`);
                    }
                });

                const generationResults = await Promise.allSettled(generationPromises);

                const finalConcepts = generationResults
                    .filter(res => res.status === 'fulfilled')
                    .map(res => res.value);

                if (finalConcepts.length === 0) {
                    const firstError = generationResults.find(res => res.status === 'rejected')?.reason?.message || "All image generation attempts failed due to safety filters.";
                    throw new Error(firstError);
                }

                return new Response(JSON.stringify({
                    session_id: sessionId,
                    concepts: finalConcepts
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            // 4. Handle Concept Selection & Trigger 3D Gen
            if (url.pathname === "/api/session/select" && request.method === "POST") {
                const { session_id, concept_id, image_url } = await request.json();

                // 1. Update Session Status in D1
                await env.DB.prepare(
                    "UPDATE Sessions SET selected_concept_id = ?, current_step = 'view', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
                ).bind(concept_id, session_id).run();

                // 2. Update Asset Status to 'processing'
                await env.DB.prepare(
                    "UPDATE Assets SET status = 'processing' WHERE session_id = ? AND image_url LIKE ?"
                ).bind(session_id, `%${concept_id}%`).run();

                const AI_ENGINE_URL = env.AI_ENGINE_URL || "https://3dmemoreez-ai.loca.lt/generate-3d";
                // Let the python script reply back dynamically to wherever the worker is hosted (e.g. 127.0.0.1:8787)
                const WEBHOOK_URL = `${url.origin}/api/webhook/runpod`;

                // Trigger 3D Engine
                try {
                    console.log("[AI-ENGINE] Triggering:", AI_ENGINE_URL);
                    console.log("[AI-ENGINE] Webhook:", WEBHOOK_URL);
                    const aiPromise = fetch(AI_ENGINE_URL, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "bypass-tunnel-reminder": "true",
                            "x-tunnel-skip-interstitial": "true",
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                        },
                        body: JSON.stringify({
                            image_url: image_url.startsWith('http') ? image_url : `${url.origin}${image_url}`,
                            webhook_url: WEBHOOK_URL,
                            session_id: session_id,
                            asset_id: concept_id
                        }),
                        signal: AbortSignal.timeout(60000) // 60s timeout for the trigger call
                    }).then(async r => {
                        const txt = await r.text();
                        console.log(`[AI-ENGINE] Response status: ${r.status}`);
                        console.log(`[AI-ENGINE] Response body (first 500 chars): ${txt.substring(0, 500)}`);
                        if (r.status !== 200) {
                            console.error(`[AI-ENGINE] Non-200 response! Status: ${r.status}`);
                        }
                    }).catch(e => {
                        console.error("[AI-ENGINE] Fetch exception:", e.message);
                    });

                    ctx.waitUntil(aiPromise);

                } catch (err) {
                    console.error("[AI-ENGINE] Trigger exception:", err.message);
                }

                return new Response(JSON.stringify({ success: true, message: "3D Generation Started" }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            // 5. Webhook Listener (from RunPod/Local AI)
            if (url.pathname === "/api/webhook/runpod" && request.method === "POST") {
                const formData = await request.formData();
                const session_id = formData.get("session_id");
                const asset_id = formData.get("asset_id");
                const status = formData.get("status");
                const file = formData.get("file");

                if (status === "completed" && file) {
                    const stlKey = `models___${session_id}___${asset_id}.stl`;

                    // Store STL in R2
                    await env.ASSETS_BUCKET.put(stlKey, await file.arrayBuffer(), {
                        httpMetadata: { contentType: "model/stl" }
                    });

                    // Update D1 - Stricter matching
                    await env.DB.prepare(
                        "UPDATE Assets SET status = 'completed', stl_r2_path = ? WHERE session_id = ? AND (id = ? OR image_url LIKE ?)"
                    ).bind(stlKey, session_id, asset_id, `%${asset_id}%`).run();

                    return new Response("OK", { status: 200 });
                } else {
                    // Handle failure
                    await env.DB.prepare(
                        "UPDATE Assets SET status = 'failed' WHERE session_id = ? AND (id = ? OR image_url LIKE ?)"
                    ).bind(session_id, asset_id, `%${asset_id}%`).run();
                    return new Response("Failed", { status: 400 });
                }
            }

            // 6. Polling Endpoint for Frontend
            if (url.pathname === "/api/session/status" && request.method === "GET") {
                const sessionId = url.searchParams.get("session_id");
                const assetId = url.searchParams.get("asset_id");

                let query = "SELECT status, stl_r2_path FROM Assets WHERE session_id = ?";
                let params = [sessionId];

                if (assetId) {
                    query += " AND (id = ? OR image_url LIKE ?)";
                    params.push(assetId, `%${assetId}%`);
                } else {
                    query += " AND status IN ('completed', 'processing', 'failed')";
                }

                query += " ORDER BY created_at DESC LIMIT 1";

                const asset = await env.DB.prepare(query).bind(...params).first();

                return new Response(JSON.stringify(asset || { status: 'not_started' }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            // 7. Serve STL from R2
            if (url.pathname.startsWith("/api/models/") && request.method === "GET") {
                const key = url.pathname.split("/").pop();
                const object = await env.ASSETS_BUCKET.get(key);

                if (!object) {
                    return new Response("Model Not Found", { status: 404, headers: corsHeaders });
                }

                const headers = new Headers(corsHeaders);
                headers.set("Content-Type", "model/stl");
                return new Response(object.body, { headers });
            }

            // 8. Trigger Slicer logic
            if (url.pathname === "/api/slice" && request.method === "POST") {
                const { session_id, asset_id } = await request.json();

                // Get STL from DB to find the R2 path
                const asset = await env.DB.prepare(
                    "SELECT stl_r2_path FROM Assets WHERE session_id = ? AND (id = ? OR image_url LIKE ?)"
                ).bind(session_id, asset_id, `%${asset_id}%`).first();

                if (!asset || !asset.stl_r2_path) {
                    return new Response(JSON.stringify({ error: "STL not found or not ready" }), { status: 404, headers: corsHeaders });
                }

                // Fetch STL binary from R2
                const stlObject = await env.ASSETS_BUCKET.get(asset.stl_r2_path);
                if (!stlObject) {
                    return new Response(JSON.stringify({ error: "STL file not found in R2" }), { status: 404, headers: corsHeaders });
                }

                const SLICER_URL = env.SLICER_URL || "https://3dmemoreez-slicer.loca.lt/slice";

                const formData = new FormData();
                const stlArrayBuffer = await stlObject.arrayBuffer();
                formData.append("file", new Blob([stlArrayBuffer]), "model.stl");

                const slicerRes = await fetch(SLICER_URL, {
                    method: "POST",
                    body: formData,
                    headers: { "bypass-tunnel-reminder": "true" }
                });

                if (!slicerRes.ok) {
                    throw new Error(`Slicer API returned ${slicerRes.status}`);
                }

                const slicerData = await slicerRes.json();

                if (slicerData.status === "success" && slicerData.gcode_filename) {
                    // Fetch G-code from slicer
                    const slicerBaseUrl = new URL(SLICER_URL).origin;
                    const gcodeUrl = `${slicerBaseUrl}/gcode/${slicerData.gcode_filename}`;
                    const gcodeRes = await fetch(gcodeUrl, { headers: { "bypass-tunnel-reminder": "true" } });

                    if (!gcodeRes.ok) throw new Error("Failed to download G-code from slicer");

                    // Save G-code to R2
                    const gcodeKey = `gcode___${session_id}___${asset_id}.gcode`;
                    await env.ASSETS_BUCKET.put(gcodeKey, await gcodeRes.arrayBuffer(), {
                        httpMetadata: { contentType: "text/plain" }
                    });

                    const gcodeR2Path = `/api/assets/${gcodeKey}`;

                    // Respond with pricing stats and gcode path
                    return new Response(JSON.stringify({
                        success: true,
                        stats: slicerData.stats,
                        gcode_r2_path: gcodeR2Path
                    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
                } else {
                    throw new Error(slicerData.detail || "Slicer failed to return success");
                }
            }

            // 9. Create Stripe Checkout Session
            if (url.pathname === "/api/checkout/create-session" && request.method === "POST") {
                const body = await request.json();
                const session_id = body.session_id;
                const asset_id = body.asset_id;
                const receiver_first_name = body.receiver_first_name || null;
                const receiver_last_name = body.receiver_last_name || null;
                const email = body.email || null;
                const shipping_address = body.shipping_address || null;
                const payment_method = body.payment_method || 'stripe';
                const stats = body.stats || {};

                if (!session_id) {
                    return new Response(JSON.stringify({ error: "Missing session_id" }), { status: 400, headers: corsHeaders });
                }

                if (!env.STRIPE_SECRET_KEY) {
                    return new Response(JSON.stringify({ error: "Missing Stripe config" }), { status: 500, headers: corsHeaders });
                }

                const stripe = new Stripe(env.STRIPE_SECRET_KEY);

                const materialGrams = stats?.total_material_grams || 0;
                const materialCost = stats?.total_material_cost || 0;
                const baseServiceFee = 12.00;
                const shippingFee = 9.00;
                const totalInvestment = materialCost + baseServiceFee + shippingFee;
                const totalCents = Math.round(totalInvestment * 100);

                const orderId = `ord_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;

                // Get asset paths
                const asset = await env.DB.prepare(
                    "SELECT stl_r2_path FROM Assets WHERE session_id = ? AND (id = ? OR image_url LIKE ?)"
                ).bind(session_id, asset_id, `%${asset_id}%`).first();

                // Save Order as pending
                await env.DB.prepare(`
                    INSERT INTO Orders (
                        id, session_id, user_email, receiver_first_name, receiver_last_name,
                        shipping_address, status, price_cents, material_grams, print_duration_minutes,
                        final_stl_r2_path, gcode_r2_path
                    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
                `).bind(
                    orderId, session_id, email, receiver_first_name, receiver_last_name,
                    shipping_address, totalCents, materialGrams,
                    Math.round((stats?.estimated_print_time_seconds || 0) / 60),
                    asset?.stl_r2_path || null,
                    `gcode___${session_id}___${asset_id}.gcode` // Assuming this path based on slicer logic
                ).run();

                const requestOrigin = request.headers.get("origin") || url.origin;

                // Configure Stripe Session based on selection
                const sessionOptions = {
                    customer_email: email,
                    metadata: { orderId, sessionId: session_id },
                    line_items: [
                        {
                            price_data: {
                                currency: 'usd',
                                product_data: {
                                    name: '3Dmemoreez Custom Figurine',
                                    description: `Precision printed in PLA (${materialGrams}g). Includes AI modeling and global express shipping.`,
                                },
                                unit_amount: totalCents,
                            },
                            quantity: 1,
                        },
                    ],
                    mode: 'payment',
                    success_url: `${requestOrigin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${requestOrigin}/checkout`,
                };

                if (payment_method === 'paypal') {
                    sessionOptions.payment_method_types = ['paypal'];
                } else if (payment_method === 'bank_transfer') {
                    // For SEPA/ACH, we use specialized types. SEPA is sepa_debit, ACH is us_bank_account.
                    // Defaulting to automatic for better coverage if bank is picked.
                    sessionOptions.automatic_payment_methods = { enabled: true };
                } else {
                    sessionOptions.automatic_payment_methods = { enabled: true };
                }

                const checkoutSession = await stripe.checkout.sessions.create(sessionOptions);

                return new Response(JSON.stringify({ url: checkoutSession.url }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            // 10. Stripe Webhook
            if (url.pathname === "/api/webhook/stripe" && request.method === "POST") {
                const signature = request.headers.get("stripe-signature");
                if (!signature || !env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY) {
                    return new Response("Webhook secret not configured", { status: 400 });
                }

                const stripe = new Stripe(env.STRIPE_SECRET_KEY);
                const body = await request.text();

                let event;
                try {
                    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
                } catch (err) {
                    console.error("Webhook signature verification failed:", err.message);
                    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
                }

                if (event.type === 'checkout.session.completed') {
                    const session = event.data.object;
                    const orderId = session.metadata.orderId;

                    // Update D1
                    await env.DB.prepare(
                        "UPDATE Orders SET status = 'paid', stripe_payment_intent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
                    ).bind(session.payment_intent, orderId).run();

                    ctx.waitUntil(sendOrderEmails(env, orderId, url.origin));
                }

                return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
            }

            // 11. Admin: Get all orders
            if (url.pathname === "/api/admin/orders" && request.method === "GET") {
                const auth = request.headers.get("Authorization");
                if (auth !== env.ADMIN_TOKEN) {
                    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
                }

                const orders = await env.DB.prepare(`
                    SELECT o.*, a.image_url 
                    FROM Orders o
                    LEFT JOIN Assets a ON o.session_id = a.session_id AND a.status != 'failed'
                    GROUP BY o.id
                    ORDER BY o.created_at DESC
                `).all();

                return new Response(JSON.stringify(orders.results), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            // 12. Admin: Mark as Shipped
            if (url.pathname.startsWith("/api/admin/orders/") && url.pathname.endsWith("/ship") && request.method === "POST") {
                const auth = request.headers.get("Authorization");
                if (auth !== env.ADMIN_TOKEN) {
                    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
                }

                const orderId = url.pathname.split("/")[4];
                const { tracking_number } = await request.json();

                await env.DB.prepare(
                    "UPDATE Orders SET status = 'shipped', tracking_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
                ).bind(tracking_number, orderId).run();

                ctx.waitUntil(sendShippingEmail(env, orderId, tracking_number, url.origin));

                return new Response(JSON.stringify({ success: true }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            return new Response("Not Found", { status: 404, headers: corsHeaders });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
    },
};
