import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type CreateDeliveryBoyAccountRequest = {
  delivery_boy_id?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  assigned_route_id?: string | null;
  active?: boolean | null;
};

function normalizePhone(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits.length > 0 ? digits : null;
}

async function findUserByEmail(admin: ReturnType<typeof createClient>, email: string) {
  let page = 1;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 1000) return null;
    page += 1;
  }
  return null;
}

async function ensureAuthUser(admin: ReturnType<typeof createClient>, email: string, fullName: string, phone: string | null) {
  const existing = await findUserByEmail(admin, email);
  if (existing) return existing;
  const password = crypto.randomUUID() + crypto.randomUUID();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      phone,
      role: "delivery_boy",
    },
  });
  if (error) {
    const maybeExisting = await findUserByEmail(admin, email);
    if (maybeExisting) return maybeExisting;
    throw error;
  }
  if (!data.user) throw new Error("Unable to create delivery boy auth user.");
  return data.user;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (req.method !== "POST") return jsonResponse({ success: false, message: "Method not allowed" }, 405);

    const authHeader = req.headers.get("Authorization") ?? "";
    const adminToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!adminToken) return jsonResponse({ success: false, message: "Admin login is required." }, 401);

    const body = (await req.json()) as CreateDeliveryBoyAccountRequest;
    const fullName = (body.full_name ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const phone = normalizePhone(body.phone);
    const status = body.active === false ? "inactive" : "active";

    if (!fullName) return jsonResponse({ success: false, message: "Delivery boy name is required." }, 400);
    if (!email) return jsonResponse({ success: false, message: "Delivery boy email is required for QR login." }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${adminToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser(adminToken);
    if (userError || !userData.user) return jsonResponse({ success: false, message: "Admin login is invalid. Please login again." }, 401);

    const { data: adminProfile, error: profileError } = await admin
      .from("profiles")
      .select("id, role, status")
      .eq("id", userData.user.id)
      .single();
    if (profileError || !adminProfile || adminProfile.role !== "admin" || adminProfile.status !== "active") {
      return jsonResponse({ success: false, message: "Only an active admin can create delivery boy accounts." }, 403);
    }

    const authUser = await ensureAuthUser(admin, email, fullName, phone);
    const deliveryPayload = {
      admin_id: adminProfile.id,
      profile_id: authUser.id,
      full_name: fullName,
      phone,
      email,
      assigned_route_id: body.assigned_route_id || null,
      route_id: body.assigned_route_id || null,
      status,
      updated_at: new Date().toISOString(),
    };

    let deliveryBoy;
    if (body.delivery_boy_id) {
      const { data, error } = await admin
        .from("delivery_boys")
        .update(deliveryPayload)
        .eq("id", body.delivery_boy_id)
        .eq("admin_id", adminProfile.id)
        .select()
        .single();
      if (error) throw error;
      deliveryBoy = data;
    } else {
      const { data: existing } = await admin
        .from("delivery_boys")
        .select("*")
        .eq("admin_id", adminProfile.id)
        .or(`profile_id.eq.${authUser.id},email.eq.${email}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        const { data, error } = await admin
          .from("delivery_boys")
          .update(deliveryPayload)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        deliveryBoy = data;
      } else {
        const { data, error } = await admin
          .from("delivery_boys")
          .insert(deliveryPayload)
          .select()
          .single();
        if (error) throw error;
        deliveryBoy = data;
      }
    }

    const profilePayload = {
      id: authUser.id,
      admin_id: adminProfile.id,
      delivery_boy_id: deliveryBoy.id,
      full_name: fullName,
      email,
      auth_email: email,
      phone,
      normalized_phone: phone,
      role: "delivery_boy",
      phone_verified: true,
      login_enabled: true,
      qr_login_enabled: true,
      status,
      updated_at: new Date().toISOString(),
    };
    const { error: upsertProfileError } = await admin
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" });
    if (upsertProfileError) throw upsertProfileError;

    return jsonResponse({ success: true, delivery_boy: deliveryBoy, profile: profilePayload });
  } catch (error) {
    console.error("create-delivery-boy-account failed", error);
    return jsonResponse({ success: false, message: error instanceof Error ? error.message : "Unable to create delivery boy account." }, 500);
  }
});
