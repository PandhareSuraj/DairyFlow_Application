import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarCheck,
  CreditCard,
  Eye,
  IndianRupee,
  LayoutDashboard,
  Loader2,
  LogOut,
  Milk,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Truck,
  Users,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  CustomerRow,
  DeliveryBoyRow,
  DeliveryRow,
  InvoiceRow,
  PaymentRow,
  ProductRow,
  RouteRow,
  liters,
  money,
  monthKey,
  numberValue,
  textValue,
  todayIso,
} from "@/lib/dairyflow";

type Section =
  | "dashboard"
  | "products"
  | "routes"
  | "customers"
  | "delivery-boys"
  | "performance"
  | "deliveries"
  | "billing"
  | "payments"
  | "reports";

const sections: Array<{ id: Section; label: string; icon: any }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "routes", label: "Routes", icon: Truck },
  { id: "customers", label: "Customers", icon: Users },
  { id: "delivery-boys", label: "Delivery Boys", icon: Truck },
  { id: "performance", label: "Performance", icon: BarChart3 },
  { id: "deliveries", label: "Deliveries", icon: CalendarCheck },
  { id: "billing", label: "Billing", icon: IndianRupee },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "reports", label: "Reports", icon: Milk },
];

const statusTone = (status?: string | null) => {
  if (status === "Delivered" || status === "Paid" || status === "completed" || status === "active") return "default";
  if (status === "Pending" || status === "Partial" || status === "partial") return "secondary";
  if (status === "Skipped" || status === "Unpaid" || status === "inactive") return "destructive";
  return "outline";
};

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="rounded-lg border border-dashed p-8 text-center">
    <p className="font-medium text-foreground">{title}</p>
    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    {children}
  </div>
);

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="space-y-1">
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="break-words text-sm font-medium text-foreground">{value || "—"}</p>
  </div>
);

const mutationErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const details = error as { message?: string; details?: string; hint?: string };
    return details.message || details.details || details.hint || "Please check the form and try again.";
  }
  return typeof error === "string" ? error : "Please check the form and try again.";
};

const datesBetween = (fromDate: string, toDate: string) => {
  const dates: string[] = [];
  const cursor = new Date(`${fromDate}T00:00:00`);
  const end = new Date(`${toDate}T00:00:00`);
  while (cursor <= end) {
    dates.push(todayIso(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

const activeHoldCustomerIds = async (adminId: string, deliveryDate: string) => {
  const datedHolds = await supabase
    .from("customer_holds" as any)
    .select("customer_id")
    .eq("status", "active")
    .eq("hold_date", deliveryDate);

  if (!datedHolds.error) {
    return new Set((datedHolds.data || []).map((hold: any) => String(hold.customer_id)));
  }

  const rangeHolds = await supabase
    .from("customer_holds" as any)
    .select("customer_id")
    .eq("admin_id", adminId)
    .lte("from_date", deliveryDate)
    .gte("to_date", deliveryDate);

  if (!rangeHolds.error) {
    return new Set((rangeHolds.data || []).map((hold: any) => String(hold.customer_id)));
  }

  if (datedHolds.error.code === "42P01" || rangeHolds.error.code === "42P01") return new Set<string>();
  throw rangeHolds.error;
};

const callGenerateTodayDeliveries = async (deliveryDate: string, adminId: string, routeId?: string | null) => {
  let customerQuery = supabase
    .from("customers" as any)
    .select("*")
    .eq("admin_id", adminId)
    .eq("status", "active");
  if (routeId) customerQuery = customerQuery.eq("route_id", routeId);

  const [customersResult, productsResult, deliveryBoysResult, existingResult, heldCustomerIds] = await Promise.all([
    customerQuery,
    supabase.from("products" as any).select("*").eq("admin_id", adminId).eq("status", "active").order("created_at"),
    supabase.from("delivery_boys" as any).select("*").eq("admin_id", adminId).eq("status", "active").order("created_at"),
    supabase.from("deliveries" as any).select("customer_id, delivery_time").eq("admin_id", adminId).eq("delivery_date", deliveryDate),
    activeHoldCustomerIds(adminId, deliveryDate),
  ]);

  if (customersResult.error) throw customersResult.error;
  if (productsResult.error) throw productsResult.error;
  if (deliveryBoysResult.error) throw deliveryBoysResult.error;
  if (existingResult.error) throw existingResult.error;

  const customers = (customersResult.data || []) as CustomerRow[];
  const products = (productsResult.data || []) as ProductRow[];
  const deliveryBoys = (deliveryBoysResult.data || []) as DeliveryBoyRow[];
  if (!products.length) return 0;

  const existingKeys = new Set(
    (existingResult.data || []).map((delivery: any) => `${delivery.customer_id}|${String(delivery.delivery_time || "").toLowerCase()}`),
  );
  let created = 0;

  for (const customer of customers) {
    if (heldCustomerIds.has(customer.id)) continue;
    const milkType = String(customer.milk_type || "").toLowerCase();
    const productCategory = String(customer.product_category || customer.milk_type || "").toLowerCase();
    const product =
      products.find((item) => item.id === customer.product_id) ||
      products.find((item) => item.name.toLowerCase() === "milk" && String(item.category || "").toLowerCase() === productCategory) ||
      products.find((item) => {
        const name = item.name.toLowerCase();
        return name === milkType || name.includes(milkType) || String(item.category || "").toLowerCase() === productCategory;
      }) ||
      products[0];
    const normalizedTime = String(customer.delivery_time || "Morning").toLowerCase();
    const dailyQuantity = Number(customer.daily_quantity || 0);
    const morningQuantity = Number(customer.morning_quantity || 0) || (normalizedTime === "morning" || normalizedTime === "both" ? dailyQuantity : 0);
    const eveningQuantity = Number(customer.evening_quantity || 0) || (normalizedTime === "evening" || normalizedTime === "both" ? dailyQuantity : 0);
    const unitPrice = Number(customer.price_per_liter || 0) || Number(product.price || 0);
    if (unitPrice <= 0) continue;

    for (const [deliveryTime, quantity] of [["Morning", morningQuantity], ["Evening", eveningQuantity]] as const) {
      const key = `${customer.id}|${deliveryTime.toLowerCase()}`;
      if (quantity <= 0 || existingKeys.has(key)) continue;
      const deliveryBoy = deliveryBoys.find((boy) => boy.assigned_route_id === customer.route_id);
      const { error } = await supabase.from("deliveries" as any).insert({
        admin_id: adminId,
        customer_id: customer.id,
        product_id: product.id,
        route_id: customer.route_id || null,
        delivery_boy_id: deliveryBoy?.id || null,
        delivery_date: deliveryDate,
        delivery_time: deliveryTime,
        quantity,
        unit_price: unitPrice,
        total_amount: quantity * unitPrice,
        delivery_status: "Pending",
        payment_status: "Unpaid",
        notes: "Auto-created from customer daily schedule",
      });
      if (error && error.code !== "23505") throw error;
      existingKeys.add(key);
      if (!error) created += 1;
    }
  }

  return created;
};

const generateQrRawToken = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const useAdminData = (adminId: string | null) => {
  const enabled = Boolean(adminId);
  const products = useQuery({
    queryKey: ["products", adminId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("products" as any).select("*").eq("admin_id", adminId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ProductRow[];
    },
  });
  const routes = useQuery({
    queryKey: ["routes", adminId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("routes" as any).select("*").eq("admin_id", adminId).order("route_name");
      if (error) throw error;
      return (data || []) as RouteRow[];
    },
  });
  const customers = useQuery({
    queryKey: ["customers", adminId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("customers" as any).select("*").eq("admin_id", adminId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as CustomerRow[];
    },
  });
  const deliveryBoys = useQuery({
    queryKey: ["delivery-boys", adminId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("delivery_boys" as any).select("*").eq("admin_id", adminId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as DeliveryBoyRow[];
    },
  });
  const deliveries = useQuery({
    queryKey: ["deliveries", adminId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries" as any)
        .select("*, customers(*), products(*), delivery_boys(*)")
        .eq("admin_id", adminId)
        .order("delivery_date", { ascending: false })
        .limit(250);
      if (error) throw error;
      return (data || []) as DeliveryRow[];
    },
  });
  const invoices = useQuery({
    queryKey: ["invoices", adminId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices" as any)
        .select("*, customers(*)")
        .eq("admin_id", adminId)
        .order("created_at", { ascending: false })
        .limit(150);
      if (error) throw error;
      return (data || []) as InvoiceRow[];
    },
  });
  const payments = useQuery({
    queryKey: ["payments", adminId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments" as any)
        .select("*, customers(*), invoices(*)")
        .eq("admin_id", adminId)
        .order("payment_date", { ascending: false })
        .limit(150);
      if (error) throw error;
      return (data || []) as PaymentRow[];
    },
  });
  const holds = useQuery({
    queryKey: ["customer-holds", adminId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("customer_holds" as any).select("*").eq("admin_id", adminId).order("from_date", { ascending: false });
      if (error && error.code !== "42P01") throw error;
      return (data || []) as any[];
    },
  });
  return { products, routes, customers, deliveryBoys, deliveries, invoices, payments, holds };
};

const realtimeTables = [
  "profiles",
  "customers",
  "products",
  "delivery_boys",
  "routes",
  "deliveries",
  "invoices",
  "payments",
];

const useDairyFlowRealtime = (adminId: string | null) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!adminId) return;

    const channel = supabase.channel(`dairyflow-shared-${adminId}`);
    realtimeTables.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          queryClient.invalidateQueries();
        },
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminId, queryClient]);
};

const useEnsureTodayDeliveries = (adminId: string | null, enabled: boolean, scheduleRevision: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const activeRun = useRef<string | null>(null);
  const completedRun = useRef<string | null>(null);

  useEffect(() => {
    if (!adminId || !enabled) return;
    const today = todayIso();
    const key = `${adminId}|${today}|${scheduleRevision}`;
    if (activeRun.current === key || completedRun.current === key) return;
    activeRun.current = key;

    callGenerateTodayDeliveries(today, adminId)
      .then((created) => {
        completedRun.current = key;
        if (created > 0) queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      })
      .catch((error) => {
        toast({ title: "Daily deliveries were not auto-created", description: mutationErrorMessage(error), variant: "destructive" });
      })
      .finally(() => {
        if (activeRun.current === key) activeRun.current = null;
      });
  }, [adminId, enabled, queryClient, scheduleRevision, toast]);
};

const AuthScreen = () => {
  const { sendAdminWhatsAppOtp, verifyAdminWhatsAppOtp, isLoading } = useAuth();
  const { toast } = useToast();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [phone, setPhone] = useState("");

  const submitSendOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const mobile = String(form.get("phone") || "");
    setPhone(mobile);
    const result = await sendAdminWhatsAppOtp(mobile);
    if (result.error) toast({ title: "Could not send OTP", description: result.error, variant: "destructive" });
    else {
      setOtpSent(true);
      toast({ title: "WhatsApp OTP sent", description: result.message || "Check WhatsApp for your OTP." });
    }
  };

  const submitVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const mobile = String(form.get("phone") || phone);
    const result = await verifyAdminWhatsAppOtp(mobile, String(form.get("otp") || ""));
    if (result.error) toast({ title: "Admin login failed", description: result.error, variant: "destructive" });
  };

  return (
    <main className="min-h-screen bg-[#f8f3ea]">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-8">
        <Card className="w-full border-none bg-transparent shadow-none">
          <CardHeader>
            {showAdminLogin && (
              <Button
                type="button"
                variant="ghost"
                className="mb-4 w-fit px-0"
                onClick={() => {
                  setShowAdminLogin(false);
                  setOtpSent(false);
                  setPhone("");
                }}
              >
                Back
              </Button>
            )}
            <div className="mb-5 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Milk className="h-8 w-8" />
              </div>
            </div>
            <CardTitle className="text-center text-3xl font-bold text-slate-900">
              {showAdminLogin ? "Admin Login" : "Welcome to DairyFlow"}
            </CardTitle>
            <CardDescription className="text-center text-base text-slate-700">
              {showAdminLogin ? "WhatsApp mobile OTP" : "Admin web portal"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showAdminLogin ? (
              <Button className="h-16 w-full rounded-full text-base" onClick={() => setShowAdminLogin(true)}>
                Login as Admin
              </Button>
            ) : (
              <div className="space-y-4">
              <form onSubmit={submitSendOtp} className="space-y-4">
                <Field label="Mobile Number">
                  <Input
                    name="phone"
                    inputMode="numeric"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 12))}
                    placeholder="10 digit mobile number"
                    required
                  />
                </Field>
                <Button type="submit" variant="outline" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send WhatsApp OTP
                </Button>
              </form>
              <form onSubmit={submitVerifyOtp} className="space-y-4">
                <input type="hidden" name="phone" value={phone} />
                <Field label="OTP">
                  <Input name="otp" inputMode="numeric" maxLength={6} placeholder="6 digit OTP" required />
                </Field>
                <Button className="w-full" disabled={isLoading || !otpSent}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify & Login
                </Button>
              </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

const Shell = ({ section, setSection, children }: { section: Section; setSection: (section: Section) => void; children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed left-0 top-0 z-20 hidden h-screen w-64 border-r bg-background md:block">
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Milk className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">DairyFlow</p>
            <p className="text-xs text-muted-foreground">{user?.dairy_name || user?.role}</p>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {sections.map((item) => (
            <Button
              key={item.id}
              variant={section === item.id ? "secondary" : "ghost"}
              className="w-full justify-start gap-3"
              onClick={() => setSection(item.id)}
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </Button>
          ))}
        </nav>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
          <div>
            <h2 className="text-lg font-semibold">{sections.find((item) => item.id === section)?.label}</h2>
            <p className="text-xs text-muted-foreground">{user?.full_name}</p>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </header>
        <main className="p-4 pb-24 md:p-6">{children}</main>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex overflow-x-auto border-t bg-background md:hidden">
        {sections.map((item) => (
          <button key={item.id} onClick={() => setSection(item.id)} className={`flex min-w-[76px] flex-1 flex-col items-center gap-1 px-2 py-2 text-[11px] ${section === item.id ? "text-primary" : "text-muted-foreground"}`}>
            <item.icon className="h-5 w-5" />
            <span className="max-w-full truncate">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, hint }: { title: string; value: string | number; icon: any; hint?: string }) => (
  <Card>
    <CardContent className="flex items-center justify-between p-5">
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="rounded-md bg-primary/10 p-3 text-primary">
        <Icon className="h-5 w-5" />
      </div>
    </CardContent>
  </Card>
);

type DonutSlice = {
  name: string;
  value: number;
  color: string;
  displayValue: string;
};

const DonutChartCard = ({
  title,
  description,
  data,
  centerValue,
  centerLabel,
  emptyDescription,
}: {
  title: string;
  description: string;
  data: DonutSlice[];
  centerValue: string;
  centerLabel: string;
  emptyDescription: string;
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {total <= 0 ? (
          <EmptyState title="No data yet" description={emptyDescription} />
        ) : (
          <div className="grid items-center gap-4 sm:grid-cols-[minmax(220px,280px)_1fr]">
            <div className="relative mx-auto h-56 w-full max-w-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {data.map((item) => <Cell key={item.name} fill={item.color} />)}
                  </Pie>
                  <RechartsTooltip
                    formatter={(_value, _name, item) => [item.payload.displayValue, item.payload.name]}
                    contentStyle={{ borderRadius: 6, borderColor: "hsl(var(--border))", background: "hsl(var(--background))" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-semibold tabular-nums">{centerValue}</span>
                <span className="text-xs text-muted-foreground">{centerLabel}</span>
              </div>
            </div>
            <div className="grid gap-3">
              {data.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-4 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="truncate text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium tabular-nums">{item.displayValue}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const DashboardSection = ({ data, onNavigate }: { data: ReturnType<typeof useAdminData>; onNavigate: (section: Section) => void }) => {
  const today = todayIso();
  const todayDeliveries = (data.deliveries.data || []).filter((delivery) => delivery.delivery_date === today);
  const pendingAmount = (data.invoices.data || []).reduce((sum, invoice) => sum + Number(invoice.balance_amount || 0), 0);
  const monthlyCollection = (data.payments.data || [])
    .filter((payment) => payment.payment_date?.startsWith(monthKey()))
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const paidAmount = (data.invoices.data || []).reduce((sum, invoice) => sum + Number(invoice.paid_amount || 0), 0);
  const deliveryChartData: DonutSlice[] = [
    { name: "Delivered", value: todayDeliveries.filter((delivery) => delivery.delivery_status === "Delivered").length, color: "#2563eb", displayValue: String(todayDeliveries.filter((delivery) => delivery.delivery_status === "Delivered").length) },
    { name: "Pending", value: todayDeliveries.filter((delivery) => delivery.delivery_status === "Pending").length, color: "#f59e0b", displayValue: String(todayDeliveries.filter((delivery) => delivery.delivery_status === "Pending").length) },
    { name: "Skipped", value: todayDeliveries.filter((delivery) => delivery.delivery_status === "Skipped" || delivery.delivery_status === "Cancelled").length, color: "#ef4444", displayValue: String(todayDeliveries.filter((delivery) => delivery.delivery_status === "Skipped" || delivery.delivery_status === "Cancelled").length) },
  ];
  const paymentChartData: DonutSlice[] = [
    { name: "Paid", value: paidAmount, color: "#10b981", displayValue: money(paidAmount) },
    { name: "Pending", value: pendingAmount, color: "#f59e0b", displayValue: money(pendingAmount) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total customers" value={data.customers.data?.length || 0} icon={Users} />
        <StatCard title="Delivery boys" value={data.deliveryBoys.data?.length || 0} icon={Truck} />
        <StatCard title="Today deliveries" value={todayDeliveries.length} icon={CalendarCheck} />
        <StatCard title="Pending amount" value={money(pendingAmount)} icon={IndianRupee} hint={`Collected ${money(monthlyCollection)} this month`} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Add customer", "customers" as Section, Users],
          ["Generate deliveries", "deliveries" as Section, CalendarCheck],
          ["Record payment", "payments" as Section, CreditCard],
        ].map(([label, target, Icon]: any) => (
          <Card key={label} className="cursor-pointer transition hover:border-primary" onClick={() => onNavigate(target)}>
            <CardContent className="flex items-center gap-3 p-5">
              <Icon className="h-5 w-5 text-primary" />
              <span className="font-medium">{label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <DonutChartCard
          title="Today delivery status"
          description="Delivered, pending, and skipped tasks for today."
          data={deliveryChartData}
          centerValue={String(todayDeliveries.length)}
          centerLabel="total deliveries"
          emptyDescription="Generate today's deliveries to see their status distribution."
        />
        <DonutChartCard
          title="Payment status"
          description="Paid and pending amounts across generated invoices."
          data={paymentChartData}
          centerValue={money(paidAmount + pendingAmount)}
          centerLabel="total invoiced"
          emptyDescription="Generate invoices and record payments to see payment status."
        />
      </div>
    </div>
  );
};

const ProductForm = ({ product, onDone, adminId }: { product?: ProductRow; onDone: () => void; adminId: string }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const name = String(form.get("name") || "").trim();
      const price = numberValue(form.get("price"));
      if (!name) throw new Error("Product name is required.");
      if (price <= 0) throw new Error("Price must be positive.");
      const payload = {
        admin_id: adminId,
        name,
        category: String(form.get("category") || "Cow"),
        unit: product?.unit || "Liter",
        price,
        stock_quantity: Number(product?.stock_quantity || 0),
        description: product?.description || null,
        status: String(form.get("status") || "active"),
      };
      const query = product?.id
        ? supabase.from("products" as any).update(payload).eq("id", product.id)
        : supabase.from("products" as any).insert(payload);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product saved" });
      onDone();
    },
    onError: (error) => toast({ title: "Product was not saved", description: mutationErrorMessage(error), variant: "destructive" }),
  });

  return (
    <form onSubmit={(event) => mutation.mutate(event)} className="grid gap-4 sm:grid-cols-2">
      <Field label="Product name"><Input name="name" defaultValue={product?.name} required /></Field>
      <Field label="Category"><Select name="category" defaultValue={product?.category || "Cow"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Cow">Cow</SelectItem><SelectItem value="Buffalo">Buffalo</SelectItem></SelectContent></Select></Field>
      <Field label="Price"><Input name="price" type="number" min="0.01" step="0.01" defaultValue={product?.price || ""} required /></Field>
      <Field label="Status"><Select name="status" defaultValue={product?.status || "active"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></Field>
      <Button className="sm:col-span-2" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save product</Button>
    </form>
  );
};

const ProductsSection = ({ data, adminId }: { data: ReturnType<typeof useAdminData>; adminId: string }) => {
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | undefined>();
  const [viewingProduct, setViewingProduct] = useState<ProductRow | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<ProductRow | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteMutation = useMutation({
    mutationFn: async (product: ProductRow) => {
      const { error } = await supabase
        .from("products" as any)
        .delete()
        .eq("id", product.id)
        .eq("admin_id", adminId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product deleted" });
      setDeletingProduct(null);
    },
    onError: (error) => toast({
      title: "Product was not deleted",
      description: mutationErrorMessage(error),
      variant: "destructive",
    }),
  });

  const confirmDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!deletingProduct) return;
    try {
      await deleteMutation.mutateAsync(deletingProduct);
    } catch {
      // The mutation toast explains the database error and the dialog stays open.
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div><CardTitle>Products</CardTitle><CardDescription>Product names and categories come from Supabase, not hardcoded lists.</CardDescription></div>
        <Button onClick={() => { setEditingProduct(undefined); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add</Button>
      </CardHeader>
      <CardContent>
        {!data.products.data?.length ? <EmptyState title="No products" description="Add cow or buffalo products to start customer assignments." /> : (
          <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Price</TableHead><TableHead>Stock</TableHead><TableHead>Status</TableHead><TableHead className="w-32 text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
            {data.products.data.map((product) => <TableRow key={product.id}><TableCell className="font-medium">{product.name}</TableCell><TableCell>{product.category}</TableCell><TableCell>{money(product.price)}</TableCell><TableCell>{liters(product.stock_quantity)}</TableCell><TableCell><Badge variant={statusTone(product.status) as any}>{product.status}</Badge></TableCell><TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewingProduct(product)} aria-label={`View ${product.name}`} title="View product"><Eye className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingProduct(product); setOpen(true); }} aria-label={`Edit ${product.name}`} title="Edit product"><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeletingProduct(product)} aria-label={`Delete ${product.name}`} title="Delete product"><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>)}
          </TableBody></Table>
        )}
      </CardContent>
      <Dialog open={Boolean(viewingProduct)} onOpenChange={(isOpen) => { if (!isOpen) setViewingProduct(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Product details</DialogTitle></DialogHeader>
          {viewingProduct && <div className="grid gap-5 sm:grid-cols-2">
            <DetailItem label="Name" value={viewingProduct.name} />
            <DetailItem label="Category" value={viewingProduct.category} />
            <DetailItem label="Price" value={money(viewingProduct.price)} />
            <DetailItem label="Stock" value={liters(viewingProduct.stock_quantity)} />
            <DetailItem label="Unit" value={viewingProduct.unit} />
            <DetailItem label="Status" value={viewingProduct.status} />
            <div className="sm:col-span-2"><DetailItem label="Description" value={viewingProduct.description} /></div>
          </div>}
        </DialogContent>
      </Dialog>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingProduct ? "Edit product" : "Add product"}</DialogTitle></DialogHeader>
          <ProductForm product={editingProduct} adminId={adminId} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
      <AlertDialog open={Boolean(deletingProduct)} onOpenChange={(isOpen) => { if (!isOpen && !deleteMutation.isPending) setDeletingProduct(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingProduct?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the product. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteMutation.isPending} onClick={confirmDelete}>
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

const RoutesSection = ({ data, adminId }: { data: ReturnType<typeof useAdminData>; adminId: string }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const addRoute = useMutation({
    mutationFn: async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formElement = event.currentTarget;
      const form = new FormData(formElement);
      const routeName = String(form.get("route_name") || "").trim();
      if (!routeName) throw new Error("Route name is required.");
      const { error } = await supabase.from("routes" as any).insert({
        admin_id: adminId,
        route_name: routeName,
        area: textValue(form.get("area")),
        status: String(form.get("status") || "active"),
      });
      if (error) throw error;
      return formElement;
    },
    onSuccess: (formElement) => {
      formElement.reset();
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      toast({ title: "Route saved" });
    },
    onError: (error) => toast({ title: "Route was not saved", description: mutationErrorMessage(error), variant: "destructive" }),
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <Card>
        <CardHeader><CardTitle>Add route</CardTitle><CardDescription>Same route fields used by the Android app.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={(event) => addRoute.mutate(event)} className="space-y-4">
            <Field label="Route name"><Input name="route_name" required /></Field>
            <Field label="Area / notes"><Textarea name="area" /></Field>
            <Field label="Status"><Select name="status" defaultValue="active"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></Field>
            <Button className="w-full" disabled={addRoute.isPending}>{addRoute.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save route</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Routes</CardTitle><CardDescription>Routes available for customer and delivery-boy assignment.</CardDescription></CardHeader>
        <CardContent>
          {!data.routes.data?.length ? <EmptyState title="No routes" description="Create a route before assigning customers or delivery boys." /> : (
            <Table><TableHeader><TableRow><TableHead>Route</TableHead><TableHead>Area / notes</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
              {data.routes.data.map((route) => <TableRow key={route.id}><TableCell className="font-medium">{route.route_name}</TableCell><TableCell>{route.area || "-"}</TableCell><TableCell><Badge variant={statusTone(route.status) as any}>{route.status || "active"}</Badge></TableCell></TableRow>)}
            </TableBody></Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const CustomerForm = ({ customer, data, adminId, onDone }: { customer?: CustomerRow; data: ReturnType<typeof useAdminData>; adminId: string; onDone: () => void }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const initialCategory = customer?.product_category || customer?.milk_type || "Cow";
  const [category, setCategory] = useState(initialCategory);
  const [productId, setProductId] = useState(customer?.product_id || "");
  const [deliveryTime, setDeliveryTime] = useState(customer?.delivery_time || "Morning");
  const [status, setStatus] = useState(customer?.status || "active");
  const [pricePerLiter, setPricePerLiter] = useState(customer?.price_per_liter?.toString() || "");
  const activeProducts = useMemo(
    () => (data.products.data || []).filter((product) => (product.status || "active").toLowerCase() === "active"),
    [data.products.data],
  );
  const categoryProducts = useMemo(
    () => activeProducts.filter((product) => (product.category || "").toLowerCase() === category.toLowerCase()),
    [activeProducts, category],
  );

  useEffect(() => {
    if (productId && !categoryProducts.some((product) => product.id === productId)) {
      setProductId("");
    }
  }, [categoryProducts, productId]);

  const mutation = useMutation({
    mutationFn: async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const fullName = String(form.get("full_name") || "").trim();
      const phone = String(form.get("phone") || "").replace(/\D/g, "").slice(-10);
      const dailyQuantity = numberValue(form.get("daily_quantity"));
      const unitPrice = numberValue(form.get("price_per_liter"));
      const advancePayment = numberValue(form.get("advance_payment"));
      const openingBalance = numberValue(form.get("opening_balance"));
      const product = activeProducts.find((item) => item.id === productId);
      if (!fullName) throw new Error("Name is required.");
      if (phone.length !== 10) throw new Error("Mobile number must be 10 digits.");
      if (!product) throw new Error("Product is required.");
      if (dailyQuantity <= 0) throw new Error("Quantity must be positive.");
      if (unitPrice <= 0) throw new Error("Price must be positive.");
      if (advancePayment < 0) throw new Error("Advance payment cannot be negative.");
      const morningQuantity = deliveryTime === "Morning" || deliveryTime === "Both" ? dailyQuantity : 0;
      const eveningQuantity = deliveryTime === "Evening" || deliveryTime === "Both" ? dailyQuantity : 0;
      const payload = {
        admin_id: adminId,
        full_name: fullName,
        phone,
        email: null,
        address: textValue(form.get("address")),
        area: textValue(form.get("area")),
        route_id: textValue(form.get("route_id")),
        product_id: product.id,
        product_name: product.name,
        product_category: category,
        milk_type: category,
        delivery_time: deliveryTime,
        daily_quantity: dailyQuantity,
        morning_quantity: morningQuantity,
        evening_quantity: eveningQuantity,
        price_per_liter: unitPrice,
        opening_balance: openingBalance,
        advance_payment: advancePayment,
        notes: textValue(form.get("notes")),
        status,
      };
      const corePayload = {
        admin_id: payload.admin_id,
        route_id: payload.route_id,
        full_name: payload.full_name,
        phone: payload.phone || "",
        email: payload.email,
        address: payload.address,
        area: payload.area,
        daily_quantity: payload.daily_quantity,
        morning_quantity: payload.morning_quantity,
        evening_quantity: payload.evening_quantity,
        milk_type: payload.milk_type,
        price_per_liter: payload.price_per_liter,
        delivery_time: payload.delivery_time,
        status: payload.status,
        opening_balance: payload.opening_balance,
        notes: payload.notes,
      };
      const save = (body: typeof payload | typeof corePayload) => customer?.id
        ? supabase.from("customers" as any).update(body).eq("id", customer.id).select("id").single()
        : supabase.from("customers" as any).insert(body).select("id").single();
      let saved = await save(payload);
      if (saved.error) saved = await save(corePayload);
      if (saved.error) throw saved.error;

      const savedCustomerId = customer?.id || (saved.data as any)?.id;
      if (!customer && savedCustomerId && advancePayment > 0) {
        const { error: paymentError } = await supabase.from("payments" as any).insert({
          admin_id: adminId,
          customer_id: savedCustomerId,
          invoice_id: null,
          amount: advancePayment,
          payment_date: todayIso(),
          payment_method: "Cash",
          payment_type: "advance",
          notes: "Advance payment recorded while adding customer",
        });
        if (paymentError) {
          console.error("Customer was saved but advance payment was not recorded", paymentError);
          toast({ title: "Customer saved, but advance payment was not recorded", description: mutationErrorMessage(paymentError), variant: "destructive" });
        }
      }
    },
    onSuccess: async () => {
      await callGenerateTodayDeliveries(todayIso(), adminId).catch((error) => {
        toast({ title: "Customer saved, but today delivery was not created", description: mutationErrorMessage(error), variant: "destructive" });
      });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      toast({ title: "Customer saved" });
      onDone();
    },
    onError: (error) => toast({ title: "Customer was not saved", description: mutationErrorMessage(error), variant: "destructive" }),
  });

  return (
    <form onSubmit={(event) => mutation.mutate(event)} className="grid max-h-[75vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
      <Field label="Customer full name"><Input name="full_name" defaultValue={customer?.full_name} required /></Field>
      <Field label="Mobile number"><Input name="phone" inputMode="numeric" maxLength={10} defaultValue={customer?.phone?.slice(-10) || ""} required /></Field>
      <div className="sm:col-span-2"><Field label="Address"><Textarea name="address" defaultValue={customer?.address || ""} /></Field></div>
      <Field label="Route"><Select name="route_id" defaultValue={customer?.route_id || "none"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No route</SelectItem>{data.routes.data?.map((route) => <SelectItem key={route.id} value={route.id}>{route.route_name}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Area / locality"><Input name="area" defaultValue={customer?.area || ""} /></Field>
      <Field label="Category"><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Cow">Cow</SelectItem><SelectItem value="Buffalo">Buffalo</SelectItem></SelectContent></Select></Field>
      <Field label="Product"><Select name="product_id" value={productId} onValueChange={(value) => { setProductId(value); const product = activeProducts.find((item) => item.id === value); if (product?.price && Number(product.price) > 0) setPricePerLiter(String(product.price)); }}><SelectTrigger><SelectValue placeholder={categoryProducts.length ? "Select product" : "No products available for this category"} /></SelectTrigger><SelectContent>{categoryProducts.map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Daily liters"><Input name="daily_quantity" type="number" min="0.01" step="0.01" defaultValue={customer?.daily_quantity || ""} required /></Field>
      <Field label="Price / liter"><Input name="price_per_liter" type="number" min="0.01" step="0.01" value={pricePerLiter} onChange={(event) => setPricePerLiter(event.target.value)} required /></Field>
      <Field label="Advance Payment optional"><Input name="advance_payment" type="number" min="0" step="0.01" defaultValue={customer?.advance_payment || ""} /></Field>
      <Field label="Delivery time"><Select value={deliveryTime} onValueChange={setDeliveryTime}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Morning">Morning</SelectItem><SelectItem value="Evening">Evening</SelectItem><SelectItem value="Both">Both</SelectItem></SelectContent></Select></Field>
      <Field label="Status"><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">active</SelectItem><SelectItem value="inactive">inactive</SelectItem></SelectContent></Select></Field>
      <Field label="Opening pending balance optional"><Input name="opening_balance" type="number" step="0.01" defaultValue={customer?.opening_balance || ""} /></Field>
      <div className="sm:col-span-2"><Field label="Notes optional"><Textarea name="notes" defaultValue={customer?.notes || ""} /></Field></div>
      <Button className="sm:col-span-2" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save customer</Button>
    </form>
  );
};

const CustomersSection = ({ data, adminId }: { data: ReturnType<typeof useAdminData>; adminId: string }) => {
  const [open, setOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRow | undefined>();
  const [viewingCustomer, setViewingCustomer] = useState<CustomerRow | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerRow | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteMutation = useMutation({
    mutationFn: async (customer: CustomerRow) => {
      const { error } = await supabase
        .from("customers" as any)
        .delete()
        .eq("id", customer.id)
        .eq("admin_id", adminId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      toast({ title: "Customer deleted" });
      setDeletingCustomer(null);
    },
    onError: (error) => toast({
      title: "Customer was not deleted",
      description: mutationErrorMessage(error),
      variant: "destructive",
    }),
  });

  const confirmCustomerDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!deletingCustomer) return;
    try {
      await deleteMutation.mutateAsync(deletingCustomer);
    } catch {
      // The mutation toast explains the database error and the dialog stays open.
    }
  };

  const holdMutation = useMutation({
    mutationFn: async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const customerId = String(form.get("customer_id"));
      const fromDate = String(form.get("from_date"));
      const toDate = String(form.get("to_date"));
      const reason = textValue(form.get("reason"));
      const rows = datesBetween(fromDate, toDate).map((holdDate) => ({
        customer_id: customerId,
        hold_date: holdDate,
        reason,
        status: "active",
      }));
      const { error } = await supabase.from("customer_holds" as any).upsert(rows, { onConflict: "customer_id,hold_date" });
      if (!error) return;
      const fallback = await supabase.from("customer_holds" as any).insert({
        admin_id: adminId,
        customer_id: customerId,
        from_date: fromDate,
        to_date: toDate,
        reason,
      });
      if (fallback.error) throw fallback.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-holds"] });
      toast({ title: "Customer hold saved" });
    },
    onError: (error) => toast({ title: "Customer hold was not saved", description: mutationErrorMessage(error), variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div><CardTitle>Customers</CardTitle><CardDescription>Product, route, shift, quantity, balance, and hold management.</CardDescription></div>
          <Button onClick={() => { setEditingCustomer(undefined); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add</Button>
        </CardHeader>
        <CardContent>
          {!data.customers.data?.length ? <EmptyState title="No customers" description="Create customers from Supabase-backed forms." /> : (
            <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Product</TableHead><TableHead>Shift</TableHead><TableHead>Qty</TableHead><TableHead>Advance</TableHead><TableHead>Status</TableHead><TableHead className="w-32 text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
              {data.customers.data.map((customer) => <TableRow key={customer.id}><TableCell className="font-medium">{customer.full_name}<div className="text-xs text-muted-foreground">{customer.phone}</div></TableCell><TableCell>{customer.product_name || customer.product_category || customer.milk_type}</TableCell><TableCell>{customer.delivery_time}</TableCell><TableCell>{liters(customer.daily_quantity)}</TableCell><TableCell>{money(customer.advance_payment)}</TableCell><TableCell><Badge variant={statusTone(customer.status) as any}>{customer.status}</Badge></TableCell><TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewingCustomer(customer)} aria-label={`View ${customer.full_name}`} title="View customer"><Eye className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingCustomer(customer); setOpen(true); }} aria-label={`Edit ${customer.full_name}`} title="Edit customer"><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeletingCustomer(customer)} aria-label={`Delete ${customer.full_name}`} title="Delete customer"><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>)}
            </TableBody></Table>
          )}
        </CardContent>
        <Dialog open={Boolean(viewingCustomer)} onOpenChange={(isOpen) => { if (!isOpen) setViewingCustomer(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Customer details</DialogTitle></DialogHeader>
            {viewingCustomer && <div className="grid gap-5 sm:grid-cols-2">
              <DetailItem label="Full name" value={viewingCustomer.full_name} />
              <DetailItem label="Phone" value={viewingCustomer.phone} />
              <div className="sm:col-span-2"><DetailItem label="Address" value={viewingCustomer.address || viewingCustomer.area} /></div>
              <DetailItem label="Product" value={viewingCustomer.product_name || viewingCustomer.product_category || viewingCustomer.milk_type} />
              <DetailItem label="Delivery time" value={viewingCustomer.delivery_time} />
              <DetailItem label="Daily quantity" value={liters(viewingCustomer.daily_quantity)} />
              <DetailItem label="Price per liter" value={money(viewingCustomer.price_per_liter)} />
              <DetailItem label="Advance payment" value={money(viewingCustomer.advance_payment)} />
              <DetailItem label="Opening balance" value={money(viewingCustomer.opening_balance)} />
              <DetailItem label="Status" value={viewingCustomer.status} />
              <div className="sm:col-span-2"><DetailItem label="Notes" value={viewingCustomer.notes} /></div>
            </div>}
          </DialogContent>
        </Dialog>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>{editingCustomer ? "Edit customer" : "Add customer"}</DialogTitle></DialogHeader>
            <CustomerForm customer={editingCustomer} adminId={adminId} data={data} onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
        <AlertDialog open={Boolean(deletingCustomer)} onOpenChange={(isOpen) => { if (!isOpen && !deleteMutation.isPending) setDeletingCustomer(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {deletingCustomer?.full_name}?</AlertDialogTitle>
              <AlertDialogDescription>This permanently removes the customer. Existing deliveries or billing records may prevent deletion.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteMutation.isPending} onClick={confirmCustomerDelete}>
                {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete customer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
      <Card>
        <CardHeader><CardTitle>Hold customer</CardTitle><CardDescription>Hold days are excluded by the Android invoice generation RPC.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={(event) => holdMutation.mutate(event)} className="grid gap-3 md:grid-cols-5">
            <Select name="customer_id" required><SelectTrigger><SelectValue placeholder="Customer" /></SelectTrigger><SelectContent>{data.customers.data?.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.full_name}</SelectItem>)}</SelectContent></Select>
            <Input name="from_date" type="date" required />
            <Input name="to_date" type="date" required />
            <Input name="reason" placeholder="Reason" />
            <Button disabled={holdMutation.isPending}>Save hold</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

const DeliveryBoysSection = ({ data, adminId }: { data: ReturnType<typeof useAdminData>; adminId: string }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [qr, setQr] = useState<string | null>(null);
  const addMutation = useMutation({
    mutationFn: async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const { error } = await supabase.from("delivery_boys" as any).insert({
        admin_id: adminId,
        full_name: String(form.get("full_name") || ""),
        phone: textValue(form.get("phone")),
        email: textValue(form.get("email")),
        assigned_route_id: textValue(form.get("assigned_route_id")),
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-boys"] });
      toast({ title: "Delivery boy saved" });
    },
    onError: (error) => toast({ title: "Delivery boy was not saved", description: mutationErrorMessage(error), variant: "destructive" }),
  });
  const qrMutation = useMutation({
    mutationFn: async (boyId: string) => {
      const rawToken = generateQrRawToken();
      const { data: result, error } = await supabase.rpc("admin_create_delivery_qr_token" as any, {
        p_delivery_boy_id: boyId,
        p_raw_token: rawToken,
        p_expires_minutes: 1440,
        p_qr_label: "Web generated login QR",
      });
      if (error) throw error;
      return JSON.stringify(
        {
          qr_payload: `DAIRYFLOW_QR:${rawToken}`,
          ...(Array.isArray(result) ? result[0] : result),
        },
        null,
        2,
      );
    },
    onSuccess: setQr,
    onError: (error) => toast({ title: "QR was not generated", description: mutationErrorMessage(error), variant: "destructive" }),
  });
  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <Card><CardHeader><CardTitle>Add delivery boy</CardTitle></CardHeader><CardContent><form onSubmit={(event) => addMutation.mutate(event)} className="space-y-3"><Input name="full_name" placeholder="Full name" required /><Input name="phone" placeholder="Phone" /><Input name="email" type="email" placeholder="Email" /><Select name="assigned_route_id"><SelectTrigger><SelectValue placeholder="Route" /></SelectTrigger><SelectContent>{data.routes.data?.map((route) => <SelectItem key={route.id} value={route.id}>{route.route_name}</SelectItem>)}</SelectContent></Select><Button className="w-full">Save</Button></form></CardContent></Card>
      <Card><CardHeader><CardTitle>Delivery boys</CardTitle><CardDescription>Assign routes, generate QR login, and open performance from the sidebar.</CardDescription></CardHeader><CardContent>{!data.deliveryBoys.data?.length ? <EmptyState title="No delivery boys" description="Add delivery boys and assign a route." /> : <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Route</TableHead><TableHead>Status</TableHead><TableHead>QR</TableHead></TableRow></TableHeader><TableBody>{data.deliveryBoys.data.map((boy) => <TableRow key={boy.id}><TableCell className="font-medium">{boy.full_name}<div className="text-xs text-muted-foreground">{boy.phone}</div></TableCell><TableCell>{data.routes.data?.find((route) => route.id === boy.assigned_route_id)?.route_name || "Unassigned"}</TableCell><TableCell><Badge variant={statusTone(boy.status) as any}>{boy.status}</Badge></TableCell><TableCell><Button size="sm" variant="outline" onClick={() => qrMutation.mutate(boy.id)}>Generate</Button></TableCell></TableRow>)}</TableBody></Table>}{qr && <pre className="mt-4 max-h-44 overflow-auto rounded-md bg-muted p-3 text-xs">{qr}</pre>}</CardContent></Card>
    </div>
  );
};

const DeliveriesSection = ({ data, adminId }: { data: ReturnType<typeof useAdminData>; adminId: string }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = todayIso();
  const [selectedDate, setSelectedDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState("All");
  const [routeFilter, setRouteFilter] = useState("all");
  const [addProductId, setAddProductId] = useState("");
  const [addUnitPrice, setAddUnitPrice] = useState("");
  const todayDeliveriesQuery = useQuery({
    queryKey: ["deliveries", adminId, selectedDate],
    queryFn: async () => {
      await callGenerateTodayDeliveries(selectedDate, adminId);
      const { data, error } = await supabase
        .from("deliveries" as any)
        .select("*, customers(*), products(*), delivery_boys(*)")
        .eq("admin_id", adminId)
        .eq("delivery_date", selectedDate)
        .order("delivery_time");
      if (error) throw error;
      return (data || []) as DeliveryRow[];
    },
  });
  const todayDeliveries = todayDeliveriesQuery.data || [];
  const filteredDeliveries = todayDeliveries.filter((delivery) => {
    const matchesStatus = statusFilter === "All" || delivery.delivery_status === statusFilter;
    const matchesRoute = routeFilter === "all" || delivery.route_id === routeFilter;
    return matchesStatus && matchesRoute;
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["deliveries"] });
  const updateDelivery = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("deliveries" as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error) => toast({ title: "Delivery was not updated", description: mutationErrorMessage(error), variant: "destructive" }),
  });
  const generate = useMutation({
    mutationFn: async () => {
      return callGenerateTodayDeliveries(selectedDate, adminId);
    },
    onSuccess: (created) => {
      invalidate();
      toast({
        title: "Daily schedule refreshed",
        description: created ? `${created} delivery ${created === 1 ? "task" : "tasks"} created.` : "All eligible delivery tasks already exist.",
      });
    },
    onError: (error) => toast({ title: "Deliveries were not generated", description: mutationErrorMessage(error), variant: "destructive" }),
  });
  const addDelivery = useMutation({
    mutationFn: async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const product = data.products.data?.find((item) => item.id === addProductId);
      const quantity = numberValue(form.get("quantity"));
      const unitPrice = numberValue(form.get("unit_price")) || Number(product?.price || 0);
      const customer = data.customers.data?.find((item) => item.id === String(form.get("customer_id")));
      if (!customer) throw new Error("Customer is required.");
      if (!product) throw new Error("Product is required.");
      if (quantity <= 0) throw new Error("Quantity must be positive.");
      if (unitPrice <= 0) throw new Error("Unit price must be positive.");
      const deliveryBoy = data.deliveryBoys.data?.find((boy) => boy.assigned_route_id === customer.route_id && (boy.status || "active") === "active");
      const { error } = await supabase.from("deliveries" as any).insert({
        admin_id: adminId,
        customer_id: customer.id,
        product_id: product.id,
        route_id: customer?.route_id,
        delivery_boy_id: deliveryBoy?.id || null,
        delivery_date: String(form.get("delivery_date") || selectedDate),
        delivery_time: String(form.get("delivery_time") || "Morning"),
        quantity,
        unit_price: unitPrice,
        total_amount: quantity * unitPrice,
        delivery_status: String(form.get("delivery_status") || "Pending"),
        payment_status: String(form.get("payment_status") || "Unpaid"),
        notes: textValue(form.get("notes")),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setAddProductId("");
      setAddUnitPrice("");
      toast({ title: "Delivery saved" });
    },
    onError: (error) => toast({ title: "Delivery was not saved", description: mutationErrorMessage(error), variant: "destructive" }),
  });
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle>Daily delivery schedule</CardTitle><CardDescription>Opening or refreshing a date automatically creates every missing eligible delivery, as Android does.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-4"><Field label="Delivery date"><Input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></Field><Field label="Status"><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["All", "Delivered", "Pending", "Skipped"].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></Field><Field label="Route"><Select value={routeFilter} onValueChange={setRouteFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All routes</SelectItem>{data.routes.data?.map((route) => <SelectItem key={route.id} value={route.id}>{route.route_name}</SelectItem>)}</SelectContent></Select></Field><Button className="self-end" onClick={() => generate.mutate()} disabled={generate.isPending}>{generate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<RefreshCw className="mr-2 h-4 w-4" />Refresh daily schedule</Button></CardContent></Card>
      <Card><CardHeader><CardTitle>Deliveries</CardTitle><CardDescription>Mark delivered or skipped and edit quantity for the selected date.</CardDescription></CardHeader><CardContent>{todayDeliveriesQuery.isLoading ? <EmptyState title="Loading deliveries" description="Creating and loading the daily schedule." /> : todayDeliveriesQuery.isError ? <EmptyState title="Could not load deliveries" description={mutationErrorMessage(todayDeliveriesQuery.error)} /> : todayDeliveries.length === 0 ? <EmptyState title="No deliveries" description="No active customer schedule is eligible for this date." /> : !filteredDeliveries.length ? <EmptyState title="No matching deliveries" description="Change the status or route filter." /> : <Table><TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Product</TableHead><TableHead>Time</TableHead><TableHead>Qty</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{filteredDeliveries.map((delivery) => <TableRow key={delivery.id}><TableCell className="font-medium">{delivery.customers?.full_name || delivery.customer_id}</TableCell><TableCell>{delivery.products?.name || delivery.customers?.product_name || "Milk"}</TableCell><TableCell>{delivery.delivery_time}</TableCell><TableCell><Input className="w-24" type="number" min="0.01" step="0.01" defaultValue={delivery.quantity || 0} onBlur={(event) => { const quantity = Number(event.target.value); if (quantity > 0 && quantity !== Number(delivery.quantity || 0)) updateDelivery.mutate({ id: delivery.id, patch: { quantity, total_amount: quantity * Number(delivery.unit_price || 0) } }); }} /></TableCell><TableCell><Badge variant={statusTone(delivery.delivery_status) as any}>{delivery.delivery_status}</Badge></TableCell><TableCell className="space-x-2"><Button size="sm" onClick={() => updateDelivery.mutate({ id: delivery.id, patch: { delivery_status: "Delivered", total_amount: Number(delivery.quantity || 0) * Number(delivery.unit_price || 0) } })}>Delivered</Button><Button size="sm" variant="outline" onClick={() => updateDelivery.mutate({ id: delivery.id, patch: { delivery_status: "Skipped", total_amount: 0, skip_reason: "Milk not needed" } })}>Milk Not Needed</Button><Button size="sm" variant="destructive" onClick={() => updateDelivery.mutate({ id: delivery.id, patch: { delivery_status: "Skipped", total_amount: 0, skip_reason: "Skipped" } })}>Skip</Button></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Add delivery</CardTitle><CardDescription>Same fields and defaults as the Android Add Delivery screen.</CardDescription></CardHeader><CardContent><form onSubmit={(event) => addDelivery.mutate(event)} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Field label="Select customer"><Select name="customer_id" required><SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger><SelectContent>{data.customers.data?.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.full_name}</SelectItem>)}</SelectContent></Select></Field><Field label="Select product"><Select name="product_id" value={addProductId} onValueChange={(value) => { setAddProductId(value); const product = data.products.data?.find((item) => item.id === value); setAddUnitPrice(product?.price ? String(product.price) : ""); }}><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent>{data.products.data?.filter((product) => (product.status || "active") === "active").map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Delivery date"><Input name="delivery_date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} required /></Field><Field label="Delivery time"><Select name="delivery_time" defaultValue="Morning"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Morning">Morning</SelectItem><SelectItem value="Evening">Evening</SelectItem></SelectContent></Select></Field><Field label="Quantity"><Input name="quantity" type="number" min="0.01" step="0.01" required /></Field><Field label="Unit price"><Input name="unit_price" type="number" min="0.01" step="0.01" value={addUnitPrice} onChange={(event) => setAddUnitPrice(event.target.value)} required /></Field><Field label="Delivery status"><Select name="delivery_status" defaultValue="Pending"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Delivered">Delivered</SelectItem><SelectItem value="Skipped">Skipped</SelectItem></SelectContent></Select></Field><Field label="Payment status"><Select name="payment_status" defaultValue="Unpaid"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Paid">Paid</SelectItem><SelectItem value="Unpaid">Unpaid</SelectItem></SelectContent></Select></Field><div className="md:col-span-2 xl:col-span-3"><Field label="Notes optional"><Textarea name="notes" /></Field></div><Button className="md:col-span-2 xl:col-span-3" disabled={addDelivery.isPending}>{addDelivery.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Delivery</Button></form></CardContent></Card>
    </div>
  );
};

const BillingSection = ({ data, adminId }: { data: ReturnType<typeof useAdminData>; adminId: string }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [billingMonth, setBillingMonth] = useState(monthKey());
  const [customerId, setCustomerId] = useState("all");
  const generate = useMutation({
    mutationFn: async () => {
      const primary = await supabase.rpc("generate_monthly_invoices" as any, {
        p_billing_month: billingMonth,
        p_customer_id: customerId === "all" ? null : customerId,
        p_route_id: null,
      });
      if (!primary.error) return primary.data;
      const canUseLegacySignature = primary.error.code === "PGRST202" || primary.error.code === "42883" || primary.error.message?.toLowerCase().includes("schema cache");
      if (!canUseLegacySignature) throw primary.error;
      const [year, month] = billingMonth.split("-").map(Number);
      const fallback = await supabase.rpc("generate_monthly_invoices" as any, { p_admin_id: adminId, p_year: year, p_month: month });
      if (fallback.error) throw fallback.error;
      return fallback.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Invoices generated" });
    },
    onError: (error) => toast({ title: "Invoices were not generated", description: mutationErrorMessage(error), variant: "destructive" }),
  });
  return <div className="space-y-4"><Card><CardHeader><CardTitle>Generate invoice</CardTitle><CardDescription>Choose the Android billing month and optional customer.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-3"><Field label="Select customer"><Select value={customerId} onValueChange={setCustomerId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All customers</SelectItem>{data.customers.data?.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.full_name}</SelectItem>)}</SelectContent></Select></Field><Field label="Billing month"><Input type="month" value={billingMonth} onChange={(event) => setBillingMonth(event.target.value)} /></Field><Button className="self-end" onClick={() => generate.mutate()} disabled={generate.isPending || !billingMonth}>{generate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Generate monthly invoices</Button></CardContent></Card><Card><CardHeader><CardTitle>Billing and invoices</CardTitle><CardDescription>Skipped, held, and milk-not-needed days are excluded exactly as in Android.</CardDescription></CardHeader><CardContent>{!data.invoices.data?.length ? <EmptyState title="No invoices" description="Generate invoices after deliveries are recorded." /> : <Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Month</TableHead><TableHead>Total</TableHead><TableHead>Paid</TableHead><TableHead>Balance</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{data.invoices.data.map((invoice) => <TableRow key={invoice.id}><TableCell className="font-medium">{invoice.invoice_number}</TableCell><TableCell>{invoice.customers?.full_name || invoice.customer_id}</TableCell><TableCell>{invoice.billing_month}</TableCell><TableCell>{money(invoice.total_amount)}</TableCell><TableCell>{money(invoice.paid_amount)}</TableCell><TableCell>{money(invoice.balance_amount)}</TableCell><TableCell><Badge variant={statusTone(invoice.status) as any}>{invoice.status}</Badge></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card></div>;
};

const PaymentsSection = ({ data, adminId }: { data: ReturnType<typeof useAdminData>; adminId: string }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const payableInvoices = (data.invoices.data || []).filter((invoice) => Number(invoice.balance_amount || 0) > 0);
  const add = useMutation({
    mutationFn: async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const invoice = data.invoices.data?.find((item) => item.id === invoiceId);
      const paymentAmount = numberValue(form.get("amount"));
      const method = String(form.get("payment_method") || "Cash");
      const transactionId = textValue(form.get("transaction_id"));
      if (!invoice) throw new Error("Invoice is required.");
      if (paymentAmount <= 0) throw new Error("Payment amount must be positive.");
      const { error } = await supabase.from("payments" as any).insert({
        admin_id: adminId,
        customer_id: invoice.customer_id,
        invoice_id: invoice.id,
        amount: paymentAmount,
        payment_date: todayIso(),
        payment_mode: method,
        payment_method: method,
        payment_type: "regular",
        transaction_id: transactionId,
        received_at: new Date().toISOString(),
        notes: transactionId ? `Transaction ID: ${transactionId}` : method === "Cash" ? "Manual cash entry" : "UPI received",
      });
      if (error) throw error;
      const total = Number(invoice.total_amount || 0);
      const paid = Math.min(total, Number(invoice.paid_amount || 0) + paymentAmount);
      const balance = Math.max(0, total - paid);
      const invoiceStatus = balance === 0 ? "Paid" : paid === 0 ? "Unpaid" : "Partial";
      const invoiceUpdate = await supabase.from("invoices" as any).update({ paid_amount: paid, balance_amount: balance, status: invoiceStatus }).eq("id", invoice.id).eq("admin_id", adminId);
      if (invoiceUpdate.error) throw invoiceUpdate.error;
      if (invoiceStatus === "Paid") {
        const deliveryUpdate = await supabase.from("deliveries" as any).update({ payment_status: "Paid" }).eq("invoice_id", invoice.id).eq("admin_id", adminId);
        if (deliveryUpdate.error && deliveryUpdate.error.code !== "42703") throw deliveryUpdate.error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      setInvoiceId("");
      setAmount("");
      toast({ title: "Payment recorded" });
    },
    onError: (error) => toast({ title: "Payment was not recorded", description: mutationErrorMessage(error), variant: "destructive" }),
  });
  return <div className="grid gap-4 xl:grid-cols-[400px_1fr]"><Card><CardHeader><CardTitle>Collect payment</CardTitle><CardDescription>Invoice, amount, transaction ID, and Cash/UPI behavior match Android.</CardDescription></CardHeader><CardContent><form onSubmit={(event) => add.mutate(event)} className="space-y-4"><Field label="Invoice"><Select value={invoiceId} onValueChange={(value) => { setInvoiceId(value); const invoice = payableInvoices.find((item) => item.id === value); setAmount(invoice?.balance_amount ? String(invoice.balance_amount) : ""); }}><SelectTrigger><SelectValue placeholder="Select unpaid invoice" /></SelectTrigger><SelectContent>{payableInvoices.map((invoice) => <SelectItem key={invoice.id} value={invoice.id}>{invoice.invoice_number} - {money(invoice.balance_amount)}</SelectItem>)}</SelectContent></Select></Field><Field label="Amount"><Input name="amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></Field><Field label="Transaction ID optional"><Input name="transaction_id" /></Field><Field label="Payment method"><Select name="payment_method" defaultValue="Cash"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="UPI">UPI</SelectItem></SelectContent></Select></Field><Button className="w-full" disabled={add.isPending || !invoiceId}>{add.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Record payment</Button></form></CardContent></Card><Card><CardHeader><CardTitle>Payment history</CardTitle></CardHeader><CardContent>{!data.payments.data?.length ? <EmptyState title="No payments" description="Record a payment against an invoice." /> : <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Invoice</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead></TableRow></TableHeader><TableBody>{data.payments.data.map((payment) => <TableRow key={payment.id}><TableCell>{payment.payment_date}</TableCell><TableCell>{payment.customers?.full_name || payment.customer_id}</TableCell><TableCell>{payment.invoices?.invoice_number || payment.invoice_id || "Advance Payment"}</TableCell><TableCell>{money(payment.amount)}</TableCell><TableCell>{payment.payment_method}</TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card></div>;
};

const ReportsSection = ({ data }: { data: ReturnType<typeof useAdminData> }) => {
  const deliveries = data.deliveries.data || [];
  const delivered = deliveries.filter((delivery) => delivery.delivery_status === "Delivered");
  const cow = delivered.filter((delivery) => (delivery.products?.category || delivery.customers?.product_category || delivery.customers?.milk_type) === "Cow").reduce((sum, delivery) => sum + Number(delivery.quantity || 0), 0);
  const buffalo = delivered.filter((delivery) => (delivery.products?.category || delivery.customers?.product_category || delivery.customers?.milk_type) === "Buffalo").reduce((sum, delivery) => sum + Number(delivery.quantity || 0), 0);
  const pending = (data.invoices.data || []).reduce((sum, invoice) => sum + Number(invoice.balance_amount || 0), 0);
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><StatCard title="Cow milk delivered" value={liters(cow)} icon={Milk} /><StatCard title="Buffalo milk delivered" value={liters(buffalo)} icon={Milk} /><StatCard title="Pending payments" value={money(pending)} icon={IndianRupee} /><StatCard title="Delivered records" value={delivered.length} icon={BarChart3} /></div>;
};

const PerformanceSection = ({ data, adminId }: { data: ReturnType<typeof useAdminData>; adminId: string }) => {
  const queryClient = useQueryClient();
  const [selectedBoy, setSelectedBoy] = useState<string>(data.deliveryBoys.data?.[0]?.id || "");
  const addStock = useMutation({
    mutationFn: async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const { error } = await supabase.from("delivery_boy_daily_stock" as any).upsert({ delivery_boy_id: String(form.get("delivery_boy_id")), stock_date: String(form.get("stock_date")), cow_milk_taken_liters: numberValue(form.get("cow")), buffalo_milk_taken_liters: numberValue(form.get("buffalo")), notes: textValue(form.get("notes")) }, { onConflict: "delivery_boy_id,stock_date" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stock"] }),
  });
  const stock = useQuery({
    queryKey: ["stock", selectedBoy],
    enabled: Boolean(selectedBoy),
    queryFn: async () => {
      const { data: rows, error } = await supabase.from("delivery_boy_daily_stock" as any).select("*").eq("delivery_boy_id", selectedBoy).order("stock_date", { ascending: false }).limit(31);
      if (error) throw error;
      return rows || [];
    },
  });
  const boyDeliveries = (data.deliveries.data || []).filter((delivery) => delivery.delivery_boy_id === selectedBoy);
  const deliveredLiters = boyDeliveries.filter((delivery) => delivery.delivery_status === "Delivered").reduce((sum, delivery) => sum + Number(delivery.quantity || 0), 0);
  return <div className="space-y-4"><Card><CardHeader><CardTitle>Delivery boy performance</CardTitle><CardDescription>Monthly completion, taken milk quantity, delivered milk, and remaining milk.</CardDescription></CardHeader><CardContent className="space-y-4"><Select value={selectedBoy} onValueChange={setSelectedBoy}><SelectTrigger className="max-w-sm"><SelectValue placeholder="Select delivery boy" /></SelectTrigger><SelectContent>{data.deliveryBoys.data?.map((boy) => <SelectItem key={boy.id} value={boy.id}>{boy.full_name}</SelectItem>)}</SelectContent></Select><div className="grid gap-4 md:grid-cols-3"><StatCard title="Total delivered liters" value={liters(deliveredLiters)} icon={Milk} /><StatCard title="Delivered days" value={new Set(boyDeliveries.filter((item) => item.delivery_status === "Delivered").map((item) => item.delivery_date)).size} icon={CalendarCheck} /><StatCard title="Pending records" value={boyDeliveries.filter((item) => item.delivery_status === "Pending").length} icon={BarChart3} /></div></CardContent></Card><Card><CardHeader><CardTitle>Taken Milk Quantity</CardTitle></CardHeader><CardContent><form onSubmit={(event) => addStock.mutate(event)} className="grid gap-3 md:grid-cols-6"><Select name="delivery_boy_id" defaultValue={selectedBoy}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{data.deliveryBoys.data?.map((boy) => <SelectItem key={boy.id} value={boy.id}>{boy.full_name}</SelectItem>)}</SelectContent></Select><Input name="stock_date" type="date" defaultValue={todayIso()} /><Input name="cow" type="number" step="0.01" placeholder="Cow taken" /><Input name="buffalo" type="number" step="0.01" placeholder="Buffalo taken" /><Input name="notes" placeholder="Notes" /><Button>Save</Button></form>{stock.data?.length ? <Table className="mt-4"><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Cow taken</TableHead><TableHead>Buffalo taken</TableHead><TableHead>Total delivered</TableHead></TableRow></TableHeader><TableBody>{stock.data.map((row: any) => <TableRow key={row.id}><TableCell>{row.stock_date}</TableCell><TableCell>{liters(row.cow_milk_taken_liters)}</TableCell><TableCell>{liters(row.buffalo_milk_taken_liters)}</TableCell><TableCell>{liters(boyDeliveries.filter((delivery) => delivery.delivery_date === row.stock_date && delivery.delivery_status === "Delivered").reduce((sum, delivery) => sum + Number(delivery.quantity || 0), 0))}</TableCell></TableRow>)}</TableBody></Table> : null}</CardContent></Card></div>;
};

const DeliveryBoyPortal = () => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  useDairyFlowRealtime(user?.admin_id || null);
  const { data: deliveries = [] } = useQuery({
    queryKey: ["delivery-boy-today", user?.delivery_boy_id],
    enabled: Boolean(user?.delivery_boy_id),
    queryFn: async () => {
      const { data, error } = await supabase.from("deliveries" as any).select("*, customers(*), products(*)").eq("delivery_boy_id", user?.delivery_boy_id).eq("delivery_date", todayIso()).order("delivery_time");
      if (error) throw error;
      return (data || []) as DeliveryRow[];
    },
  });
  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("deliveries" as any).update({ delivery_boy_status: status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["delivery-boy-today"] }),
  });
  const complete = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("delivery_boy_complete_today_deliveries" as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["delivery-boy-today"] }),
  });
  return (
    <main className="min-h-screen bg-muted/30 p-4">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Today route</h1>
            <p className="text-muted-foreground">{user?.full_name}</p>
          </div>
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </header>

        {deliveries.map((delivery) => (
          <Card key={delivery.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{delivery.customers?.full_name}</p>
                <p className="text-sm text-muted-foreground">{delivery.customers?.address}</p>
                <p className="text-sm">
                  {liters(delivery.quantity)} - {delivery.products?.name || delivery.customers?.product_name || "Milk"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => update.mutate({ id: delivery.id, status: "Delivered" })}>Delivered</Button>
                <Button variant="outline" onClick={() => update.mutate({ id: delivery.id, status: "Skipped" })}>
                  Skipped
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {deliveries.length === 0 && (
          <EmptyState title="No route assigned today" description="Ask admin to generate today's deliveries." />
        )}

        <Button className="w-full" size="lg" onClick={() => complete.mutate()} disabled={complete.isPending}>
          Complete Today Delivery
        </Button>
      </div>
    </main>
  );
};

const AdminPortal = () => {
  const { adminId } = useAuth();
  const [section, setSection] = useState<Section>("dashboard");
  const data = useAdminData(adminId);
  useDairyFlowRealtime(adminId);
  const loading = Object.values(data).some((query: any) => query.isLoading);
  const scheduleRevision = useMemo(() => {
    const customerSchedules = (data.customers.data || []).map((customer) => [customer.id, customer.status, customer.product_id, customer.route_id, customer.delivery_time, customer.daily_quantity, customer.morning_quantity, customer.evening_quantity, customer.price_per_liter].join(":"));
    const todayDeliveryKeys = (data.deliveries.data || []).filter((delivery) => delivery.delivery_date === todayIso()).map((delivery) => `${delivery.customer_id}:${delivery.delivery_time}`).sort();
    return `${customerSchedules.sort().join("|")}#${todayDeliveryKeys.join("|")}`;
  }, [data.customers.data, data.deliveries.data]);
  useEnsureTodayDeliveries(adminId, Boolean(adminId && !loading), scheduleRevision);
  if (!adminId) return <AuthScreen />;
  return (
    <Shell section={section} setSection={setSection}>
      {loading ? <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
        <>
          {section === "dashboard" && <DashboardSection data={data} onNavigate={setSection} />}
          {section === "products" && <ProductsSection data={data} adminId={adminId} />}
          {section === "routes" && <RoutesSection data={data} adminId={adminId} />}
          {section === "customers" && <CustomersSection data={data} adminId={adminId} />}
          {section === "delivery-boys" && <DeliveryBoysSection data={data} adminId={adminId} />}
          {section === "performance" && <PerformanceSection data={data} adminId={adminId} />}
          {section === "deliveries" && <DeliveriesSection data={data} adminId={adminId} />}
          {section === "billing" && <BillingSection data={data} adminId={adminId} />}
          {section === "payments" && <PaymentsSection data={data} adminId={adminId} />}
          {section === "reports" && <ReportsSection data={data} />}
        </>
      )}
    </Shell>
  );
};

const DairyFlowApp = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <AuthScreen />;
  if (user.role === "delivery_boy") return <DeliveryBoyPortal />;
  return <AdminPortal />;
};

export default DairyFlowApp;
