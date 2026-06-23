import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tier multipliers for earning points
const TIER_MULTIPLIERS: Record<string, number> = {
  bronze: 1,
  silver: 1.2,
  gold: 1.5,
  platinum: 2,
};

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

    if (!orderId) {
      throw new Error('Order ID is required');
    }

    console.log('Processing loyalty points for order:', orderId);

    // Fetch order details
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('id, customer_id, total_price, points_earned, status')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    if (order.status !== 'delivered') {
      console.log('Order is not delivered yet, skipping points award');
      return new Response(
        JSON.stringify({ message: 'Order is not delivered yet' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check if points have already been awarded
    const { data: existingTransaction } = await supabaseClient
      .from('points_transactions')
      .select('id')
      .eq('order_id', orderId)
      .eq('transaction_type', 'earned')
      .maybeSingle();

    if (existingTransaction) {
      console.log('Points already awarded for this order');
      return new Response(
        JSON.stringify({ message: 'Points already awarded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const pointsEarned = order.points_earned || 0;

    if (pointsEarned <= 0) {
      console.log('No points to award for this order');
      return new Response(
        JSON.stringify({ message: 'No points to award' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Fetch customer's current loyalty points and tier
    const { data: customer, error: customerError } = await supabaseClient
      .from('customers')
      .select('loyalty_points, tier')
      .eq('id', order.customer_id)
      .single();

    if (customerError) throw customerError;

    const currentPoints = customer.loyalty_points || 0;
    const customerTier = customer.tier || 'bronze';
    
    // Apply tier multiplier to earned points
    const tierMultiplier = TIER_MULTIPLIERS[customerTier] || 1;
    const bonusPoints = Math.floor(pointsEarned * (tierMultiplier - 1));
    const totalPointsEarned = pointsEarned + bonusPoints;
    const newBalance = currentPoints + totalPointsEarned;

    // Update customer's loyalty points
    const { error: updateError } = await supabaseClient
      .from('customers')
      .update({ loyalty_points: newBalance })
      .eq('id', order.customer_id);

    if (updateError) throw updateError;

    // Create points transaction record
    const transactionDescription = bonusPoints > 0 
      ? `Earned ${pointsEarned} points + ${bonusPoints} ${customerTier} tier bonus from order #${orderId.slice(0, 8)}`
      : `Earned ${pointsEarned} points from order #${orderId.slice(0, 8)}`;
      
    const { error: transactionError } = await supabaseClient
      .from('points_transactions')
      .insert({
        customer_id: order.customer_id,
        order_id: orderId,
        transaction_type: 'earned',
        points: totalPointsEarned,
        balance_after: newBalance,
        description: transactionDescription
      });

    if (transactionError) throw transactionError;

    console.log(`Successfully awarded ${totalPointsEarned} points (${pointsEarned} base + ${bonusPoints} bonus) to customer ${order.customer_id}`);

    // Process referral if this is first completed order
    try {
      console.log(`Calling process-referral function for order ${orderId}`);
      const referralResponse = await supabaseClient.functions.invoke('process-referral', {
        body: { orderId }
      });
      
      if (referralResponse.error) {
        console.error('Referral processing error:', referralResponse.error);
      } else {
        console.log('Referral processing result:', referralResponse.data);
      }
    } catch (referralError) {
      console.error('Failed to process referral:', referralError);
      // Don't fail the whole operation if referral processing fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        pointsAwarded: totalPointsEarned,
        basePoints: pointsEarned,
        bonusPoints,
        tier: customerTier,
        newBalance,
        message: bonusPoints > 0 
          ? `Awarded ${totalPointsEarned} loyalty points (${pointsEarned} base + ${bonusPoints} ${customerTier} tier bonus)`
          : `Awarded ${totalPointsEarned} loyalty points`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in award-loyalty-points function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
