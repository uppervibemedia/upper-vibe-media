import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { amount, trackTitle, trackId, successUrl, cancelUrl } = await req.json();

    if (!amount || amount < 100) {
      return Response.json({ error: 'Minimum amount is $1 (100 cents)' }, { status: 400 });
    }

    // Try to get user for customer metadata (optional — tips work for non-logged-in users too)
    let userEmail = null;
    try {
      const user = await base44.auth.me();
      userEmail = user?.email || null;
    } catch {}

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: amount,
          product_data: {
            name: `Support: ${trackTitle || 'Upper Vibe Media'}`,
            description: 'Fan support for Upper Vibe Media 432 Hz music',
            images: [],
          },
        },
        quantity: 1,
      }],
      success_url: successUrl || `${req.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}&tip=1`,
      cancel_url: cancelUrl || req.headers.get('referer') || `${req.headers.get('origin')}/music`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        type: 'fan_tip',
        track_id: trackId || '',
        track_title: trackTitle || '',
        user_email: userEmail || 'guest',
      },
    });

    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Stripe tip error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});