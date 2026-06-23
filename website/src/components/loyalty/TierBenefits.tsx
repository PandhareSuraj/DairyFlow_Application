import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp, Gift, Zap, Star } from "lucide-react";

interface TierInfo {
  name: string;
  minPoints: number;
  color: string;
  icon: any;
  gradient: string;
  benefits: string[];
  pointsMultiplier: number;
  discountBonus: number;
}

export const TIER_INFO: Record<string, TierInfo> = {
  bronze: {
    name: "Bronze Member",
    minPoints: 0,
    color: "text-orange-600",
    icon: TrendingUp,
    gradient: "from-orange-400 to-orange-600",
    benefits: [
      "Earn 1 point per ₹10 spent",
      "Redeem points at 10 points = ₹1",
      "Standard delivery priority",
    ],
    pointsMultiplier: 1,
    discountBonus: 0,
  },
  silver: {
    name: "Silver Member",
    minPoints: 1500,
    color: "text-gray-400",
    icon: Award,
    gradient: "from-gray-300 to-gray-500",
    benefits: [
      "Earn 1.2x points (1.2 points per ₹10)",
      "5% bonus on point redemption",
      "Priority delivery support",
      "Exclusive offers",
    ],
    pointsMultiplier: 1.2,
    discountBonus: 0.05,
  },
  gold: {
    name: "Gold Star",
    minPoints: 3000,
    color: "text-yellow-500",
    icon: Medal,
    gradient: "from-yellow-400 to-yellow-600",
    benefits: [
      "Earn 1.5x points (1.5 points per ₹10)",
      "10% bonus on point redemption",
      "Premium delivery priority",
      "Birthday special offers",
      "Early access to new products",
    ],
    pointsMultiplier: 1.5,
    discountBonus: 0.1,
  },
  platinum: {
    name: "Platinum Elite",
    minPoints: 5000,
    color: "text-purple-500",
    icon: Trophy,
    gradient: "from-purple-500 to-purple-700",
    benefits: [
      "Earn 2x points (2 points per ₹10)",
      "15% bonus on point redemption",
      "VIP delivery service",
      "Dedicated customer support",
      "Exclusive events & previews",
      "Special anniversary rewards",
    ],
    pointsMultiplier: 2,
    discountBonus: 0.15,
  },
};

interface TierBenefitsProps {
  currentTier: string;
  currentPoints: number;
}

export function TierBenefits({ currentTier, currentPoints }: TierBenefitsProps) {
  const tierInfo = TIER_INFO[currentTier];
  const TierIcon = tierInfo.icon;

  // Calculate next tier
  const tierOrder = ["bronze", "silver", "gold", "platinum"];
  const currentTierIndex = tierOrder.indexOf(currentTier);
  const nextTier = currentTierIndex < tierOrder.length - 1 ? tierOrder[currentTierIndex + 1] : null;
  const nextTierInfo = nextTier ? TIER_INFO[nextTier] : null;
  const pointsToNextTier = nextTierInfo ? nextTierInfo.minPoints - currentPoints : 0;

  return (
    <Card className="shadow-soft border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          Your Tier Benefits
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Tier */}
        <div className={`p-4 rounded-lg border-2 bg-gradient-to-br ${tierInfo.gradient} bg-opacity-10`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-3 rounded-full bg-gradient-to-br ${tierInfo.gradient}`}>
              <TierIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className={`text-xl font-bold ${tierInfo.color}`}>{tierInfo.name}</h3>
              <p className="text-sm text-muted-foreground">{currentPoints} points</p>
            </div>
          </div>

          <div className="space-y-2">
            {tierInfo.benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <Zap className={`h-4 w-4 mt-0.5 flex-shrink-0 ${tierInfo.color}`} />
                <span className="text-foreground">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress to Next Tier */}
        {nextTierInfo && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress to {nextTierInfo.name}</span>
              <span className="font-semibold text-foreground">
                {pointsToNextTier} points to go
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full bg-gradient-to-r ${nextTierInfo.gradient} transition-all`}
                style={{
                  width: `${Math.min((currentPoints / nextTierInfo.minPoints) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* All Tiers Overview */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Tier Levels</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(TIER_INFO).map(([tier, info]) => {
              const Icon = info.icon;
              const isCurrentTier = tier === currentTier;
              const isUnlocked = currentPoints >= info.minPoints;

              return (
                <div
                  key={tier}
                  className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                    isCurrentTier
                      ? "border-primary bg-primary/5"
                      : isUnlocked
                      ? "border-border bg-card"
                      : "border-border bg-muted/50 opacity-60"
                  }`}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${info.color}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate text-foreground">{info.name}</p>
                    <p className="text-xs text-muted-foreground">{info.minPoints}+ pts</p>
                  </div>
                  {isCurrentTier && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      Current
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
