import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PointsHistoryModal } from "./PointsHistoryModal";
import { TIER_INFO } from "./TierBenefits";

interface LoyaltyPointsCardProps {
  customerId: string;
}

export function LoyaltyPointsCard({ customerId }: LoyaltyPointsCardProps) {
  const { toast } = useToast();
  const [points, setPoints] = useState<number>(0);
  const [tier, setTier] = useState<string>("bronze");
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchPoints();
  }, [customerId]);

  const fetchPoints = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("loyalty_points, tier")
        .eq("id", customerId)
        .single();

      if (error) throw error;
      setPoints(data?.loyalty_points || 0);
      setTier(data?.tier || "bronze");
    } catch (error: any) {
      console.error("Error fetching loyalty points:", error);
      toast({
        title: "Error",
        description: "Failed to load loyalty points.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-soft border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Loyalty Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const discountValue = Math.floor(points / 10);
  const tierInfo = TIER_INFO[tier];
  const TierIcon = tierInfo.icon;

  return (
    <>
      <Card className="shadow-soft border-border bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Loyalty Rewards
            </div>
            <Badge
              variant="outline"
              className={`${tierInfo.color} border-current bg-gradient-to-r ${tierInfo.gradient} bg-clip-text text-transparent font-semibold`}
            >
              <TierIcon className={`h-3 w-3 mr-1 ${tierInfo.color}`} />
              {tierInfo.name}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-5xl font-bold text-primary">{points}</span>
              <span className="text-muted-foreground">points</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Worth ₹{discountValue} in discounts
            </p>
          </div>

          <div className="p-4 bg-card border border-border rounded-lg space-y-2">
            <h4 className="font-medium text-foreground">Your Benefits:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Earn {tierInfo.pointsMultiplier}x points on orders</li>
              <li>• {tierInfo.discountBonus > 0 ? `${tierInfo.discountBonus * 100}% bonus on redemption` : 'Standard redemption rate'}</li>
              <li>• Points never expire</li>
            </ul>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowHistory(true)}
          >
            <History className="h-4 w-4 mr-2" />
            View Points History
          </Button>
        </CardContent>
      </Card>

      <PointsHistoryModal
        customerId={customerId}
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </>
  );
}
