import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, normalizePhone } from "../_shared/cors.ts";

type VerifyOtpRequest = {
  phone?: string;
  otp?: string;
};

type VerifyOtpRow = {
  verified: boolean;
  purpose?: string | null;
  role?: string | null;
  email?: string | null;
  message?: string | null;
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

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (error) throw error;

  const tokenHash = magicLinkTokenHash(data?.properties as Record<string, unknown> | undefined);
  if (!tokenHash) throw new Error("Unable to generate phone login token.");

  const response = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "magiclink",
      token_hash: tokenHash,
    }),
  });

  const session = await response.json();
  if (!response.ok) {
    throw new Error(session?.msg ?? session?.message ?? "Unable to create phone login session.");
  }
  return session;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ verified: false, message: "Method not allowed" }, 405);
    }

    const body = (await req.json()) as VerifyOtpRequest;
    const phone = normalizePhone(body.phone ?? "");
    const otp = (body.otp ?? "").trim();

    if (phone.length < 10 || otp.length < 4) {
      return jsonResponse({ verified: false, message: "Invalid OTP" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin.rpc("verify_whatsapp_otp", {
      p_phone: phone,
      p_otp: otp,
    });

    if (error) {
      return jsonResponse({ verified: false, message: error.message ?? "Invalid OTP" }, 400);
    }

    const rawResult = Array.isArray(data) ? data[0] : data;
    const row = typeof rawResult === "boolean"
      ? ({ verified: rawResult, message: rawResult ? "OTP verified." : "Invalid OTP" } as VerifyOtpRow)
      : rawResult as VerifyOtpRow | undefined;

    if (!row?.verified) {
      return jsonResponse({ verified: false, message: row?.message ?? "Invalid OTP" }, 400);
    }

    if (!row.email) {
      return jsonResponse({
        verified: true,
        message: row.message ?? "OTP verified.",
      });
    }

    const session = await createSessionForEmail(row.email);
    return jsonResponse({
      verified: true,
      message: row.message ?? "OTP verified.",
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      token_type: session.token_type ?? "bearer",
    });
  } catch (error) {
    console.error("verify-whatsapp-otp failed", error);
    return jsonResponse(
      { verified: false, message: "Unable to verify WhatsApp OTP. Please try again." },
      500,
    );
  }
});
