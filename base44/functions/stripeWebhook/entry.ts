import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

async function updateUserSubscription(base44, userEmail, plan, billingCycle, status) {
  const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
  if (!users || users.length === 0) {
    console.error('User not found:', userEmail);
    return;
  }

  const userId = users[0].id;
  let updateData = { subscriptionStatus: status };

  if (status === 'active' && plan === 'plus') {
    updateData = {
      ...updateData,
      tier: 'plus',
      isPlus: true,
      isPremium: true,           // legacy compat
      plan: 'plus',
      subscription_status: 'active',
      subscriptionStatus: 'active',
      planName: 'Upper Vibe Plus',
      billingCycle: billingCycle || 'monthly',
      plusStartedAt: new Date().toISOString(),
    };
  } else if (status !== 'active') {
    updateData = {
      ...updateData,
      tier: 'free',
      isPlus: false,
      isPremium: false,
      plan: null,
      subscription_status: 'inactive',
      subscriptionStatus: 'inactive',
      planName: null,
      billingCycle: null,
    };
  }

  await base44.asServiceRole.entities.User.update(userId, updateData);
  console.log(`Updated user ${userEmail} → plan=${plan} billing=${billingCycle} status=${status}`);
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  let event;
  try {
    if (webhookSecret && sig) {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body);
    }
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log('Stripe event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userEmail = session.metadata?.user_email;
        const plan = session.metadata?.plan || 'plus';
        const billingCycle = session.metadata?.billing_cycle || 'monthly';
        if (userEmail) {
          await updateUserSubscription(base44, userEmail, plan, billingCycle, 'active');
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const userEmail = sub.metadata?.user_email;
        const plan = sub.metadata?.plan || 'plus';
        const billingCycle = sub.metadata?.billing_cycle || 'monthly';
        const status = sub.status === 'active' ? 'active' : 'inactive';
        if (userEmail) {
          await updateUserSubscription(base44, userEmail, plan, billingCycle, status);
        }
        break;
      }

      case 'customer.subscription.deleted':
      case 'invoice.payment_failed': {
        const obj = event.data.object;
        const userEmail = obj.metadata?.user_email;
        if (userEmail) {
          await updateUserSubscription(base44, userEmail, null, null, 'cancelled');
        }
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }

  return Response.json({ received: true });
});