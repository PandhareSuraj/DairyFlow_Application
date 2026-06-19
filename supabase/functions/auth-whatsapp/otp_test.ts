import { assert, assertEquals, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { generateOtp, hashOtp, isValidOtp, normalizePhone, verifyOtp } from "./otp.ts";

Deno.test("generateOtp returns a six digit numeric code", () => {
  const otp = generateOtp();
  assertMatch(otp, /^\d{6}$/);
});

Deno.test("hashOtp verifies the correct OTP only", async () => {
  const hash = await hashOtp("123456", "unit-test-salt");
  assert(await verifyOtp("123456", hash));
  assertEquals(await verifyOtp("654321", hash), false);
});

Deno.test("verifyOtp rejects malformed values", async () => {
  const hash = await hashOtp("123456", "unit-test-salt");
  assertEquals(await verifyOtp("12345", hash), false);
  assertEquals(await verifyOtp("abcdef", hash), false);
  assertEquals(await verifyOtp("123456", "bad-hash"), false);
});

Deno.test("normalizePhone keeps WhatsApp login numbers in E.164 digits", () => {
  assertEquals(normalizePhone("9876543210"), "919876543210");
  assertEquals(normalizePhone("+91 98765 43210"), "919876543210");
});

Deno.test("isValidOtp accepts exactly six digits", () => {
  assert(isValidOtp("000001"));
  assertEquals(isValidOtp("00001"), false);
});
