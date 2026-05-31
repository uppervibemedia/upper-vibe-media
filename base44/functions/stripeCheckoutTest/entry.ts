import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

// TEST MODE ONLY — uses STRIPE_TEST_SECRET_KEY, never the live key
// Returns cs_test_... sessions only, no real charges

Deno.serve(async (req) => {
  try {
    const testKey = Deno.env.get('STRIPE_TEST_SECRET_KEY');
    if (!testKey) {
      return Response.json({ error: 'Test mode not configured. Set STRIPE_TEST_SECRET_KEY.' }, { status: 503 });
    }

    const stripe = new Stripe(testKey);
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin only — test checkout should never be accessible to normal users
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const { billingCycle, successUrl, cancelUrl } = await req.json();

    // Use test price IDs if provided via secrets, otherwise create a one-off price
    const monthlyTestPriceId = Deno.env.get('STRIPE_TEST_PLUS_MONTHLY_PRICE_ID');
    const yearlyTestPriceId  = Deno.env.get('STRIPE_TEST_PLUS_YEARLY_PRICE_ID');

    let lineItems;
    if (billingCycle === 'yearly' && yearlyTestPriceId) {
      lineItems = [{ price: yearlyTestPriceId, quantity: 1 }];
    } else if (billingCycle === 'monthly' && monthlyTestPriceId) {
      lineItems = [{ price: monthlyTestPriceId, quantity: 1 }];
    } else {
      // No test price IDs set — create inline price for test product
      // This uses price_data so no pre-existing test price ID is needed
      lineItems = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Upper Vibe Plus [TEST]',
            description: 'TEST MODE — No real charge. Use card 4242 4242 4242 4242.',
          },
          unit_amount: billingCycle === 'yearly' ? 4999 : 499,
          recurring: { interval: billingCycle === 'yearly' ? 'year' : 'month' },
        },
        quantity: 1,
      }];
    }

    const origin = req.headers.get('origin') || 'https://uppervibemedia.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: successUrl || `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&test_mode=true`,
      cancel_url:  cancelUrl  || `${origin}/payment-cancelled?test_mode=true`,
      metadata: {
        base44_app_id:  Deno.env.get('BASE44_APP_ID'),
        user_email:     user.email,
        plan:           'plus',
        billing_cycle:  billingCycle || 'monthly',
        test_mode:      'true',
      },
      subscription_data: {
        metadata: {
          user_email:    user.email,
          plan:          'plus',
          billing_cycle: billingCycle || 'monthly',
          test_mode:     'true',
        },
      },
    });

    console.log('[TEST] Checkout session created:', session.id, '| mode:', session.livemode ? 'LIVE' : 'TEST');

    if (session.livemode) {
      console.error('[TEST] ERROR: Session is in LIVE mode! Check STRIPE_TEST_SECRET_KEY.');
      return Response.json({ error: 'Configuration error: session is live mode, not test mode.' }, { status: 500 });
    }

    return Response.json({
      url:       session.url,
      sessionId: session.id,
      testMode:  true,
      livemode:  session.livemode,
    });

  } catch (error) {
    console.error('[TEST] Stripe test checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});