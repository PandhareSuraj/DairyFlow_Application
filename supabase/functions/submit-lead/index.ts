import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BIZFLOW_ENDPOINT =
  "https://gcyrapukltxjohjfxgza.supabase.co/functions/v1/submit-inquiry";
const BIZFLOW_SOURCE = "milkroute_website";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("BIZFLOW_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { contact_person, phone, email, message } = body;

    // Server-side validation
    if (!contact_person || typeof contact_person !== "string" || contact_person.trim().length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: "Name must be at least 2 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!phone || typeof phone !== "string" || !/^[6-9]\d{9}$/.test(phone.trim())) {
      return new Response(
        JSON.stringify({ success: false, error: "Enter a valid 10-digit Indian phone number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: Record<string, string> = {
      contact_person: contact_person.trim().substring(0, 100),
      phone: phone.trim(),
      source: BIZFLOW_SOURCE,
    };

    if (email && typeof email === "string" && email.trim()) {
      payload.email = email.trim().substring(0, 255);
    }
    if (message && typeof message === "string" && message.trim()) {
      payload.message = message.trim().substring(0, 2000);
    }

    const BIZFLOW_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjeXJhcHVrbHR4am9oamZ4Z3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDg3NTksImV4cCI6MjA4Mzg4NDc1OX0.tvwOyTOvbynPjLKp1H8GDUit2g820bvhg5419wFvY4Y";

    const crmResponse = await fetch(BIZFLOW_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": BIZFLOW_ANON_KEY,
        "x-public-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const result = await crmResponse.json();

    return new Response(JSON.stringify(result), {
      status: crmResponse.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
