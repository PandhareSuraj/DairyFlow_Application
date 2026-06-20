import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { sendOtpTemplate } from "../_shared/myoperator.ts";
import { generateOtp, hashOtp, isValidOtp, isValidPhone, normalizePhone, verifyOtp } from "./otp.ts";

const OTP_EXPIRY_SECONDS = 5 * 60;
const MAX_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_REQUESTS = 3;

type RequestOtpBody = { phone?: string };
type VerifyOtpBody = { phone?: string; otp?: string };
type ProfileRow = {
  id: string;
  admin_id?: string | null;
  delivery_boy_id?: string | null;
  admin_access_code?: string | null;
  full_name?: string | null;
  dairy_name?: string | null;
  email?: string | null;
  auth_email?: string | null;
  phone?: string | null;
  normalized_phone?: string | null;
  role?: string | null;
  status?: string | null;
  login_enabled?: boolean | null;
};

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function sanitizedError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const secrets = [
    Deno.env.get("MYOPERATOR_AUTH_TOKEN"),
    Deno.env.get("WHATSAPP_API_KEY"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  ].filter((value): value is string => Boolean(value));
  return secrets.reduce((message, secret) => message.replaceAll(secret, "[redacted]"), raw);
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
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const tokenHash = magicLinkTokenHash(data?.properties as Record<string, unknown> | undefined);
  if (!tokenHash) throw new Error("Unable to generate WhatsApp login token.");

  const response = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "magiclink", token_hash: tokenHash }),
  });
  const session = await response.json();
  if (!response.ok) {
    throw new Error(session?.msg ?? session?.message ?? "Unable to create WhatsApp login session.");
  }
  return session;
}

async function getOrCreateProfileForPhone(phone: string): Promise<ProfileRow> {
  const admin = adminClient();
  const nationalPhone = phone.startsWith("91") && phone.length === 12 ? phone.slice(2) : phone;
  const { data: existing, error: profileError } = await admin
    .from("profiles")
    .select("id, admin_id, delivery_boy_id, admin_access_code, full_name, dairy_name, email, auth_email, phone, normalized_phone, role, status, login_enabled")
    .or(`normalized_phone.eq.${phone},phone.eq.${phone},phone.eq.${nationalPhone}`)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (profileError) throw profileError;
  if (existing) {
    if (existing.login_enabled === false) throw new Error("Login disabled for this account.");
    return existing as ProfileRow;
  }

  const email = `whatsapp_${phone}@dairyflow.local`;
  const { data: userData, error: createUserError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    phone: `+${phone}`,
    phone_confirm: true,
    user_metadata: { phone, role: "admin", login_method: "whatsapp_otp" },
  });
  if (createUserError) throw createUserError;
  const userId = userData.user?.id;
  if (!userId) throw new Error("Unable to create Supabase user.");

  const profile: ProfileRow = {
    id: userId,
    admin_id: userId,
    admin_access_code: generateAdminAccessCode(),
    full_name: "WhatsApp User",
    dairy_name: "My Dairy",
    email,
    auth_email: email,
    phone,
    normalized_phone: phone,
    role: "admin",
    status: "active",
    login_enabled: true,
  };
  const { data: created, error: insertError } = await admin
    .from("profiles")
    .upsert({
      ...profile,
      phone_verified: true,
      last_login_method: "whatsapp_otp",
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" })
    .select("id, admin_id, delivery_boy_id, admin_access_code, full_name, dairy_name, email, auth_email, phone, normalized_phone, role, status, login_enabled")
    .single();
  if (insertError) throw insertError;
  return created as ProfileRow;
}

function generateAdminAccessCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return `DF-${Array.from(bytes).map((byte) => alphabet[byte % alphabet.length]).join("")}`;
}

async function requestOtp(req: Request): Promise<Response> {
  const body = (await req.json()) as RequestOtpBody;
  const rawPhone = body.phone ?? "";
  if (!isValidPhone(rawPhone)) {
    return jsonResponse({ success: false, message: "Invalid phone number" }, 400);
  }

  const phone = normalizePhone(rawPhone);
  const admin = adminClient();
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000).toISOString();
  const { count, error: countError } = await admin
    .from("whatsapp_otps")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("created_at", since);
  if (countError) throw countError;
  if ((count ?? 0) >= RATE_LIMIT_MAX_REQUESTS) {
    return jsonResponse(
      { success: false, message: "Too many OTP requests. Please try again later." },
      429,
    );
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000).toISOString();
  const { data, error: insertError } = await admin
    .from("whatsapp_otps")
    .insert({ phone, otp_hash: otpHash, expires_at: expiresAt })
    .select("id")
    .single();
  if (insertError) throw insertError;

  try {
    await sendOtpTemplate({ to: phone, otp });
  } catch (error) {
    await admin.from("whatsapp_otps").delete().eq("id", data.id);
    throw error;
  }

  console.info("WhatsApp OTP requested", { phone, requestId: data.id });
  return jsonResponse({
    success: true,
    normalized_phone: phone,
    message: "OTP sent on WhatsApp.",
    expires_in: OTP_EXPIRY_SECONDS,
    resend_after: 60,
  });
}

async function verifyOtpRequest(req: Request): Promise<Response> {
  const body = (await req.json()) as VerifyOtpBody;
  const phone = normalizePhone(body.phone ?? "");
  const otp = (body.otp ?? "").trim();
  if (!isValidPhone(phone) || !isValidOtp(otp)) {
    return jsonResponse({ verified: false, message: "Invalid OTP" }, 400);
  }

  const admin = adminClient();
  const { data: row, error: readError } = await admin
    .from("whatsapp_otps")
    .select("id, phone, otp_hash, expires_at, attempts, verified, created_at")
    .eq("phone", phone)
    .eq("verified", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readError) throw readError;
  if (!row) return jsonResponse({ verified: false, message: "Invalid OTP" }, 400);
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await admin.from("whatsapp_otps").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    return jsonResponse({ verified: false, message: "OTP expired" }, 400);
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return jsonResponse({ verified: false, message: "Too many invalid attempts" }, 429);
  }
  const verified = await verifyOtp(otp, row.otp_hash);
  if (!verified) {
    await admin.from("whatsapp_otps").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    return jsonResponse({ verified: false, message: "Invalid OTP" }, 400);
  }

  await admin.from("whatsapp_otps").update({ verified: true }).eq("id", row.id);
  const profile = await getOrCreateProfileForPhone(phone);
  const email = profile.auth_email || profile.email;
  if (!email) {
    return jsonResponse({ verified: false, message: "Account auth email is missing." }, 400);
  }
  const session = await createSessionForEmail(email);
  await admin
    .from("profiles")
    .update({ phone_verified: true, last_login_method: "whatsapp_otp", last_login_at: new Date().toISOString() })
    .eq("id", profile.id);

  console.info("WhatsApp OTP verified", { phone, profileId: profile.id });
  return jsonResponse({
    verified: true,
    message: "OTP verified.",
    profile,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    token_type: session.token_type ?? "bearer",
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, message: "Method not allowed" }, 405);

  try {
    const path = new URL(req.url).pathname.replace(/\/+$/, "");
    if (path.endsWith("/request-otp")) return await requestOtp(req);
    if (path.endsWith("/verify-otp")) return await verifyOtpRequest(req);
    return jsonResponse({ success: false, message: "Unknown WhatsApp auth endpoint" }, 404);
  } catch (error) {
    console.error("auth-whatsapp failed", sanitizedError(error));
    return jsonResponse(
      { success: false, verified: false, message: "Unable to process WhatsApp OTP. Please try again." },
      500,
    );
  }
});
