import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.stripeCustomerId) {
      return Response.json({ error: 'No subscription found' }, { status: 404 });
    }

    const { returnUrl } = await req.json().catch(() => ({}));

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl || `${req.headers.get('origin')}/account`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Stripe portal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});