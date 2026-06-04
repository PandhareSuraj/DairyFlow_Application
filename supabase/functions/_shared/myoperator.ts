type MyOperatorTemplatePayload = {
  to: string;
  otp: string;
};

type RecipientParts = {
  countryCode: string;
  nationalNumber: string;
};

function envValue(...names: string[]): string | null {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value) return value;
  }
  return null;
}

function requiredEnv(...names: string[]): string {
  const value = envValue(...names);
  if (!value) throw new Error(`Missing Edge Function secret: ${names.join(" or ")}`);
  return value;
}

function recipientParts(value: string): RecipientParts {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return { countryCode: "91", nationalNumber: digits };
  }
  if (digits.startsWith("91") && digits.length === 12) {
    return { countryCode: "91", nationalNumber: digits.slice(2) };
  }
  const countryCode = digits.startsWith("91") && digits.length > 10 ? "91" : "";
  const nationalNumber = countryCode ? digits.slice(countryCode.length) : digits;
  return { countryCode, nationalNumber };
}

function authHeaders(authToken: string, companyId: string): HeadersInit {
  const mode = (Deno.env.get("MYOPERATOR_AUTH_MODE") ?? "bearer").toLowerCase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-MYOP-COMPANY-ID": companyId,
  };

  if (mode === "bearer") {
    headers.Authorization = `Bearer ${authToken}`;
  } else if (mode === "authorization") {
    headers.Authorization = authToken;
  } else if (mode === "x-api-key") {
    headers["x-api-key"] = authToken;
  } else if (mode !== "query") {
    throw new Error(`Unsupported MYOPERATOR_AUTH_MODE: ${mode}`);
  }

  return headers;
}

export async function sendOtpTemplate({ to, otp }: MyOperatorTemplatePayload): Promise<void> {
  const baseUrl = (envValue("MYOPERATOR_BASE_URL", "WHATSAPP_BASE_URL") ?? "https://publicapi.myoperator.co").replace(/\/+$/, "");
  const companyId = requiredEnv("MYOPERATOR_COMPANY_ID", "WHATSAPP_COMPANY_ID");
  const authToken = requiredEnv("MYOPERATOR_AUTH_TOKEN", "WHATSAPP_API_KEY");
  const phoneNumberId = requiredEnv("MYOPERATOR_PHONE_NUMBER_ID", "WHATSAPP_PHONE_NUMBER_ID");
  const sendPath = Deno.env.get("MYOPERATOR_SEND_TEMPLATE_PATH") ?? "/chat/messages";
  const languageCode = Deno.env.get("MYOPERATOR_TEMPLATE_LANGUAGE") ?? "en";
  const templateName = Deno.env.get("MYOPERATOR_TEMPLATE_NAME") ?? "otp_verify";
  const otpVariableName = Deno.env.get("MYOPERATOR_TEMPLATE_OTP_VARIABLE") ?? "otp";
  const includeLanguage = (Deno.env.get("MYOPERATOR_TEMPLATE_INCLUDE_LANGUAGE") ?? "false").toLowerCase() === "true";
  const authMode = (Deno.env.get("MYOPERATOR_AUTH_MODE") ?? "bearer").toLowerCase();
  const recipient = recipientParts(to);
  if (!recipient.countryCode || recipient.nationalNumber.length < 10) {
    throw new Error("Invalid WhatsApp recipient number.");
  }
  const url = new URL(`${baseUrl}${sendPath.startsWith("/") ? sendPath : `/${sendPath}`}`);
  if (authMode === "query") {
    url.searchParams.set("token", authToken);
  }

  const payload = {
    phone_number_id: phoneNumberId,
    customer_country_code: recipient.countryCode,
    customer_number: recipient.nationalNumber,
    data: {
      type: "template",
      context: {
        template_name: templateName,
        ...(includeLanguage ? { language: languageCode } : {}),
        body: {
          [otpVariableName]: otp,
        },
        buttons: [
          {
            index: 0,
            otp,
          },
        ],
      },
    },
    reply_to: null,
    myop_ref_id: null,
    trail: { name: null },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(authToken, companyId),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MyOperator send failed (${response.status}): ${text.slice(0, 240)}`);
  }

  const text = await response.text();
  if (text) {
    const lower = text.toLowerCase();
    if (lower.includes('"status":"error"') || lower.includes('"success":false')) {
      throw new Error(`MyOperator rejected OTP request: ${text.slice(0, 240)}`);
    }
  }
}
