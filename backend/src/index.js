export default {
    async fetch(request, env) {
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
4. Style: Keywords: "Solid 3D sculpture, gray matte finish, flat base, manifold geometry, studio lighting, high contrast."

Generate 4 concepts:
- 2 Literal: Sturdy, fused mashups of the objects.
- 2 Artistic: Solid, sculptural, low-poly or "clay-sculpted" aesthetic.

CRITICAL: Return ONLY a raw JSON object. No conversational text. No "Here are the concepts". No markdown formatting.
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
                            prompt: concept.prompt
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
                        // 2. Check if it's a Response object (common in some internal AI.run versions)
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
                        // 4. Check for .arrayBuffer() method (e.g. if it's a custom stream-like object)
                        else if (typeof fluxResponse.arrayBuffer === 'function') {
                            binaryData = await fluxResponse.arrayBuffer();
                        }
                        // 5. Fallback: stringify or just try passing it (it will likely fail if it's a random object)
                        else {
                            console.log("Unexpected fluxResponse type:", typeof fluxResponse);
                            binaryData = fluxResponse;
                        }

                        const assetId = crypto.randomUUID();
                        const safeKey = `concepts___${sessionId}___${assetId}.png`;

                        // Store in R2
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

            // 4. Handle Concept Selection
            if (url.pathname === "/api/session/select" && request.method === "POST") {
                const { session_id, concept_id } = await request.json();

                await env.DB.prepare(
                    "UPDATE Sessions SET selected_concept_id = ?, current_step = 'view', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
                ).bind(concept_id, session_id).run();

                return new Response(JSON.stringify({ success: true }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
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
