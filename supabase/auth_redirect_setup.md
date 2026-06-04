# Supabase Auth Redirect Setup

Manual setup required in Supabase Authentication settings:

Go to:

```text
Supabase Dashboard -> Authentication -> URL Configuration
```

Set Site URL:

```text
dairyflow://auth/callback
```

Add Redirect URLs:

```text
dairyflow://auth/callback
dairyflow://auth/**
```

Do not configure web development URLs as production redirect targets for the Android app.
Remove local web development URLs and Supabase dashboard/admin URLs from production auth redirects.

Then go to:

```text
Supabase Dashboard -> Authentication -> Email Templates -> Confirm signup
```

Make sure the confirm button/link uses:

```text
{{ .ConfirmationURL }}
```

Do not hardcode a web URL in the email template.

Important: after changing Supabase URL settings, test with a new signup email because old confirmation emails may still contain the previous redirect.

Security note: if a Supabase dashboard password was shared in chat or logs, rotate it before continuing.

## Direct Signup Without Email Confirmation

If you want the Android app to create the account and sign in immediately, disable email confirmation in Supabase:

```text
Supabase Dashboard -> Authentication -> Providers -> Email
```

Turn off:

```text
Confirm email
```

With email confirmation disabled, Supabase returns an authenticated session during signup. The app then creates/updates the `public.profiles` row and opens the dashboard directly.

Keep email confirmation enabled if you want users to verify their email first. In that mode, the app will show:

```text
Account created. Please check your email and confirm your account.
```
