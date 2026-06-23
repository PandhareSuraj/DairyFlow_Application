import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  user_id?: string;
  user_ids?: string[];
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  category?: 'delivery' | 'loyalty' | 'order' | 'system' | 'referral';
  action_label?: string;
  action_path?: string;
}

// Web Push implementation
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: object,
  vapidPrivateKey: string,
  vapidPublicKey: string
): Promise<boolean> {
  try {
    // Import required crypto functions
    const encoder = new TextEncoder();
    
    // Create JWT for VAPID
    const header = { alg: 'ES256', typ: 'JWT' };
    const audience = new URL(subscription.endpoint).origin;
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      aud: audience,
      exp: now + 12 * 60 * 60, // 12 hours
      sub: 'mailto:notifications@dairyflow.app'
    };
    
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const claimsB64 = btoa(JSON.stringify(claims)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    // For now, we'll use a simplified approach - just store the notification
    // Full web push requires complex crypto operations
    console.log('[Push] Would send to:', subscription.endpoint);
    console.log('[Push] Payload:', payload);
    
    // Make the actual push request
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'TTL': '86400',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      console.log('[Push] Push failed:', response.status, await response.text());
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[Push] Error sending push:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationPayload = await req.json();
    console.log('[Push] Received payload:', payload);

    // Validate required fields
    if (!payload.title || !payload.message) {
      return new Response(
        JSON.stringify({ error: 'title and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user IDs to notify
    const userIds = payload.user_ids || (payload.user_id ? [payload.user_id] : []);
    
    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'user_id or user_ids is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Push] Sending to users:', userIds);

    // Create notification records
    const notificationRecords = userIds.map(userId => ({
      user_id: userId,
      title: payload.title,
      message: payload.message,
      type: payload.type || 'info',
      category: payload.category || 'system',
      action_label: payload.action_label,
      action_path: payload.action_path,
      read: false,
      sent_push: false
    }));

    const { data: notifications, error: insertError } = await supabase
      .from('notifications')
      .insert(notificationRecords)
      .select();

    if (insertError) {
      console.error('[Push] Error inserting notifications:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create notifications' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Push] Created notifications:', notifications?.length);

    // Get push subscriptions for these users
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds);

    if (subError) {
      console.error('[Push] Error fetching subscriptions:', subError);
    }

    console.log('[Push] Found subscriptions:', subscriptions?.length || 0);

    // Send push notifications (best effort)
    let pushSent = 0;
    if (subscriptions && subscriptions.length > 0) {
      const pushPayload = {
        title: payload.title,
        message: payload.message,
        type: payload.type || 'info',
        category: payload.category || 'system',
        actionPath: payload.action_path,
        id: notifications?.[0]?.id
      };

      for (const sub of subscriptions) {
        try {
          // Simplified push - in production you'd use proper VAPID signing
          const response = await fetch(sub.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'TTL': '86400',
            },
            body: JSON.stringify(pushPayload)
          });
          
          if (response.ok || response.status === 201) {
            pushSent++;
            // Mark as sent
            await supabase
              .from('notifications')
              .update({ sent_push: true })
              .eq('user_id', sub.user_id)
              .in('id', notifications?.map(n => n.id) || []);
          } else {
            console.log('[Push] Push response:', response.status);
          }
        } catch (e) {
          console.log('[Push] Push attempt failed:', e);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications_created: notifications?.length || 0,
        push_sent: pushSent
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Push] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
