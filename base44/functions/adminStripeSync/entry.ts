import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const { userEmail, action } = await req.json();

    if (!userEmail) {
      return Response.json({ error: 'userEmail required' }, { status: 400 });
    }

    // 1. Find user in Base44
    const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found in Base44', userEmail }, { status: 404 });
    }
    const appUser = users[0];

    // 2. Look up Stripe customer by email
    let stripeCustomer = null;
    let subscription = null;

    // Try by stored customerId first
    if (appUser.stripeCustomerId) {
      try {
        stripeCustomer = await stripe.customers.retrieve(appUser.stripeCustomerId);
        console.log('Found customer by stored ID:', stripeCustomer.id);
      } catch (e) {
        console.warn('Stored customer ID invalid:', e.message);
      }
    }

    // Fallback: search by email
    if (!stripeCustomer || stripeCustomer.deleted) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 5 });
      if (customers.data.length > 0) {
        stripeCustomer = customers.data[0];
        console.log('Found customer by email search:', stripeCustomer.id);
      }
    }

    if (!stripeCustomer) {
      return Response.json({
        found: false,
        message: 'No Stripe customer found for this email',
        appUser: { id: appUser.id, email: appUser.email, tier: appUser.tier, isPlus: appUser.isPlus }
      });
    }

    // 3. Find active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomer.id,
      status: 'all',
      limit: 10
    });

    const allSubs = subscriptions.data;
    // Prefer active, then trialing, then any
    subscription = allSubs.find(s => s.status === 'active')
      || allSubs.find(s => s.status === 'trialing')
      || allSubs.find(s => s.status === 'past_due')
      || allSubs[0] || null;

    // 4. Check recent checkout sessions
    const sessions = await stripe.checkout.sessions.list({
      customer: stripeCustomer.id,
      limit: 10
    });

    const completedSession = sessions.data.find(s => s.payment_status === 'paid') || sessions.data[0];

    const report = {
      appUser: {
        id: appUser.id,
        email: appUser.email,
        tier: appUser.tier,
        isPlus: appUser.isPlus,
        isPremium: appUser.isPremium,
        plan: appUser.plan,
        subscriptionStatus: appUser.subscriptionStatus,
        subscription_status: appUser.subscription_status,
        stripeCustomerId: appUser.stripeCustomerId,
      },
      stripeCustomer: {
        id: stripeCustomer.id,
        email: stripeCustomer.email,
        created: new Date(stripeCustomer.created * 1000).toISOString(),
      },
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        plan: subscription.items?.data?.[0]?.price?.id,
        product: subscription.items?.data?.[0]?.price?.product,
        amount: subscription.items?.data?.[0]?.price?.unit_amount,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        metadata: subscription.metadata,
      } : null,
      recentSession: completedSession ? {
        id: completedSession.id,
        status: completedSession.status,
        payment_status: completedSession.payment_status,
        metadata: completedSession.metadata,
        customer_email: completedSession.customer_details?.email,
        amount_total: completedSession.amount_total,
        created: new Date(completedSession.created * 1000).toISOString(),
      } : null,
    };

    // 5. If action=repair, fix the user record
    if (action === 'repair') {
      const hasActiveSub = subscription && (subscription.status === 'active' || subscription.status === 'trialing');
      const hasCompletedPayment = completedSession?.payment_status === 'paid';

      if (hasActiveSub || hasCompletedPayment) {
        const priceId = subscription?.items?.data?.[0]?.price?.id || null;
        const productId = subscription?.items?.data?.[0]?.price?.product || null;
        const billingCycle = priceId?.includes('yearly') || (subscription?.items?.data?.[0]?.price?.recurring?.interval === 'year') ? 'yearly' : 'monthly';
        const periodEnd = subscription?.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        const updateData = {
          isPlus: true,
          isPremium: true,
          tier: 'plus',
          plan: 'plus',
          subscriptionStatus: 'active',
          subscription_status: 'active',
          planName: 'Upper Vibe Plus',
          billingCycle,
          stripeCustomerId: stripeCustomer.id,
          stripeSubscriptionId: subscription?.id || null,
          stripePriceId: priceId,
          stripeProductId: productId,
          plusStartedAt: appUser.plusStartedAt || new Date().toISOString(),
          subscriptionCurrentPeriodEnd: periodEnd,
        };

        await base44.asServiceRole.entities.User.update(appUser.id, updateData);
        console.log('Repaired user:', userEmail, updateData);

        return Response.json({
          ...report,
          repaired: true,
          updatedFields: updateData,
          message: `✅ User ${userEmail} has been granted Plus access.`
        });
      } else {
        return Response.json({
          ...report,
          repaired: false,
          message: `❌ No active/paid subscription found for ${userEmail}. Manual review needed.`
        });
      }
    }

    return Response.json(report);

  } catch (error) {
    console.error('adminStripeSync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});