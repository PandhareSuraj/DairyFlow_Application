import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, normalizePhone } from "../_shared/cors.ts";

type VerifyAdminLoginRequest = { phone?: string; otp?: string; device_id?: string | null };
type VerifyOtpRow = {
  verified: boolean;
  purpose?: string | null;
  role?: string | null;
  email?: string | null;
  message?: string | null;
};
type AdminProfileRow = {
  profile_id: string;
  full_name?: string | null;
  dairy_name?: string | null;
  email?: string | null;
  auth_email?: string | null;
  phone?: string | null;
  normalized_phone?: string | null;
  role: string;
  admin_id?: string | null;
  login_enabled?: boolean | null;
  status: string;
};

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
  if (!tokenHash) throw new Error("Unable to generate login token.");
  const response = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "magiclink", token_hash: tokenHash }),
  });
  const session = await response.json();
  if (!response.ok) throw new Error(session?.msg ?? session?.message ?? "Unable to create login session.");
  return session;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (req.method !== "POST") return jsonResponse({ success: false, message: "Method not allowed" }, 405);
    const body = (await req.json()) as VerifyAdminLoginRequest;
    const phone = normalizePhone(body.phone ?? "");
    const otp = (body.otp ?? "").trim();
    if (phone.length !== 12 || otp.length !== 6) return jsonResponse({ success: false, message: "Invalid OTP" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: verifyData, error: verifyError } = await admin.rpc("verify_whatsapp_otp", { p_phone: phone, p_otp: otp });
    const rawVerifyResult = Array.isArray(verifyData) ? verifyData[0] : verifyData;
    const verifyRow = typeof rawVerifyResult === "boolean"
      ? ({ verified: rawVerifyResult, message: rawVerifyResult ? "OTP verified." : "Invalid OTP" } as VerifyOtpRow)
      : rawVerifyResult as VerifyOtpRow | undefined;
    if (verifyError || !verifyRow?.verified) {
      return jsonResponse({ success: false, message: verifyError?.message ?? verifyRow?.message ?? "Invalid OTP" }, 400);
    }

    const { data, error } = await admin.rpc("get_admin_by_verified_phone", { p_phone: phone });
    if (error) return jsonResponse({ success: false, message: error.message }, 400);
    const row = (Array.isArray(data) ? data[0] : data) as AdminProfileRow | undefined;
    if (!row?.profile_id) return jsonResponse({ success: false, message: "Admin not found for this mobile number." }, 404);
    if (row.login_enabled === false) return jsonResponse({ success: false, message: "Login disabled" }, 403);

    const email = row.auth_email || row.email;
    if (!email) return jsonResponse({ success: false, message: "Admin auth_email is missing. Seed the admin auth email before OTP login." }, 400);
    const session = await createSessionForEmail(email);
    await admin.from("profiles").update({ last_login_at: new Date().toISOString(), last_login_method: "whatsapp_otp" }).eq("id", row.profile_id);

    return jsonResponse({
      success: true,
      role: "admin",
      profile: {
        id: row.profile_id,
        admin_id: row.admin_id,
        full_name: row.full_name,
        dairy_name: row.dairy_name,
        email: row.email,
        auth_email: row.auth_email,
        phone: row.phone,
        normalized_phone: row.normalized_phone,
        role: row.role,
        status: row.status,
      },
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      token_type: session.token_type ?? "bearer",
    });
  } catch (error) {
    console.error("verify-admin-whatsapp-login failed", error);
    return jsonResponse({ success: false, message: "Unable to verify WhatsApp OTP. Please try again." }, 500);
  }
});
