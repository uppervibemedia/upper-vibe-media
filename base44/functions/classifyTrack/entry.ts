import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CLASSIFICATION_PROMPT = (track) => `
You are the Upper Vibe Media AI Content Organizer. Analyze this music track and return a structured JSON classification.

TRACK METADATA:
- Title: ${track.title || "Unknown"}
- Artist Display: ${track.artist_display || "Not set"}
- Album: ${track.album || "None"}
- Description: ${track.description || "None"}
- Lyrics: ${track.lyrics ? track.lyrics.substring(0, 800) : "None"}
- Frequency Type: ${track.frequency_type || "standard"}
- Frequency Hz: ${track.frequency_hz || "Not set"}
- BPM: ${track.bpm || "Unknown"}
- Key: ${track.key || "Unknown"}

ARTIST PERSONA SIGNALS (use title, description, lyrics, and artist name to detect):
- Jmack So Lavish: luxury, hustle, money, discipline, boss mindset, masculine, high-status, motivation, grind
- Aura Rae: soft feminine glow, healing, peace, emotional reflection, spiritual softness, love, gentle
- S.O.N.A. To Infinity: futuristic, AI feminine, cosmic, neural, sci-fi, elevated consciousness, infinite, code
- iami: futuristic male, cyber, neural, digital, coded, tech-forward, machine, circuit
- Stina So Lavish: feminine confidence, attraction, glow-up, elevated soft luxury, radiance, allure
- Kylo the Great: powerful, energetic, raw talent, unique sonic identity
- Upper Vibe Media: broad concept, educational, reprogramming, spiritual brand-wide, frequency, vibration, consciousness

AVAILABLE CATEGORIES: High Vibe Hip-Hop, 432 Hz, Exclusive Drops, Reprogramming Music, Healing & Meditation, Manifestation Music, Luxury Motivation, Upper Vibe Academy, New Releases, Featured

ACCESS TIERS: free, supporter, premium

SHELVES: Featured, New Releases, Artist Page, 432 Hz Shelf, High Vibe Hip-Hop Shelf, Exclusive Drops Shelf, Manifestation Music Shelf, Reprogramming Music Shelf, Healing & Meditation Shelf, Luxury Motivation Shelf

CLASSIFICATION RULES:
1. Assign 1 primary artist lane (or Upper Vibe Media if unclear)
2. Assign 1-4 relevant categories
3. Assign 1-3 access tiers (tracks can be on multiple)
4. Assign 1-4 shelves where the track should appear
5. Recommend is_downloadable=true only for premium/exclusive content
6. Give confidence scores 0-100 for each main recommendation
7. If any confidence < 75, set needs_human_review=true
8. Provide up to 2 alternate classification routes if primary confidence < 85

Return ONLY valid JSON in this exact structure:
{
  "suggested_primary_artist": "string",
  "suggested_categories": ["string"],
  "suggested_access_tiers": ["free"|"supporter"|"premium"],
  "suggested_shelves": ["string"],
  "is_downloadable": boolean,
  "download_tier_required": "premium",
  "confidence_scores": {
    "artist_lane": number,
    "categories": number,
    "access_tiers": number,
    "shelves": number,
    "overall": number
  },
  "reasoning_summary": "string (2-4 sentences explaining the classification)",
  "needs_human_review": boolean,
  "locked_artist_conflict": boolean,
  "alternate_recommendations": [
    {
      "label": "string",
      "suggested_primary_artist": "string",
      "suggested_categories": ["string"],
      "confidence": number,
      "reason": "string"
    }
  ]
}
`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { track } = await req.json();
    if (!track || !track.title) {
      return Response.json({ error: 'Track data with title is required' }, { status: 400 });
    }

    const prompt = CLASSIFICATION_PROMPT(track);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          suggested_primary_artist: { type: "string" },
          suggested_categories: { type: "array", items: { type: "string" } },
          suggested_access_tiers: { type: "array", items: { type: "string" } },
          suggested_shelves: { type: "array", items: { type: "string" } },
          is_downloadable: { type: "boolean" },
          download_tier_required: { type: "string" },
          confidence_scores: {
            type: "object",
            properties: {
              artist_lane: { type: "number" },
              categories: { type: "number" },
              access_tiers: { type: "number" },
              shelves: { type: "number" },
              overall: { type: "number" }
            }
          },
          reasoning_summary: { type: "string" },
          needs_human_review: { type: "boolean" },
          locked_artist_conflict: { type: "boolean" },
          alternate_recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                suggested_primary_artist: { type: "string" },
                suggested_categories: { type: "array", items: { type: "string" } },
                confidence: { type: "number" },
                reason: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({ classification: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});