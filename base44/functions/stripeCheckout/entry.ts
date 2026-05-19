import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

// Upper Vibe Plus price IDs
const PRICE_IDS = {
  plus_monthly: 'price_1TYfoEGq7v58DE94kN4kzcT0',
  plus_yearly:  'price_1TYfoEGq7v58DE94kL7frMGV',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan, billingCycle, successUrl, cancelUrl } = await req.json();

    // Resolve price ID — plan should be "plus", billingCycle "monthly" or "yearly"
    const priceKey = `${plan}_${billingCycle || 'monthly'}`;
    const priceId = PRICE_IDS[priceKey];

    if (!priceId) {
      console.error('Invalid plan/billingCycle:', plan, billingCycle);
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Look up or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name || undefined,
        metadata: { base44_user_email: user.email },
      });
      customerId = customer.id;
      await base44.auth.updateMe({ stripeCustomerId: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${req.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/payment-cancelled`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_email: user.email,
        plan,
        billing_cycle: billingCycle || 'monthly',
      },
      subscription_data: {
        metadata: {
          user_email: user.email,
          plan,
          billing_cycle: billingCycle || 'monthly',
        },
      },
    });

    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});