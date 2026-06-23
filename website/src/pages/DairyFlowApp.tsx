import React, { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarCheck,
  CreditCard,
  IndianRupee,
  LayoutDashboard,
  Loader2,
  LogOut,
  Milk,
  Package,
  Plus,
  RefreshCw,
  Truck,
  Users,
} from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
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
      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t bg-background md:hidden">
        {sections.slice(0, 5).map((item) => (
          <button key={item.id} onClick={() => setSection(item.id)} className={`flex flex-col items-center gap-1 px-1 py-2 text-[11px] ${section === item.id ? "text-primary" : "text-muted-foreground"}`}>
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

const DashboardSection = ({ data, onNavigate }: { data: ReturnType<typeof useAdminData>; onNavigate: (section: Section) => void }) => {
  const today = todayIso();
  const todayDeliveries = (data.deliveries.data || []).filter((delivery) => delivery.delivery_date === today);
  const pendingAmount = (data.invoices.data || []).reduce((sum, invoice) => sum + Number(invoice.balance_amount || 0), 0);
  const monthlyCollection = (data.payments.data || [])
    .filter((payment) => payment.payment_date?.startsWith(monthKey()))
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

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
      <Card>
        <CardHeader>
          <CardTitle>Today delivery status</CardTitle>
          <CardDescription>Live records from the Android app deliveries table.</CardDescription>
        </CardHeader>
        <CardContent>
          {todayDeliveries.length === 0 ? (
            <EmptyState title="No deliveries for today" description="Use Generate Today Deliveries from the Deliveries page." />
          ) : (
            <div className="space-y-3">
              {["Delivered", "Pending", "Skipped"].map((status) => {
                const count = todayDeliveries.filter((delivery) => delivery.delivery_status === status).length;
                return (
                  <div key={status}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{status}</span>
                      <span>{count}</span>
                    </div>
                    <Progress value={todayDeliveries.length ? (count / todayDeliveries.length) * 100 : 0} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
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
      const payload = {
        admin_id: adminId,
        name: String(form.get("name") || ""),
        category: String(form.get("category") || "Cow"),
        unit: String(form.get("unit") || "Liter"),
        price: numberValue(form.get("price")),
        stock_quantity: numberValue(form.get("stock_quantity")),
        description: textValue(form.get("description")),
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
  });

  return (
    <form onSubmit={(event) => mutation.mutate(event)} className="grid gap-4 sm:grid-cols-2">
      <Field label="Product name"><Input name="name" defaultValue={product?.name} required /></Field>
      <Field label="Category"><Select name="category" defaultValue={product?.category || "Cow"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Cow">Cow</SelectItem><SelectItem value="Buffalo">Buffalo</SelectItem></SelectContent></Select></Field>
      <Field label="Unit"><Input name="unit" defaultValue={product?.unit || "Liter"} /></Field>
      <Field label="Price"><Input name="price" type="number" step="0.01" defaultValue={product?.price || 0} /></Field>
      <Field label="Stock quantity"><Input name="stock_quantity" type="number" step="0.01" defaultValue={product?.stock_quantity || 0} /></Field>
      <Field label="Status"><Select name="status" defaultValue={product?.status || "active"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></Field>
      <div className="sm:col-span-2"><Field label="Description"><Textarea name="description" defaultValue={product?.description || ""} /></Field></div>
      <Button className="sm:col-span-2" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save product</Button>
    </form>
  );
};

const ProductsSection = ({ data, adminId }: { data: ReturnType<typeof useAdminData>; adminId: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div><CardTitle>Products</CardTitle><CardDescription>Product names and categories come from Supabase, not hardcoded lists.</CardDescription></div>
        <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Add product</DialogTitle></DialogHeader><ProductForm adminId={adminId} onDone={() => setOpen(false)} /></DialogContent></Dialog>
      </CardHeader>
      <CardContent>
        {!data.products.data?.length ? <EmptyState title="No products" description="Add cow or buffalo products to start customer assignments." /> : (
          <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Price</TableHead><TableHead>Stock</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
            {data.products.data.map((product) => <TableRow key={product.id}><TableCell className="font-medium">{product.name}</TableCell><TableCell>{product.category}</TableCell><TableCell>{money(product.price)}</TableCell><TableCell>{liters(product.stock_quantity)}</TableCell><TableCell><Badge variant={statusTone(product.status) as any}>{product.status}</Badge></TableCell></TableRow>)}
          </TableBody></Table>
        )}
      </CardContent>
    </Card>
  );
};

const CustomerForm = ({ customer, data, adminId, onDone }: { customer?: CustomerRow; data: ReturnType<typeof useAdminData>; adminId: string; onDone: () => void }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const product = data.products.data?.find((item) => item.id === String(form.get("product_id")));
      const payload = {
        admin_id: adminId,
        full_name: String(form.get("full_name") || ""),
        phone: textValue(form.get("phone")),
        address: textValue(form.get("address")),
        area: textValue(form.get("area")),
        route_id: textValue(form.get("route_id")),
        product_id: textValue(form.get("product_id")),
        product_name: product?.name || textValue(form.get("product_name")),
        product_category: product?.category || String(form.get("product_category") || "Cow"),
        milk_type: product?.category || String(form.get("product_category") || "Cow"),
        delivery_time: String(form.get("delivery_time") || "Morning"),
        daily_quantity: numberValue(form.get("daily_quantity")),
        morning_quantity: numberValue(form.get("morning_quantity")),
        evening_quantity: numberValue(form.get("evening_quantity")),
        price_per_liter: numberValue(form.get("price_per_liter")) || Number(product?.price || 0),
        opening_balance: numberValue(form.get("opening_balance")),
        advance_payment: numberValue(form.get("advance_payment")),
        status: String(form.get("status") || "active"),
      };
      const query = customer?.id ? supabase.from("customers" as any).update(payload).eq("id", customer.id) : supabase.from("customers" as any).insert(payload);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Customer saved" });
      onDone();
    },
  });

  return (
    <form onSubmit={(event) => mutation.mutate(event)} className="grid max-h-[75vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
      <Field label="Full name"><Input name="full_name" defaultValue={customer?.full_name} required /></Field>
      <Field label="Phone"><Input name="phone" defaultValue={customer?.phone || ""} /></Field>
      <Field label="Route"><Select name="route_id" defaultValue={customer?.route_id || "none"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No route</SelectItem>{data.routes.data?.map((route) => <SelectItem key={route.id} value={route.id}>{route.route_name}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Product"><Select name="product_id" defaultValue={customer?.product_id || "none"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No product</SelectItem>{data.products.data?.map((product) => <SelectItem key={product.id} value={product.id}>{product.name} ({product.category})</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Category"><Select name="product_category" defaultValue={customer?.product_category || customer?.milk_type || "Cow"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Cow">Cow</SelectItem><SelectItem value="Buffalo">Buffalo</SelectItem></SelectContent></Select></Field>
      <Field label="Shift"><Select name="delivery_time" defaultValue={customer?.delivery_time || "Morning"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Morning">Morning</SelectItem><SelectItem value="Evening">Evening</SelectItem><SelectItem value="Both">Both</SelectItem></SelectContent></Select></Field>
      <Field label="Daily quantity"><Input name="daily_quantity" type="number" step="0.01" defaultValue={customer?.daily_quantity || 0} /></Field>
      <Field label="Morning quantity"><Input name="morning_quantity" type="number" step="0.01" defaultValue={customer?.morning_quantity || 0} /></Field>
      <Field label="Evening quantity"><Input name="evening_quantity" type="number" step="0.01" defaultValue={customer?.evening_quantity || 0} /></Field>
      <Field label="Price per liter"><Input name="price_per_liter" type="number" step="0.01" defaultValue={customer?.price_per_liter || 0} /></Field>
      <Field label="Opening balance"><Input name="opening_balance" type="number" step="0.01" defaultValue={customer?.opening_balance || 0} /></Field>
      <Field label="Advance payment"><Input name="advance_payment" type="number" step="0.01" defaultValue={customer?.advance_payment || 0} /></Field>
      <Field label="Area"><Input name="area" defaultValue={customer?.area || ""} /></Field>
      <Field label="Status"><Select name="status" defaultValue={customer?.status || "active"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="paused">Paused</SelectItem></SelectContent></Select></Field>
      <div className="sm:col-span-2"><Field label="Address"><Textarea name="address" defaultValue={customer?.address || ""} /></Field></div>
      <Button className="sm:col-span-2" disabled={mutation.isPending}>Save customer</Button>
    </form>
  );
};

const CustomersSection = ({ data, adminId }: { data: ReturnType<typeof useAdminData>; adminId: string }) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const holdMutation = useMutation({
    mutationFn: async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const { error } = await supabase.from("customer_holds" as any).insert({
        admin_id: adminId,
        customer_id: String(form.get("customer_id")),
        from_date: String(form.get("from_date")),
        to_date: String(form.get("to_date")),
        reason: textValue(form.get("reason")),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-holds"] });
      toast({ title: "Customer hold saved" });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div><CardTitle>Customers</CardTitle><CardDescription>Product, route, shift, quantity, balance, and hold management.</CardDescription></div>
          <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add</Button></DialogTrigger><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Add customer</DialogTitle></DialogHeader><CustomerForm adminId={adminId} data={data} onDone={() => setOpen(false)} /></DialogContent></Dialog>
        </CardHeader>
        <CardContent>
          {!data.customers.data?.length ? <EmptyState title="No customers" description="Create customers from Supabase-backed forms." /> : (
            <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Product</TableHead><TableHead>Shift</TableHead><TableHead>Qty</TableHead><TableHead>Advance</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
              {data.customers.data.map((customer) => <TableRow key={customer.id}><TableCell className="font-medium">{customer.full_name}<div className="text-xs text-muted-foreground">{customer.phone}</div></TableCell><TableCell>{customer.product_name || customer.product_category || customer.milk_type}</TableCell><TableCell>{customer.delivery_time}</TableCell><TableCell>{liters(customer.daily_quantity)}</TableCell><TableCell>{money(customer.advance_payment)}</TableCell><TableCell><Badge variant={statusTone(customer.status) as any}>{customer.status}</Badge></TableCell></TableRow>)}
            </TableBody></Table>
          )}
        </CardContent>
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
  const todayDeliveries = (data.deliveries.data || []).filter((delivery) => delivery.delivery_date === today);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["deliveries"] });
  const updateDelivery = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("deliveries" as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const generate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("generate_today_deliveries" as any, { p_delivery_date: today, p_admin_id: adminId });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Today deliveries generated" });
    },
  });
  const extra = useMutation({
    mutationFn: async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const product = data.products.data?.find((item) => item.id === String(form.get("product_id")));
      const quantity = numberValue(form.get("quantity"));
      const unitPrice = numberValue(form.get("unit_price")) || Number(product?.price || 0);
      const customer = data.customers.data?.find((item) => item.id === String(form.get("customer_id")));
      const { error } = await supabase.from("deliveries" as any).insert({
        admin_id: adminId,
        customer_id: customer?.id,
        product_id: product?.id,
        route_id: customer?.route_id,
        delivery_date: today,
        delivery_time: String(form.get("delivery_time") || "Morning"),
        quantity,
        unit_price: unitPrice,
        total_amount: quantity * unitPrice,
        delivery_status: "Delivered",
        payment_status: "Unpaid",
        notes: "Extra product delivery",
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2"><Button onClick={() => generate.mutate()} disabled={generate.isPending}><RefreshCw className="mr-2 h-4 w-4" />Generate Today Deliveries</Button></div>
      <Card><CardHeader><CardTitle>Today deliveries</CardTitle><CardDescription>Mark delivered, skipped, milk not needed, and edit quantity date-wise.</CardDescription></CardHeader><CardContent>{todayDeliveries.length === 0 ? <EmptyState title="No deliveries" description="Generate today deliveries or add an extra delivery." /> : <Table><TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Product</TableHead><TableHead>Qty</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{todayDeliveries.map((delivery) => <TableRow key={delivery.id}><TableCell className="font-medium">{delivery.customers?.full_name || delivery.customer_id}</TableCell><TableCell>{delivery.products?.name || delivery.customers?.product_name || "Milk"}</TableCell><TableCell><Input className="w-24" type="number" step="0.01" defaultValue={delivery.quantity || 0} onBlur={(event) => updateDelivery.mutate({ id: delivery.id, patch: { quantity: Number(event.target.value), total_amount: Number(event.target.value) * Number(delivery.unit_price || 0) } })} /></TableCell><TableCell><Badge variant={statusTone(delivery.delivery_status) as any}>{delivery.delivery_status}</Badge></TableCell><TableCell className="space-x-2"><Button size="sm" onClick={() => updateDelivery.mutate({ id: delivery.id, patch: { delivery_status: "Delivered", total_amount: Number(delivery.quantity || 0) * Number(delivery.unit_price || 0) } })}>Delivered</Button><Button size="sm" variant="outline" onClick={() => updateDelivery.mutate({ id: delivery.id, patch: { delivery_status: "Skipped", total_amount: 0, skip_reason: "Milk not needed" } })}>Milk Not Needed</Button><Button size="sm" variant="destructive" onClick={() => updateDelivery.mutate({ id: delivery.id, patch: { delivery_status: "Skipped", total_amount: 0, skip_reason: "Skipped" } })}>Skip</Button></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Extra product delivery</CardTitle></CardHeader><CardContent><form onSubmit={(event) => extra.mutate(event)} className="grid gap-3 md:grid-cols-5"><Select name="customer_id" required><SelectTrigger><SelectValue placeholder="Customer" /></SelectTrigger><SelectContent>{data.customers.data?.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.full_name}</SelectItem>)}</SelectContent></Select><Select name="product_id" required><SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger><SelectContent>{data.products.data?.map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent></Select><Input name="quantity" type="number" step="0.01" placeholder="Quantity" /><Input name="unit_price" type="number" step="0.01" placeholder="Unit price" /><Button>Add extra</Button></form></CardContent></Card>
    </div>
  );
};

const BillingSection = ({ data, adminId }: { data: ReturnType<typeof useAdminData>; adminId: string }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const generate = useMutation({
    mutationFn: async () => {
      const [year, month] = monthKey().split("-").map(Number);
      const { error } = await supabase.rpc("generate_monthly_invoices" as any, { p_admin_id: adminId, p_year: year, p_month: month });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Invoices generated" });
    },
  });
  return <Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Billing and invoices</CardTitle><CardDescription>Skipped, hold, and milk-not-needed days are excluded by the Android invoice RPC.</CardDescription></div><Button onClick={() => generate.mutate()} disabled={generate.isPending}>Generate monthly invoices</Button></CardHeader><CardContent>{!data.invoices.data?.length ? <EmptyState title="No invoices" description="Generate monthly invoices after deliveries are recorded." /> : <Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Month</TableHead><TableHead>Total</TableHead><TableHead>Paid</TableHead><TableHead>Balance</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{data.invoices.data.map((invoice) => <TableRow key={invoice.id}><TableCell className="font-medium">{invoice.invoice_number}</TableCell><TableCell>{invoice.customers?.full_name || invoice.customer_id}</TableCell><TableCell>{invoice.billing_month}</TableCell><TableCell>{money(invoice.total_amount)}</TableCell><TableCell>{money(invoice.paid_amount)}</TableCell><TableCell>{money(invoice.balance_amount)}</TableCell><TableCell><Badge variant={statusTone(invoice.status) as any}>{invoice.status}</Badge></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>;
};

const PaymentsSection = ({ data, adminId }: { data: ReturnType<typeof useAdminData>; adminId: string }) => {
  const queryClient = useQueryClient();
  const add = useMutation({
    mutationFn: async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const invoiceId = textValue(form.get("invoice_id"));
      const invoice = data.invoices.data?.find((item) => item.id === invoiceId);
      const { error } = await supabase.from("payments" as any).insert({ admin_id: adminId, customer_id: String(form.get("customer_id") || invoice?.customer_id), invoice_id: invoiceId, amount: numberValue(form.get("amount")), payment_date: String(form.get("payment_date") || todayIso()), payment_method: String(form.get("payment_method") || "Cash"), payment_type: "regular", notes: textValue(form.get("notes")) });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
  return <div className="grid gap-4 xl:grid-cols-[380px_1fr]"><Card><CardHeader><CardTitle>Make payment</CardTitle></CardHeader><CardContent><form onSubmit={(event) => add.mutate(event)} className="space-y-3"><Select name="customer_id" required><SelectTrigger><SelectValue placeholder="Customer" /></SelectTrigger><SelectContent>{data.customers.data?.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.full_name}</SelectItem>)}</SelectContent></Select><Select name="invoice_id"><SelectTrigger><SelectValue placeholder="Invoice optional" /></SelectTrigger><SelectContent>{data.invoices.data?.map((invoice) => <SelectItem key={invoice.id} value={invoice.id}>{invoice.invoice_number} - {money(invoice.balance_amount)}</SelectItem>)}</SelectContent></Select><Input name="amount" type="number" step="0.01" placeholder="Amount" required /><Input name="payment_date" type="date" defaultValue={todayIso()} /><Select name="payment_method" defaultValue="Cash"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="UPI">UPI</SelectItem><SelectItem value="Bank Transfer">Bank Transfer</SelectItem><SelectItem value="Card">Card</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select><Textarea name="notes" placeholder="Notes" /><Button className="w-full">Save payment</Button></form></CardContent></Card><Card><CardHeader><CardTitle>Payment history</CardTitle></CardHeader><CardContent>{!data.payments.data?.length ? <EmptyState title="No payments" description="Record a payment against a customer or invoice." /> : <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead></TableRow></TableHeader><TableBody>{data.payments.data.map((payment) => <TableRow key={payment.id}><TableCell>{payment.payment_date}</TableCell><TableCell>{payment.customers?.full_name || payment.customer_id}</TableCell><TableCell>{money(payment.amount)}</TableCell><TableCell>{payment.payment_method}</TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card></div>;
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
  if (!adminId) return <AuthScreen />;
  return (
    <Shell section={section} setSection={setSection}>
      {loading ? <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
        <>
          {section === "dashboard" && <DashboardSection data={data} onNavigate={setSection} />}
          {section === "products" && <ProductsSection data={data} adminId={adminId} />}
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
