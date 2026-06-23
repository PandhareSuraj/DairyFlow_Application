const OTP_LENGTH = 6;
const HASH_VERSION = "v1";

export function generateOtp(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1_000_000).padStart(OTP_LENGTH, "0");
}

export function isValidOtp(value: string): boolean {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(value);
}

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 || (digits.startsWith("91") && digits.length === 12);
}

export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

export async function hashOtp(otp: string, salt = crypto.randomUUID()): Promise<string> {
  if (!isValidOtp(otp)) throw new Error("Invalid OTP format.");
  const digest = await sha256(`${salt}:${otp}`);
  return `${HASH_VERSION}:${salt}:${digest}`;
}

export async function verifyOtp(otp: string, storedHash: string): Promise<boolean> {
  if (!isValidOtp(otp)) return false;
  const [version, salt, digest] = storedHash.split(":");
  if (version !== HASH_VERSION || !salt || !digest) return false;
  const candidate = await sha256(`${salt}:${otp}`);
  return timingSafeEqual(candidate, digest);
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}
