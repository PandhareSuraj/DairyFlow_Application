# DairyFlow

DairyFlow is a monorepo containing the Android application, the React/Vite admin website, and shared Supabase migrations.

## Repository Structure

```text
DairyFlow/
├── application/        # Android app
├── website/            # React + Vite web app
├── supabase/           # Shared Supabase migrations
├── README.md
└── .gitignore
```

## Android App

Open the Android project directly from Android Studio:

1. Open `application/`
2. Sync Gradle
3. Run the app

The Android app uses the shared DairyFlow Supabase project and the same table names used by the website.

## Website

Run the web app separately from the `website/` folder:

```bash
cd website
npm install
npm run dev
```

Build the website:

```bash
cd website
npm run build
```

## Database

Both apps must use the same Supabase URL and anon key.

Shared tables include:

- `profiles`
- `customers`
- `products`
- `delivery_boys`
- `routes`
- `deliveries`
- `invoices`
- `payments`

Database changes must be added as migrations in:

```text
supabase/migrations/
```

Do not create duplicate Android-only or website-only versions of shared tables. Keep table names and column names consistent across both apps.

## Security

Access control should be handled with Supabase RLS and `profiles.role`:

- Admin web users can manage their dairy data.
- Delivery boys can only access assigned deliveries.
- Customers can only access their own records.

