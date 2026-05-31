import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

/**
 * Upper Vibe Plus — Stripe Webhook Handler
 *
 * Root cause fix: stripe client moved INSIDE the handler (not module top-level).
 * Top-level init crashes the function permanently if the secret isn't loaded yet.
 *
 * Email resolution order:
 *   1. session/subscription metadata.user_email
 *   2. customer_details.email (checkout session)
 *   3. Stripe customer email lookup
 */

async function resolveUserEmail(stripe, obj, fallbackCustomerId) {
  // 1. metadata
  if (obj.metadata?.user_email) return obj.metadata.user_email;
  // 2. customer_details (checkout.session.completed)
  if (obj.customer_details?.email) return obj.customer_details.email;
  // 3. Stripe customer lookup
  const customerId = fallbackCustomerId || obj.customer;
  if (customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted && customer.email) return customer.email;
    } catch (e) {
      console.error('Customer lookup failed:', e.message);
    }
  }
  return null;
}

async function updateUserSubscription(base44, stripe, userEmail, plan, billingCycle, status, stripeData = {}) {
  const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
  if (!users || users.length === 0) {
    console.error('Webhook: user not found:', userEmail);
    return false;
  }

  const userId = users[0].id;
  let updateData;

  if (status === 'active' && plan === 'plus') {
    updateData = {
      isPlus: true,
      isPremium: true,
      tier: 'plus',
      plan: 'plus',
      subscriptionStatus: 'active',
      subscription_status: 'active',
      planName: 'Upper Vibe Plus',
      billingCycle: billingCycle || 'monthly',
      plusStartedAt: users[0].plusStartedAt || new Date().toISOString(),
      ...(stripeData.customerId    && { stripeCustomerId: stripeData.customerId }),
      ...(stripeData.subscriptionId && { stripeSubscriptionId: stripeData.subscriptionId }),
      ...(stripeData.priceId       && { stripePriceId: stripeData.priceId }),
      ...(stripeData.productId     && { stripeProductId: stripeData.productId }),
      ...(stripeData.periodEnd     && { subscriptionCurrentPeriodEnd: stripeData.periodEnd }),
    };
  } else {
    updateData = {
      isPlus: false,
      isPremium: false,
      tier: 'free',
      plan: null,
      subscriptionStatus: status,
      subscription_status: status,
      planName: null,
      billingCycle: null,
    };
  }

  await base44.asServiceRole.entities.User.update(userId, updateData);
  console.log(`Webhook: updated ${userEmail} → status=${status} plan=${plan} billing=${billingCycle}`);
  return true;
}

Deno.serve(async (req) => {
  // IMPORTANT: Stripe client must be inside the handler, not module top-level.
  // Module-level init crashes the function permanently if env var isn't ready.
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
  const base44 = createClientFromRequest(req);

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  let event;
  try {
    if (webhookSecret && sig) {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } else {
      // Dev/test: accept unsigned events
      event = JSON.parse(body);
    }
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log('Stripe event received:', event.type);

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.payment_status !== 'paid') {
          console.log('Session not paid yet, skipping:', session.payment_status);
          break;
        }
        const userEmail = await resolveUserEmail(stripe, session, session.customer);
        if (!userEmail) { console.error('checkout.session.completed: no email found'); break; }

        const plan = session.metadata?.plan || 'plus';
        const billingCycle = session.metadata?.billing_cycle || 'monthly';

        // Fetch subscription details for full data
        let subData = {};
        if (session.subscription) {
          try {
            const sub = await stripe.subscriptions.retrieve(session.subscription);
            const item = sub.items?.data?.[0];
            subData = {
              customerId: session.customer,
              subscriptionId: sub.id,
              priceId: item?.price?.id,
              productId: item?.price?.product,
              periodEnd: new Date(sub.current_period_end * 1000).toISOString(),
            };
          } catch (e) {
            console.warn('Could not fetch subscription details:', e.message);
            subData = { customerId: session.customer };
          }
        }

        await updateUserSubscription(base44, stripe, userEmail, plan, billingCycle, 'active', subData);
        break;
      }

      case 'invoice.paid': {
        // Fires on every renewal — keep Plus active
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        const userEmail = await resolveUserEmail(stripe, sub, sub.customer);
        if (!userEmail) { console.error('invoice.paid: no email found'); break; }

        const plan = sub.metadata?.plan || 'plus';
        const billingCycle = sub.metadata?.billing_cycle || 'monthly';
        const item = sub.items?.data?.[0];
        const subData = {
          customerId: sub.customer,
          subscriptionId: sub.id,
          priceId: item?.price?.id,
          productId: item?.price?.product,
          periodEnd: new Date(sub.current_period_end * 1000).toISOString(),
        };
        await updateUserSubscription(base44, stripe, userEmail, plan, billingCycle, 'active', subData);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const userEmail = await resolveUserEmail(stripe, sub, sub.customer);
        if (!userEmail) { console.error('subscription.updated: no email found'); break; }

        const plan = sub.metadata?.plan || 'plus';
        const billingCycle = sub.metadata?.billing_cycle || 'monthly';
        // Keep active for active/trialing; inactive only for truly ended states
        const isActive = ['active', 'trialing'].includes(sub.status);
        const status = isActive ? 'active' : 'inactive';
        const item = sub.items?.data?.[0];
        const subData = {
          customerId: sub.customer,
          subscriptionId: sub.id,
          priceId: item?.price?.id,
          productId: item?.price?.product,
          periodEnd: new Date(sub.current_period_end * 1000).toISOString(),
        };
        await updateUserSubscription(base44, stripe, userEmail, plan, billingCycle, status, subData);
        break;
      }

      case 'customer.subscription.deleted': {
        // Only revoke when subscription is truly deleted
        const sub = event.data.object;
        const userEmail = await resolveUserEmail(stripe, sub, sub.customer);
        if (!userEmail) { console.error('subscription.deleted: no email found'); break; }
        await updateUserSubscription(base44, stripe, userEmail, null, null, 'cancelled');
        break;
      }

      case 'invoice.payment_failed': {
        // Do NOT immediately revoke — Stripe retries. Only act if subscription is also past_due/canceled.
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        try {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          if (sub.status === 'canceled' || sub.status === 'unpaid') {
            const userEmail = await resolveUserEmail(stripe, sub, sub.customer);
            if (userEmail) {
              await updateUserSubscription(base44, stripe, userEmail, null, null, 'payment_failed');
            }
          } else {
            console.log(`invoice.payment_failed but sub status is ${sub.status} — not revoking yet`);
          }
        } catch (e) {
          console.warn('Could not check subscription on payment_failed:', e.message);
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }
  } catch (err) {
    console.error('Webhook handler error:', err.message, err.stack);
    // Still return 200 so Stripe doesn't retry indefinitely
  }

  return Response.json({ received: true });
});