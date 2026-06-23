export const todayIso = () => new Date().toISOString().slice(0, 10);

export const monthKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export const money = (value?: number | string | null) => {
  const amount = Number(value || 0);
  return `Rs. ${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

export const liters = (value?: number | string | null) => {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })} L`;
};

export const numberValue = (value: FormDataEntryValue | null) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const textValue = (value: FormDataEntryValue | null) => {
  const text = String(value || "").trim();
  if (text === "none") return null;
  return text.length ? text : null;
};

export type DeliveryStatus = "Pending" | "Delivered" | "Skipped" | "Cancelled";

export interface ProfileRow {
  id: string;
  full_name: string;
  dairy_name?: string | null;
  role: "admin" | "delivery_boy" | "customer";
  admin_id?: string | null;
  delivery_boy_id?: string | null;
}

export interface RouteRow {
  id: string;
  route_name: string;
  area?: string | null;
  status?: string | null;
}

export interface ProductRow {
  id: string;
  name: string;
  category?: string | null;
  unit?: string | null;
  price?: number | null;
  stock_quantity?: number | null;
  description?: string | null;
  status?: string | null;
}

export interface CustomerRow {
  id: string;
  full_name: string;
  phone?: string | null;
  address?: string | null;
  area?: string | null;
  route_id?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  product_category?: string | null;
  milk_type?: string | null;
  delivery_time?: string | null;
  daily_quantity?: number | null;
  morning_quantity?: number | null;
  evening_quantity?: number | null;
  price_per_liter?: number | null;
  opening_balance?: number | null;
  advance_payment?: number | null;
  status?: string | null;
}

export interface DeliveryBoyRow {
  id: string;
  profile_id?: string | null;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  assigned_route_id?: string | null;
  status?: string | null;
}

export interface DeliveryRow {
  id: string;
  customer_id: string;
  product_id?: string | null;
  route_id?: string | null;
  delivery_boy_id?: string | null;
  delivery_date: string;
  delivery_time?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  total_amount?: number | null;
  delivery_status?: DeliveryStatus | string | null;
  delivery_boy_status?: DeliveryStatus | string | null;
  payment_status?: string | null;
  skip_reason?: string | null;
  notes?: string | null;
  delivery_completed_at?: string | null;
  customers?: CustomerRow | null;
  products?: ProductRow | null;
  delivery_boys?: DeliveryBoyRow | null;
}

export interface InvoiceRow {
  id: string;
  customer_id: string;
  invoice_number: string;
  billing_month: string;
  subtotal?: number | null;
  previous_balance?: number | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  balance_amount?: number | null;
  status?: string | null;
  customers?: CustomerRow | null;
}

export interface PaymentRow {
  id: string;
  customer_id: string;
  invoice_id?: string | null;
  collected_by?: string | null;
  amount: number;
  payment_date: string;
  payment_method?: string | null;
  payment_type?: string | null;
  notes?: string | null;
  customers?: CustomerRow | null;
  invoices?: InvoiceRow | null;
}
