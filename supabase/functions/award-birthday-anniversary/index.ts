import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tier-based reward points
const BIRTHDAY_REWARDS: Record<string, number> = {
  bronze: 50,
  silver: 100,
  gold: 200,
  platinum: 500,
};

const ANNIVERSARY_REWARDS: Record<string, number> = {
  bronze: 100,
  silver: 250,
  gold: 500,
  platinum: 1000,
};

// Milestone bonus points (added on top of tier rewards)
const MILESTONE_BONUSES: Record<number, number> = {
  1: 200,   // 1 year milestone
  3: 500,   // 3 year milestone
  5: 1000,  // 5 year milestone
  10: 2500, // 10 year milestone
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

    const today = new Date();
    const currentMonth = today.getMonth() + 1; // JavaScript months are 0-indexed
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();

    console.log(`Checking for birthday and anniversary rewards on ${today.toISOString()}`);

    let totalBirthdaysAwarded = 0;
    let totalAnniversariesAwarded = 0;

    // Fetch all customers with birthdays or anniversaries
    const { data: customers, error: customersError } = await supabaseClient
      .from('customers')
      .select('id, name, birthday, anniversary_date, loyalty_points, tier')
      .or(`birthday.not.is.null,anniversary_date.not.is.null`);

    if (customersError) {
      throw new Error(`Failed to fetch customers: ${customersError.message}`);
    }

    console.log(`Found ${customers?.length || 0} customers with birthday or anniversary data`);

    // Process each customer
    for (const customer of customers || []) {
      // Check birthday
      if (customer.birthday) {
        const birthdayDate = new Date(customer.birthday);
        const birthdayMonth = birthdayDate.getMonth() + 1;
        const birthdayDay = birthdayDate.getDate();

        // If today is their birthday
        if (birthdayMonth === currentMonth && birthdayDay === currentDay) {
          // Check if we've already awarded this year's birthday reward
          const { data: existingReward } = await supabaseClient
            .from('reward_history')
            .select('id')
            .eq('customer_id', customer.id)
            .eq('reward_type', 'birthday')
            .eq('reward_year', currentYear)
            .maybeSingle();

          if (!existingReward) {
            const tier = customer.tier || 'bronze';
            const birthdayPoints = BIRTHDAY_REWARDS[tier] || BIRTHDAY_REWARDS.bronze;
            const newBalance = (customer.loyalty_points || 0) + birthdayPoints;

            // Update customer points
            const { error: updateError } = await supabaseClient
              .from('customers')
              .update({ loyalty_points: newBalance })
              .eq('id', customer.id);

            if (updateError) {
              console.error(`Failed to update customer ${customer.id}:`, updateError);
              continue;
            }

            // Record the reward
            const { error: rewardError } = await supabaseClient
              .from('reward_history')
              .insert({
                customer_id: customer.id,
                reward_type: 'birthday',
                reward_year: currentYear,
                points_awarded: birthdayPoints,
                tier: tier,
              });

            if (rewardError) {
              console.error(`Failed to record birthday reward for ${customer.id}:`, rewardError);
              continue;
            }

            // Create points transaction
            await supabaseClient
              .from('points_transactions')
              .insert({
                customer_id: customer.id,
                transaction_type: 'earned',
                points: birthdayPoints,
                balance_after: newBalance,
                description: `🎂 Birthday reward - ${tier} tier bonus`,
              });

            console.log(`Awarded ${birthdayPoints} birthday points to ${customer.name} (${tier})`);
            totalBirthdaysAwarded++;
          }
        }
      }

      // Check anniversary
      if (customer.anniversary_date) {
        const anniversaryDate = new Date(customer.anniversary_date);
        const anniversaryMonth = anniversaryDate.getMonth() + 1;
        const anniversaryDay = anniversaryDate.getDate();

        // If today is their anniversary and at least 1 year has passed
        if (anniversaryMonth === currentMonth && anniversaryDay === currentDay) {
          const yearsAsMember = currentYear - anniversaryDate.getFullYear();
          
          // Only award if at least 1 year has passed
          if (yearsAsMember >= 1) {
            // Check if we've already awarded this year's anniversary reward
            const { data: existingReward } = await supabaseClient
              .from('reward_history')
              .select('id')
              .eq('customer_id', customer.id)
              .eq('reward_type', 'anniversary')
              .eq('reward_year', currentYear)
              .maybeSingle();

            if (!existingReward) {
              const tier = customer.tier || 'bronze';
              let anniversaryPoints = ANNIVERSARY_REWARDS[tier] || ANNIVERSARY_REWARDS.bronze;
              
              // Add milestone bonus if applicable
              const milestoneBonus = MILESTONE_BONUSES[yearsAsMember] || 0;
              const totalPoints = anniversaryPoints + milestoneBonus;
              const newBalance = (customer.loyalty_points || 0) + totalPoints;

              // Update customer points
              const { error: updateError } = await supabaseClient
                .from('customers')
                .update({ loyalty_points: newBalance })
                .eq('id', customer.id);

              if (updateError) {
                console.error(`Failed to update customer ${customer.id}:`, updateError);
                continue;
              }

              // Record the reward
              const { error: rewardError } = await supabaseClient
                .from('reward_history')
                .insert({
                  customer_id: customer.id,
                  reward_type: milestoneBonus > 0 ? `anniversary_${yearsAsMember}y` : 'anniversary',
                  reward_year: currentYear,
                  points_awarded: totalPoints,
                  tier: tier,
                });

              if (rewardError) {
                console.error(`Failed to record anniversary reward for ${customer.id}:`, rewardError);
                continue;
              }

              // Create points transaction
              const isMilestone = milestoneBonus > 0;
              const description = isMilestone 
                ? `🏆 ${yearsAsMember} year MILESTONE anniversary! +${totalPoints} points (${anniversaryPoints} tier + ${milestoneBonus} milestone bonus)`
                : `🎉 ${yearsAsMember} year anniversary reward - ${tier} tier bonus`;
              
              await supabaseClient
                .from('points_transactions')
                .insert({
                  customer_id: customer.id,
                  transaction_type: 'earned',
                  points: totalPoints,
                  balance_after: newBalance,
                  description: description,
                });

              console.log(`Awarded ${totalPoints} anniversary points to ${customer.name} (${tier}, ${yearsAsMember} years${isMilestone ? ' - MILESTONE!' : ''})`);
              totalAnniversariesAwarded++;
            }
          }
        }
      }
    }

    console.log(`Completed: ${totalBirthdaysAwarded} birthdays, ${totalAnniversariesAwarded} anniversaries awarded`);

    return new Response(
      JSON.stringify({
        success: true,
        birthdaysAwarded: totalBirthdaysAwarded,
        anniversariesAwarded: totalAnniversariesAwarded,
        message: `Awarded ${totalBirthdaysAwarded} birthday rewards and ${totalAnniversariesAwarded} anniversary rewards`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in award-birthday-anniversary function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
