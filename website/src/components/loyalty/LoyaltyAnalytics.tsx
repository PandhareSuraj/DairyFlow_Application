import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Gift, Users, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, subDays, parseISO } from "date-fns";

interface AnalyticsData {
  totalPointsDistributed: number;
  totalPointsRedeemed: number;
  redemptionRate: number;
  averageCustomerPoints: number;
  pointsOverTime: { date: string; earned: number; redeemed: number }[];
}

export function LoyaltyAnalytics() {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Get user's dairy_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("dairy_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id!)
        .single();

      if (!profile?.dairy_id) {
        setLoading(false);
        return;
      }

      // Fetch all customers for this dairy
      const { data: customers } = await supabase
        .from("customers")
        .select("id, loyalty_points")
        .eq("dairy_id", profile.dairy_id);

      const customerIds = customers?.map((c) => c.id) || [];

      // Fetch all transactions for these customers
      const { data: transactions } = await supabase
        .from("points_transactions")
        .select("*")
        .in("customer_id", customerIds)
        .order("created_at", { ascending: true });

      if (!transactions || !customers) {
        setLoading(false);
        return;
      }

      // Calculate metrics
      const totalEarned = transactions
        .filter((t) => t.transaction_type === "earned")
        .reduce((sum, t) => sum + t.points, 0);

      const totalRedeemed = transactions
        .filter((t) => t.transaction_type === "redeemed")
        .reduce((sum, t) => sum + Math.abs(t.points), 0);

      const redemptionRate = totalEarned > 0 ? (totalRedeemed / totalEarned) * 100 : 0;

      const avgPoints =
        customers.length > 0
          ? customers.reduce((sum, c) => sum + c.loyalty_points, 0) / customers.length
          : 0;

      // Group transactions by date for chart
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(new Date(), 29 - i);
        return format(date, "yyyy-MM-dd");
      });

      const pointsByDate = last30Days.map((date) => {
        const dayTransactions = transactions.filter(
          (t) => format(parseISO(t.created_at), "yyyy-MM-dd") === date
        );

        const earned = dayTransactions
          .filter((t) => t.transaction_type === "earned")
          .reduce((sum, t) => sum + t.points, 0);

        const redeemed = dayTransactions
          .filter((t) => t.transaction_type === "redeemed")
          .reduce((sum, t) => sum + Math.abs(t.points), 0);

        return {
          date: format(parseISO(date), "MMM dd"),
          earned,
          redeemed,
        };
      });

      setAnalytics({
        totalPointsDistributed: totalEarned,
        totalPointsRedeemed: totalRedeemed,
        redemptionRate,
        averageCustomerPoints: avgPoints,
        pointsOverTime: pointsByDate,
      });
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load loyalty analytics.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No loyalty data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    earned: {
      label: "Points Earned",
      color: "hsl(var(--primary))",
    },
    redeemed: {
      label: "Points Redeemed",
      color: "hsl(var(--destructive))",
    },
  };

  return (
    <div className="space-y-4">
      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points Distributed</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {analytics.totalPointsDistributed.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ≈ ₹{(analytics.totalPointsDistributed / 10).toFixed(0)} value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Redemption Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {analytics.redemptionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.totalPointsRedeemed.toLocaleString()} pts redeemed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Customer Points</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {Math.round(analytics.averageCustomerPoints).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per customer balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {(analytics.totalPointsDistributed - analytics.totalPointsRedeemed).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Net points in circulation</p>
          </CardContent>
        </Card>
      </div>

      {/* Points Over Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Points Activity (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.pointsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="earned"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="redeemed"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Daily Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Points Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.pointsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="earned" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
