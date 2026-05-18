import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PREMIUM_PRICE_ID = 'price_1TYSX3CgPUpySA0hfmSN0VwG';
const PLUS_PRICE_ID = 'price_1TYSX3CgPUpySA0hCNH6yBNH';

function getPlanFromPriceId(priceId) {
  if (priceId === PREMIUM_PRICE_ID) return 'premium';
  if (priceId === PLUS_PRICE_ID) return 'plus';
  return null;
}

async function updateUserSubscription(base44, userEmail, plan, status) {
  const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
  if (!users || users.length === 0) {
    console.error('User not found:', userEmail);
    return;
  }

  const userId = users[0].id;
  let updateData = { subscriptionStatus: status };

  if (status === 'active') {
    if (plan === 'premium') {
      updateData = { ...updateData, tier: 'premium', isPremium: true, isPlus: false };
    } else if (plan === 'plus') {
      updateData = { ...updateData, tier: 'plus', isPremium: true, isPlus: true };
    }
  } else {
    // cancelled / expired
    updateData = { ...updateData, tier: 'free', isPremium: false, isPlus: false };
  }

  await base44.asServiceRole.entities.User.update(userId, updateData);
  console.log(`Updated user ${userEmail} to plan=${plan} status=${status}`);
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
        const plan = session.metadata?.plan;
        if (userEmail && plan) {
          await updateUserSubscription(base44, userEmail, plan, 'active');
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const userEmail = sub.metadata?.user_email;
        const priceId = sub.items?.data?.[0]?.price?.id;
        const plan = getPlanFromPriceId(priceId);
        const status = sub.status === 'active' ? 'active' : 'inactive';
        if (userEmail && plan) {
          await updateUserSubscription(base44, userEmail, plan, status);
        }
        break;
      }

      case 'customer.subscription.deleted':
      case 'invoice.payment_failed': {
        const obj = event.data.object;
        const userEmail = obj.metadata?.user_email;
        if (userEmail) {
          await updateUserSubscription(base44, userEmail, null, 'cancelled');
        }
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }

  return Response.json({ received: true });
});