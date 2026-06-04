# DairyFlow Android Error and Improvement Prompt

You are improving the DairyFlow Android Kotlin/Jetpack Compose app. First reproduce the current behavior, then fix the highest-impact issues without broad refactors.

Test context:
- Build command works when `JAVA_HOME` is set to `C:\Program Files\Android\Android Studio\jbr`.
- Debug APK path: `app/build/intermediates/apk/debug/app-debug.apk`.
- Tested physical device: Realme RMX3997.
- Admin debug login succeeds with mobile `8275838256` and OTP `123456`.
- Admin dashboard loads live data after login.
- Delivery-boy scanner screen opens and camera preview works.
- `Scan from photo` is blocked on this device by an OEM privacy verification screen, so QR login is hard to test through automation.

Priority fixes:

1. Fix delivery-boy debug QR login correctness.
   - Current debug QR token flow accepts `DAIRYFLOW_QR:TEST_DELIVERY_LOGIN`, but `AuthRepository.signInTestDeliveryBoy()` signs in as the admin test account and only stores a fake delivery-boy profile locally.
   - This can show delivery-boy UI while Supabase requests still run with an admin-authenticated user.
   - Replace this with a real seeded delivery-boy auth user/session, or remove the fake login path and add a safe debug-only manual QR/token entry that calls the real `verify-delivery-qr-login` function.

2. Add a support/debug fallback for delivery-boy QR login.
   - Keep camera scanning as primary.
   - Add a debug-only text field or deep link for QR payload entry so QA can test `DAIRYFLOW_QR:<token>` without using the camera or Android photo picker.
   - Add clear errors for invalid, expired, disabled, unlinked, or already-used QR tokens.

3. Improve delivery-boy QR account linking.
   - Ensure admin-created delivery-boy records always have `profile_id`, `auth_email`, `qr_login_enabled=true`, active status, and assigned route where required.
   - In the QR generator, disable generation when the delivery-boy account is incomplete and show the exact missing field.
   - Verify the Supabase migrations/functions are applied, especially reusable QR/status ambiguity fixes.

4. Harden admin forms and fake-record testing.
   - Product/customer/route/delivery/payment forms currently convert invalid numeric input to `0.0`, which silently creates bad fake records.
   - Add field-level validation for required IDs, phone length, email format, positive prices/rates/quantities, valid dates, payment amount, invoice selection, and route/product/customer dependencies.
   - Keep save buttons disabled until required fields are valid, and show specific messages beside fields.

5. Fix UI text encoding and polish.
   - Replace mojibake separators like `â€¢` with a normal hyphen or proper bullet character in UTF-8.
   - Check all cards/buttons for text clipping on the 720x1604 test device.
   - Replace placeholder buttons in invoice details: `Download PDF`, `Print`, and `Add payment` currently do nothing.

6. Improve admin CRUD feedback.
   - After saving product/customer/route/delivery-boy/delivery/payment, show a success snackbar/toast and keep the new/updated record visible.
   - On Supabase errors, show the failing table/action and user-safe reason, not only generic "Operation failed."
   - Avoid swallowing load errors with empty lists in admin data loading unless the UI clearly marks that a section failed to load.

7. Delivery-boy dashboard improvements.
   - Show assigned route, customer count, delivery count, delivered/pending/skipped counts, and collection totals at top.
   - Add pull-to-refresh and clear empty states when no route, no customers, or no deliveries are generated.
   - Confirm before marking Paid/Unpaid/Delivered/Skipped, or add undo to prevent accidental taps.

Verification checklist:
- Build debug APK successfully.
- Admin login using `8275838256` / `123456`.
- Create one fake route, product, customer, delivery boy account, daily delivery, invoice, and payment with valid data.
- Generate QR for the created delivery boy.
- Login as delivery boy with the admin-generated QR using camera and debug/manual fallback.
- Confirm delivery-boy user can only see assigned route/customers/deliveries.
- Confirm admin can see created fake records and delete or mark them as test data.
- Capture before/after screenshots and logcat snippets for any fixed crash/error.
