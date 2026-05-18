import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { amountCents, trackId, trackTitle, trackArtist, successUrl, cancelUrl } = await req.json();

    if (!amountCents || amountCents < 100) {
      return Response.json({ error: 'Minimum support amount is $1.' }, { status: 400 });
    }

    // Try to get logged-in user — support works for guests too
    let user = null;
    try { user = await base44.auth.me(); } catch {}

    const description = trackTitle
      ? `Support for "${trackTitle}"${trackArtist ? ` by ${trackArtist}` : ''}`
      : 'Support Upper Vibe Media';

    const origin = req.headers.get('origin') || 'https://uppervibemedia.com';

    const sessionParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: 'Support Upper Vibe Media',
              description,
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl || `${origin}${trackId ? `/song/${trackId}?supported=1` : '/?supported=1'}`,
      cancel_url: cancelUrl || (trackId ? `${origin}/song/${trackId}` : `${origin}/`),
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        type: 'fan_support',
        track_id: trackId || '',
        track_title: trackTitle || '',
        user_email: user?.email || 'guest',
      },
    };

    // Attach customer if logged in and has a Stripe ID
    if (user?.stripeCustomerId) {
      sessionParams.customer = user.stripeCustomerId;
    } else if (user?.email) {
      sessionParams.customer_email = user.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`Fan support checkout created: $${amountCents / 100} for track ${trackId}`);
    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Support checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});