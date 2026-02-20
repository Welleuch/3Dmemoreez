export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // CORS headers
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        try {
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
                headers.append("Content-Type", "image/png"); // Flux returns PNG/JPEG

                return new Response(object.body, { headers });
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
                const systemPrompt = `You are an expert 3D Design Engineer specializing in Additive Manufacturing (FDM).
Task: Convert user hobbies/facts into 4 distinct image generation prompts for Flux Schnell.
Constraints for Printability:
1. Base: Every object must have a clearly defined, flat, and wide structural base.
2. Overhangs: Avoid any floating parts or angles steeper than 45 degrees. Use organic, tapered transitions.
3. Thickness: Ensure no part of the model is thinner than 2.0mm. No "whisker" or "hair" textures.
4. Style: Keywords: "Solid 3D sculpture, gray matte finish, flat base, manifold geometry, studio lighting, high contrast, non-porous surface."

Safety & Style Constraints:
- NO HUMAN SKIN or Realistic Human Features.
- Focus on STYLIZED FIGURINES, MONOLITHIC STATUES, or CLAY SCULPTURES.
- Avoid any suggestive or visceral descriptions.
- Use strictly object-centric language (e.g., "A stone-textured figurine of a swimmer" instead of "A realistic swimmer").

Generate 4 concepts:
- 2 Literal: Sturdy, fused mashups of the objects.
- 2 Artistic: Solid, sculptural, low-poly or "clay-sculpted" aesthetic.

CRITICAL: Return ONLY a raw JSON object. No conversational text. No markdown formatting.
Structure:
{
  "concepts": [
    { "title": "Concept Name", "prompt": "Flux prompt...", "type": "Literal" },
    { "title": "Concept Name", "prompt": "Flux prompt...", "type": "Literal" },
    { "title": "Concept Name", "prompt": "Flux prompt...", "type": "Artistic" },
    { "title": "Concept Name", "prompt": "Flux prompt...", "type": "Artistic" }
  ]
}`;

                const llamaResponse = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
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
                const generationPromises = result.concepts.map(async (concept) => {
                    try {
                        const fluxResponse = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
                            prompt: concept.prompt,
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

                const concepts = await Promise.all(generationPromises);

                return new Response(JSON.stringify({
                    session_id: sessionId,
                    concepts: concepts
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

                // Fixed localtunnel subdomain — restart tunnel with: npx localtunnel --port 8000 --subdomain 3dmemoreez-ai
                const AI_ENGINE_URL = "https://3dmemoreez-ai.loca.lt/generate-3d";
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

            return new Response("Not Found", { status: 404, headers: corsHeaders });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
    },
};
