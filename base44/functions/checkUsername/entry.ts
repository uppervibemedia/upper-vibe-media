import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Must be authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Please log in to create your Vibe World username." }, { status: 401 });
    }

    // Parse the requested username from the payload
    let body;
    try { body = await req.json(); } catch { body = {}; }
    const requested = (body.username || "").trim().toLowerCase();

    if (!requested || requested.length < 3) {
      return Response.json({ available: false, error: "Username must be at least 3 characters." });
    }
    if (requested.length > 20) {
      return Response.json({ available: false, error: "Username must be 20 characters or less." });
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(requested)) {
      return Response.json({ available: false, error: "Use only letters, numbers, and underscores." });
    }

    // Check uniqueness using service role (bypasses RLS that limits users to their own record)
    const existing = await base44.asServiceRole.entities.User.filter({
      world_username_lower: requested,
    });

    // Exclude the current user — they should be able to keep their own username
    const takenByOthers = existing.filter((u) => u.id !== user.id);

    if (takenByOthers.length > 0) {
      return Response.json({
        available: false,
        error: "That username is already taken. Try another one.",
      });
    }

    return Response.json({ available: true });
  } catch (error) {
    return Response.json({ error: error.message || "We could not check that username. Please try again." }, { status: 500 });
  }
});