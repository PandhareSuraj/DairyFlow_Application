import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Calendar, PartyPopper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TIER_INFO } from "./TierBenefits";

interface UpcomingRewardsProps {
  customerId: string;
}

const BIRTHDAY_REWARDS: Record<string, number> = {
  bronze: 50,
  silver: 100,
  gold: 200,
  platinum: 500,
};

const ANNIVERSARY_REWARDS: Record<string, number> = {
  bronze: 100,
  silver: 250,
  gold: 500,
  platinum: 1000,
};

const MILESTONE_BONUSES: Record<number, number> = {
  1: 200,
  3: 500,
  5: 1000,
  10: 2500,
};

export function UpcomingRewards({ customerId }: UpcomingRewardsProps) {
  const { toast } = useToast();
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [anniversary, setAnniversary] = useState<Date | null>(null);
  const [tier, setTier] = useState<string>("bronze");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRewardDates();
  }, [customerId]);

  const fetchRewardDates = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("birthday, anniversary_date, tier")
        .eq("id", customerId)
        .single();

      if (error) throw error;

      if (data?.birthday) {
        setBirthday(new Date(data.birthday));
      }
      if (data?.anniversary_date) {
        setAnniversary(new Date(data.anniversary_date));
      }
      setTier(data?.tier || "bronze");
    } catch (error: any) {
      console.error("Error fetching reward dates:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntil = (date: Date): number => {
    const today = new Date();
    const thisYear = today.getFullYear();
    
    // Create date for this year's occurrence
    let targetDate = new Date(thisYear, date.getMonth(), date.getDate());
    
    // If the date has passed this year, use next year
    if (targetDate < today) {
      targetDate = new Date(thisYear + 1, date.getMonth(), date.getDate());
    }
    
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const getAnniversaryYear = (): number => {
    if (!anniversary) return 0;
    const today = new Date();
    const thisYearAnniversary = new Date(today.getFullYear(), anniversary.getMonth(), anniversary.getDate());
    
    // If anniversary hasn't happened yet this year, show current years as member
    // If it has happened, show next year's count
    if (thisYearAnniversary > today) {
      return today.getFullYear() - anniversary.getFullYear();
    } else {
      return today.getFullYear() - anniversary.getFullYear() + 1;
    }
  };

  const isMilestoneYear = (years: number): boolean => {
    return years in MILESTONE_BONUSES;
  };

  if (loading) {
    return (
      <Card className="shadow-soft border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Upcoming Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!birthday && !anniversary) {
    return null;
  }

  const tierInfo = TIER_INFO[tier];
  const birthdayPoints = BIRTHDAY_REWARDS[tier];
  const upcomingYears = getAnniversaryYear();
  const milestoneBonus = MILESTONE_BONUSES[upcomingYears] || 0;
  const anniversaryPoints = ANNIVERSARY_REWARDS[tier] + milestoneBonus;

  return (
    <Card className="shadow-soft border-border bg-gradient-to-br from-secondary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Upcoming Rewards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {birthday && (
          <div className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-all">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-pink-500/10">
                <PartyPopper className="h-5 w-5 text-pink-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-1">Birthday Reward</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {birthday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {getDaysUntil(birthday)} days away
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${tierInfo.color}`}>
                    +{birthdayPoints} points
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {anniversary && getAnniversaryYear() >= 1 && (
          <div className={`p-4 rounded-lg border transition-all ${
            isMilestoneYear(upcomingYears)
              ? "border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-transparent"
              : "border-border bg-card hover:bg-muted/50"
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full ${
                isMilestoneYear(upcomingYears) ? "bg-amber-500/20" : "bg-purple-500/10"
              }`}>
                <Calendar className={`h-5 w-5 ${
                  isMilestoneYear(upcomingYears) ? "text-amber-500" : "text-purple-500"
                }`} />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  {isMilestoneYear(upcomingYears) && (
                    <span className="text-amber-500">🏆</span>
                  )}
                  {upcomingYears} Year {isMilestoneYear(upcomingYears) ? "MILESTONE" : "Anniversary"}
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {anniversary.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {getDaysUntil(anniversary)} days away
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${tierInfo.color}`}>
                    +{anniversaryPoints} points
                  </Badge>
                  {isMilestoneYear(upcomingYears) && (
                    <Badge variant="default" className="text-xs bg-amber-500">
                      +{milestoneBonus} bonus
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            💡 Rewards are automatically credited on your special days
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
