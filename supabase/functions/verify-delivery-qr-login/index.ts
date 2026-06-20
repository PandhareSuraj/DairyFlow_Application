import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

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

type LoginIdentity = {
  profileId: string;
  email: string;
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

function isValidEmail(value: string | null | undefined): value is string {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value ?? "").trim());
}

function fallbackDeliveryEmail(row: DeliveryQrRow): string {
  return `delivery-${row.delivery_boy_id}@dairyflow.local`;
}

async function ensureLoginIdentity(admin: ReturnType<typeof createClient>, row: DeliveryQrRow): Promise<LoginIdentity> {
  const existing = await admin.auth.admin.getUserById(row.profile_id);
  if (!existing.error && existing.data.user?.email && isValidEmail(existing.data.user.email)) {
    return { profileId: row.profile_id, email: existing.data.user.email };
  }

  const email = isValidEmail(row.auth_email)
    ? row.auth_email.trim().toLowerCase()
    : isValidEmail(row.email)
      ? row.email.trim().toLowerCase()
      : fallbackDeliveryEmail(row);

  if (!existing.error && existing.data.user) {
    const { data, error } = await admin.auth.admin.updateUserById(row.profile_id, {
      email,
      email_confirm: true,
      user_metadata: {
        full_name: row.full_name,
        phone: row.phone,
        role: "delivery_boy",
      },
    });
    if (error) throw error;
    return { profileId: data.user.id, email };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: crypto.randomUUID() + crypto.randomUUID(),
    email_confirm: true,
    user_metadata: {
      full_name: row.full_name,
      phone: row.phone,
      role: "delivery_boy",
    },
  });
  if (error) throw error;
  if (!data.user) throw new Error("Unable to create delivery boy login user.");

  const profilePayload = {
    id: data.user.id,
    admin_id: row.admin_id,
    delivery_boy_id: row.delivery_boy_id,
    full_name: row.full_name,
    email,
    auth_email: email,
    phone: row.phone,
    role: "delivery_boy",
    phone_verified: true,
    login_enabled: true,
    qr_login_enabled: true,
    status: "active",
    updated_at: new Date().toISOString(),
  };
  const { error: profileError } = await admin.from("profiles").upsert(profilePayload, { onConflict: "id" });
  if (profileError) throw profileError;

  const { error: deliveryBoyError } = await admin
    .from("delivery_boys")
    .update({ profile_id: data.user.id, email, updated_at: new Date().toISOString() })
    .eq("id", row.delivery_boy_id);
  if (deliveryBoyError) throw deliveryBoyError;

  return { profileId: data.user.id, email };
}

async function createSessionForEmail(email: string, fallbackAnonKey: string | null) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || fallbackAnonKey;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!anonKey) throw new Error("SUPABASE_ANON_KEY is missing for QR login.");
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

    const identity = await ensureLoginIdentity(admin, row);
    const fallbackAnonKey = req.headers.get("apikey") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null;
    const session = await createSessionForEmail(identity.email, fallbackAnonKey);
    return jsonResponse({
      success: true,
      role: "delivery_boy",
      admin_id: row.admin_id,
      delivery_boy_id: row.delivery_boy_id,
      assigned_route_id: row.assigned_route_id,
      profile: {
        id: identity.profileId,
        admin_id: row.admin_id,
        delivery_boy_id: row.delivery_boy_id,
        full_name: row.full_name,
        email: identity.email,
        auth_email: identity.email,
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
    const message = error instanceof Error && error.message
      ? error.message
      : "Unable to verify QR login. Please try again.";
    return jsonResponse({ success: false, message }, 500);
  }
});
