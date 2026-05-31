import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

// TEST WEBHOOK HANDLER — uses STRIPE_TEST_SECRET_KEY + STRIPE_TEST_WEBHOOK_SECRET
// Mirrors stripeWebhook logic but:
//   - only processes events with test_mode: "true" in metadata
//   - marks users with testSubscription: true so they can be easily identified/reset
//   - logs everything with [TEST] prefix for easy diagnosis

async function updateUserSubscription(base44, userEmail, plan, billingCycle, status, testMode) {
  const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
  if (!users || users.length === 0) {
    console.error('[TEST] User not found:', userEmail);
    return;
  }

  const userId = users[0].id;
  let updateData = { subscriptionStatus: status };

  if (status === 'active' && plan === 'plus') {
    updateData = {
      ...updateData,
      tier:            'plus',
      isPlus:          true,
      isPremium:       true,
      planName:        'Upper Vibe Plus',
      billingCycle:    billingCycle || 'monthly',
      plusStartedAt:   new Date().toISOString(),
      testSubscription: testMode === 'true' ? true : undefined,
    };
  } else if (status !== 'active') {
    updateData = {
      ...updateData,
      tier:             'free',
      isPlus:           false,
      isPremium:        false,
      planName:         null,
      billingCycle:     null,
      testSubscription: false,
    };
  }

  await base44.asServiceRole.entities.User.update(userId, updateData);
  console.log(`[TEST] Updated user ${userEmail} → plan=${plan} billing=${billingCycle} status=${status} testMode=${testMode}`);
}

Deno.serve(async (req) => {
  const testKey = Deno.env.get('STRIPE_TEST_SECRET_KEY');
  if (!testKey) {
    console.error('[TEST] STRIPE_TEST_SECRET_KEY not set');
    return new Response('Test mode not configured', { status: 503 });
  }

  const stripe = new Stripe(testKey);
  const base44 = createClientFromRequest(req);
  const body   = await req.text();
  const sig    = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_TEST_WEBHOOK_SECRET');

  let event;
  try {
    if (webhookSecret && sig) {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } else {
      // No test webhook secret yet — parse body directly (safe for dev testing)
      event = JSON.parse(body);
      console.warn('[TEST] No webhook signature validation — set STRIPE_TEST_WEBHOOK_SECRET for full security');
    }
  } catch (err) {
    console.error('[TEST] Webhook signature error:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Safety check: reject live mode events
  if (event.livemode) {
    console.error('[TEST] REJECTED live mode event in test webhook handler:', event.type);
    return Response.json({ received: false, reason: 'live mode event rejected by test handler' });
  }

  console.log('[TEST] Stripe event:', event.type, '| livemode:', event.livemode);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session  = event.data.object;
        const testMode = session.metadata?.test_mode;
        const userEmail    = session.metadata?.user_email;
        const plan         = session.metadata?.plan || 'plus';
        const billingCycle = session.metadata?.billing_cycle || 'monthly';

        if (!testMode) {
          console.warn('[TEST] checkout.session.completed missing test_mode flag — skipping to avoid affecting live users');
          break;
        }
        if (userEmail) {
          await updateUserSubscription(base44, userEmail, plan, billingCycle, 'active', testMode);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub      = event.data.object;
        const testMode = sub.metadata?.test_mode;
        const userEmail    = sub.metadata?.user_email;
        const plan         = sub.metadata?.plan || 'plus';
        const billingCycle = sub.metadata?.billing_cycle || 'monthly';
        const status       = sub.status === 'active' ? 'active' : 'inactive';
        if (testMode && userEmail) {
          await updateUserSubscription(base44, userEmail, plan, billingCycle, status, testMode);
        }
        break;
      }

      case 'customer.subscription.deleted':
      case 'invoice.payment_failed': {
        const obj      = event.data.object;
        const testMode = obj.metadata?.test_mode;
        const userEmail = obj.metadata?.user_email;
        if (testMode && userEmail) {
          await updateUserSubscription(base44, userEmail, null, null, 'cancelled', testMode);
        }
        break;
      }

      default:
        console.log('[TEST] Unhandled event type:', event.type);
    }
  } catch (err) {
    console.error('[TEST] Webhook handler error:', err);
  }

  return Response.json({ received: true, testMode: true });
});