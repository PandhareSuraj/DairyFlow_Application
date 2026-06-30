import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, normalizePhone } from "../_shared/cors.ts";
import { sendOtpTemplate } from "../_shared/myoperator.ts";

type SendOtpRequest = {
  phone?: string;
  purpose?: "signup" | "login" | "reset" | "reset_password";
  role?: "admin" | "delivery_boy";
  admin_access_code?: string | null;
  device_id?: string | null;
};

function createOtp(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1_000_000).padStart(6, "0");
}

function sanitizedErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const tokens = [
    Deno.env.get("MYOPERATOR_AUTH_TOKEN"),
    Deno.env.get("WHATSAPP_API_KEY"),
  ].filter((value): value is string => Boolean(value));
  return tokens.reduce((message, token) => message.replaceAll(token, "[redacted]"), raw);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, message: "Method not allowed" }, 405);
    }

    const body = (await req.json()) as SendOtpRequest;
    const phone = normalizePhone(body.phone ?? "");
    const purpose = body.purpose === "reset_password" ? "reset" : body.purpose ?? "login";
    const role = body.role ?? "admin";
    const otp = createOtp();

    if (phone.length < 10) {
      return jsonResponse({ success: false, message: "Invalid phone number" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: requestId, error } = await admin.rpc("create_whatsapp_otp_request", {
      p_phone: phone,
      p_otp: otp,
      p_purpose: purpose,
      p_role: role,
      p_admin_access_code: body.admin_access_code ?? null,
      p_ip_address: req.headers.get("x-forwarded-for"),
      p_device_id: body.device_id ?? null,
    });

    if (error) {
      const message = error.message?.includes("admin access")
        ? "Invalid admin access code"
        : error.message ?? "Unable to create OTP";
      return jsonResponse({ success: false, message }, 400);
    }

    try {
      await sendOtpTemplate({ to: phone, otp });
    } catch (error) {
      if (requestId) {
        await admin.from("whatsapp_otp_requests").delete().eq("id", requestId);
      }
      throw error;
    }

    return jsonResponse({
      success: true,
      normalized_phone: phone,
      message: "OTP sent on WhatsApp.",
      expires_in: 300,
    });
  } catch (error) {
    console.error("send-whatsapp-otp failed", error);
    return jsonResponse(
      { success: false, message: sanitizedErrorMessage(error) },
      500,
    );
  }
});
