# DairyFlow Web Application

DairyFlow is a React + Vite + TypeScript web app for the existing DairyFlow Supabase backend used by the Android app. It reuses the previous `milk-route-ai-manager-main` UI stack with Tailwind CSS, shadcn/ui, React Query, React Router, Supabase Auth, and English/Hindi/Marathi locale infrastructure.

## Setup

```bash
npm install
npm run dev
npm run build
```

Create a local `.env` file when deploying to a different Supabase project:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

## Supabase Contract

The web app is wired to the Android DairyFlow schema, not a new demo database. It uses these existing tables and RPCs:

- `profiles`, `routes`, `products`, `customers`, `delivery_boys`
- `deliveries`, `payments`, `invoices`, `invoice_items`
- `customer_holds`, `delivery_boy_daily_stock`, `delivery_day_completion`
- `generate_today_deliveries`, `generate_monthly_invoices`
- `admin_create_delivery_qr_token`, `consume_delivery_qr_token`
- `delivery_boy_complete_today_deliveries`

Keep applying Android migrations from `DairyFlow/supabase/migrations` to the Supabase project. The web app does not hardcode customers, products, delivery boys, invoices, or payments.

## Modules

- Role-based login and profile routing
- Admin dashboard with customers, delivery boys, daily delivery status, monthly collection, and pending amount
- Product CRUD for Cow and Buffalo categories
- Customer CRUD with route, shift, product, quantity, advance payment, and hold dates
- Delivery boy management with route assignment and QR token generation
- Delivery boy performance with taken milk quantity and delivered liters
- Today deliveries with delivered, skipped, milk-not-needed, quantity editing, and extra product delivery
- Monthly billing and invoice list
- Payments and payment history
- Reports for milk, collections, pending payments, and delivery records

