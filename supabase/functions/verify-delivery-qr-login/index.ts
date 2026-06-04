import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type VerifyQrRequest = { qr_token?: string; device_id?: string | null };
type DeliveryQrRow = {
  profile_id: string;
  admin_id: string;
  delivery_boy_id: string;
  full_name?: string | null;
  email?: string | null;
  auth_email?: string | null;
  phone?: string | null;
  assigned_route_id?: string | null;
  qr_login_enabled?: boolean | null;
  status: string;
};

function rawToken(value: string): string {
  return value.trim().replace(/^DAIRYFLOW_QR:/, "");
}

function magicLinkTokenHash(properties: Record<string, unknown> | null | undefined): string | null {
  const direct = properties?.hashed_token;
  if (typeof direct === "string" && direct.length > 0) return direct;
  const actionLink = properties?.action_link;
  if (typeof actionLink !== "string" || actionLink.length === 0) return null;
  const url = new URL(actionLink);
  return url.searchParams.get("token_hash") ?? url.searchParams.get("token");
}

async function createSessionForEmail(email: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const tokenHash = magicLinkTokenHash(data?.properties as Record<string, unknown> | undefined);
  if (!tokenHash) throw new Error("Unable to generate delivery login token.");
  const response = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "magiclink", token_hash: tokenHash }),
  });
  const session = await response.json();
  if (!response.ok) throw new Error(session?.msg ?? session?.message ?? "Unable to create QR login session.");
  return session;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (req.method !== "POST") return jsonResponse({ success: false, message: "Method not allowed" }, 405);
    const body = (await req.json()) as VerifyQrRequest;
    const token = rawToken(body.qr_token ?? "");
    if (!token) return jsonResponse({ success: false, message: "Invalid DairyFlow QR" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await admin.rpc("consume_delivery_qr_token", { p_raw_token: token, p_device_id: body.device_id ?? null });
    if (error) return jsonResponse({ success: false, message: error.message }, 400);
    const row = (Array.isArray(data) ? data[0] : data) as DeliveryQrRow | undefined;
    if (!row?.profile_id) return jsonResponse({ success: false, message: "Invalid or expired QR token" }, 400);
    if (row.qr_login_enabled === false) return jsonResponse({ success: false, message: "QR login disabled" }, 403);

    const email = row.auth_email || row.email;
    if (!email) return jsonResponse({ success: false, message: "Delivery boy auth_email is missing. Seed the delivery boy auth email before QR login." }, 400);
    const session = await createSessionForEmail(email);
    return jsonResponse({
      success: true,
      role: "delivery_boy",
      admin_id: row.admin_id,
      delivery_boy_id: row.delivery_boy_id,
      assigned_route_id: row.assigned_route_id,
      profile: {
        id: row.profile_id,
        admin_id: row.admin_id,
        delivery_boy_id: row.delivery_boy_id,
        full_name: row.full_name,
        email: row.email,
        auth_email: row.auth_email,
        phone: row.phone,
        role: "delivery_boy",
        status: row.status,
      },
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      token_type: session.token_type ?? "bearer",
    });
  } catch (error) {
    console.error("verify-delivery-qr-login failed", error);
    return jsonResponse({ success: false, message: "Unable to verify QR login. Please try again." }, 500);
  }
});
