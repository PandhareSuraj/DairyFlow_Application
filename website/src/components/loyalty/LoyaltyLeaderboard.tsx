import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TIER_INFO } from "./TierBenefits";

interface LeaderboardCustomer {
  id: string;
  name: string;
  loyalty_points: number;
  phone: string;
  tier: string;
}

export function LoyaltyLeaderboard() {
  const { toast } = useToast();
  const [topCustomers, setTopCustomers] = useState<LeaderboardCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, loyalty_points, phone, tier")
        .order("loyalty_points", { ascending: false })
        .limit(10);

      if (error) throw error;
      setTopCustomers(data || []);
    } catch (error: any) {
      console.error("Error fetching leaderboard:", error);
      toast({
        title: "Error",
        description: "Failed to load leaderboard.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white";
    if (rank === 2) return "bg-gradient-to-br from-gray-300 to-gray-500 text-white";
    if (rank === 3) return "bg-gradient-to-br from-orange-400 to-orange-600 text-white";
    return "bg-muted text-foreground";
  };

  return (
    <Card className="shadow-soft border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Loyalty Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading leaderboard...</div>
        ) : topCustomers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No customers with points yet</div>
        ) : (
          <div className="space-y-3">
            {topCustomers.map((customer, index) => {
              const rank = index + 1;
              const tierInfo = TIER_INFO[customer.tier];
              const TierIcon = tierInfo.icon;

              return (
                <div
                  key={customer.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                    rank <= 3
                      ? "border-primary/20 bg-gradient-to-r from-primary/5 to-transparent hover:shadow-soft"
                      : "border-border bg-card hover:bg-muted/50"
                  }`}
                >
                  {/* Rank Badge */}
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${getRankColor(
                      rank
                    )}`}
                  >
                    {rank <= 3 ? <Trophy className="h-5 w-5" /> : rank}
                  </div>

                  {/* Customer Avatar */}
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(customer.name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Customer Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{customer.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{customer.phone}</p>
                  </div>

                  {/* Points & Badge */}
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end mb-1">
                      <span className="text-2xl font-bold text-primary">{customer.loyalty_points}</span>
                      <span className="text-xs text-muted-foreground">pts</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${tierInfo.color} border-current bg-gradient-to-r ${tierInfo.gradient} bg-clip-text text-transparent font-semibold`}
                    >
                      <TierIcon className={`h-3 w-3 mr-1 ${tierInfo.color}`} />
                      {tierInfo.name}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tier Legend */}
        {!loading && topCustomers.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Tier Levels</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TIER_INFO).map(([key, tier]) => {
                const TierIcon = tier.icon;
                return (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <TierIcon className={`h-4 w-4 ${tier.color}`} />
                    <span className="text-foreground font-medium">{tier.name}</span>
                    <span className="text-muted-foreground">({tier.minPoints}+ pts)</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
