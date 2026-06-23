import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REFERRAL_BONUS_POINTS = 500; // Points awarded to referrer
const REFERRED_BONUS_POINTS = 100; // Welcome bonus for new customer

// Referral milestone configuration
const REFERRAL_MILESTONES = [
  { count: 5, bonus: 1000, name: 'Friendly Neighbor' },
  { count: 10, bonus: 2500, name: 'Community Builder' },
  { count: 25, bonus: 7500, name: 'Ambassador' },
  { count: 50, bonus: 20000, name: 'Champion' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { orderId } = await req.json();

    console.log(`Processing referral for order: ${orderId}`);

    // Get order details
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('customer_id, total_price, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message}`);
    }

    console.log(`Order found for customer: ${order.customer_id}`);

    // Check if this is the customer's first completed order
    const { data: previousOrders } = await supabaseClient
      .from('orders')
      .select('id')
      .eq('customer_id', order.customer_id)
      .eq('status', 'delivered')
      .limit(2);

    if (previousOrders && previousOrders.length !== 1) {
      console.log(`Not first order (${previousOrders?.length} completed orders), skipping referral`);
      return new Response(
        JSON.stringify({ message: 'Not first order, no referral bonus' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if customer was referred
    const { data: referral, error: referralError } = await supabaseClient
      .from('referrals')
      .select('id, referrer_customer_id, status')
      .eq('referred_customer_id', order.customer_id)
      .eq('status', 'pending')
      .maybeSingle();

    if (referralError) {
      throw new Error(`Referral check failed: ${referralError.message}`);
    }

    if (!referral) {
      console.log('No pending referral found for this customer');
      return new Response(
        JSON.stringify({ message: 'No pending referral found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing referral from customer ${referral.referrer_customer_id}`);

    // Get referrer details
    const { data: referrer, error: referrerError } = await supabaseClient
      .from('customers')
      .select('loyalty_points, name, tier')
      .eq('id', referral.referrer_customer_id)
      .single();

    if (referrerError || !referrer) {
      throw new Error(`Referrer not found: ${referrerError?.message}`);
    }

    // Get referred customer details
    const { data: referred, error: referredError } = await supabaseClient
      .from('customers')
      .select('loyalty_points, name')
      .eq('id', order.customer_id)
      .single();

    if (referredError || !referred) {
      throw new Error(`Referred customer not found: ${referredError?.message}`);
    }

    // Count completed referrals for this referrer (before this one)
    const { count: completedReferralsCount } = await supabaseClient
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_customer_id', referral.referrer_customer_id)
      .eq('status', 'completed');

    const previousCompletedCount = completedReferralsCount || 0;
    const newCompletedCount = previousCompletedCount + 1;

    console.log(`Referrer has ${previousCompletedCount} completed referrals, will have ${newCompletedCount}`);

    // Check for milestone achievement
    let milestoneBonus = 0;
    let milestoneName = '';
    
    for (const milestone of REFERRAL_MILESTONES) {
      if (previousCompletedCount < milestone.count && newCompletedCount >= milestone.count) {
        milestoneBonus = milestone.bonus;
        milestoneName = milestone.name;
        console.log(`Milestone achieved: ${milestoneName} (${milestone.count} referrals) - Bonus: ${milestone.bonus} points`);
        break;
      }
    }

    // Calculate total points to award referrer
    const totalReferrerPoints = REFERRAL_BONUS_POINTS + milestoneBonus;
    const newReferrerBalance = referrer.loyalty_points + totalReferrerPoints;

    const { error: updateReferrerError } = await supabaseClient
      .from('customers')
      .update({ loyalty_points: newReferrerBalance })
      .eq('id', referral.referrer_customer_id);

    if (updateReferrerError) {
      throw new Error(`Failed to update referrer points: ${updateReferrerError.message}`);
    }

    // Award welcome bonus to referred customer
    const newReferredBalance = referred.loyalty_points + REFERRED_BONUS_POINTS;

    const { error: updateReferredError } = await supabaseClient
      .from('customers')
      .update({ loyalty_points: newReferredBalance })
      .eq('id', order.customer_id);

    if (updateReferredError) {
      throw new Error(`Failed to update referred points: ${updateReferredError.message}`);
    }

    // Create points transactions
    const transactions = [
      {
        customer_id: referral.referrer_customer_id,
        transaction_type: 'earned',
        points: REFERRAL_BONUS_POINTS,
        balance_after: referrer.loyalty_points + REFERRAL_BONUS_POINTS,
        description: `🎁 Referral bonus - ${referred.name} made their first purchase!`,
      },
      {
        customer_id: order.customer_id,
        transaction_type: 'earned',
        points: REFERRED_BONUS_POINTS,
        balance_after: newReferredBalance,
        description: `🎉 Welcome bonus - Thanks for joining through ${referrer.name}'s referral!`,
      },
    ];

    // Add milestone transaction if achieved
    if (milestoneBonus > 0) {
      transactions.push({
        customer_id: referral.referrer_customer_id,
        transaction_type: 'earned',
        points: milestoneBonus,
        balance_after: newReferrerBalance,
        description: `🏆 Milestone Reward - "${milestoneName}" achieved! (${newCompletedCount} referrals)`,
      });

      // Record milestone in reward_history
      await supabaseClient.from('reward_history').insert({
        customer_id: referral.referrer_customer_id,
        reward_type: 'referral_milestone',
        points_awarded: milestoneBonus,
        tier: referrer.tier || 'bronze',
        reward_year: new Date().getFullYear(),
      });
    }

    await supabaseClient.from('points_transactions').insert(transactions);

    // Mark referral as completed
    await supabaseClient
      .from('referrals')
      .update({ 
        status: 'completed', 
        points_awarded: REFERRAL_BONUS_POINTS,
        completed_at: new Date().toISOString()
      })
      .eq('id', referral.id);

    console.log(`Referral completed: ${REFERRAL_BONUS_POINTS} points to ${referrer.name}, ${REFERRED_BONUS_POINTS} to ${referred.name}`);
    if (milestoneBonus > 0) {
      console.log(`Milestone bonus: ${milestoneBonus} points for "${milestoneName}"`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        referrerPointsAwarded: REFERRAL_BONUS_POINTS,
        referredPointsAwarded: REFERRED_BONUS_POINTS,
        milestoneAchieved: milestoneName || null,
        milestoneBonus: milestoneBonus,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing referral:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
