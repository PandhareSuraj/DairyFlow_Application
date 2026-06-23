import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Award, Crown, Star, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MilestoneBadgesProps {
  customerId: string;
}

const MILESTONE_CONFIG = {
  1: { icon: Star, label: "1 Year", color: "text-blue-500", bgColor: "bg-blue-500/10", bonus: 200 },
  3: { icon: Award, label: "3 Years", color: "text-purple-500", bgColor: "bg-purple-500/10", bonus: 500 },
  5: { icon: Trophy, label: "5 Years", color: "text-amber-500", bgColor: "bg-amber-500/10", bonus: 1000 },
  10: { icon: Crown, label: "10 Years", color: "text-rose-500", bgColor: "bg-rose-500/10", bonus: 2500 },
};

export function MilestoneBadges({ customerId }: MilestoneBadgesProps) {
  const [milestones, setMilestones] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMilestones();
  }, [customerId]);

  const fetchMilestones = async () => {
    setError(null);
    try {
      const { data, error } = await supabase
        .from("reward_history")
        .select("reward_type")
        .eq("customer_id", customerId)
        .like("reward_type", "anniversary_%");

      if (error) throw error;

      const achievedMilestones = data
        .map(r => {
          const match = r.reward_type.match(/anniversary_(\d+)y/);
          return match ? parseInt(match[1]) : null;
        })
        .filter((year): year is number => year !== null);

      setMilestones(achievedMilestones);
    } catch (error: any) {
      console.error("Error fetching milestones:", error);
      setError("Failed to load milestone data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="flex items-center justify-center py-6 gap-3">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <span className="text-sm text-muted-foreground">{error}</span>
          <Button onClick={() => fetchMilestones()} variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (milestones.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-soft border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Anniversary Milestones
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(MILESTONE_CONFIG).map(([year, config]) => {
            const yearNum = parseInt(year);
            const isAchieved = milestones.includes(yearNum);
            const Icon = config.icon;

            return (
              <div
                key={year}
                className={`p-4 rounded-lg border transition-all ${
                  isAchieved
                    ? "border-primary/50 bg-gradient-to-br from-primary/5 to-transparent"
                    : "border-border bg-muted/20 opacity-50"
                }`}
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className={`p-3 rounded-full ${isAchieved ? config.bgColor : "bg-muted"}`}>
                    <Icon className={`h-6 w-6 ${isAchieved ? config.color : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{config.label}</p>
                    <Badge variant={isAchieved ? "default" : "outline"} className="text-xs mt-1">
                      {isAchieved ? `+${config.bonus} pts` : "Locked"}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {milestones.length > 0 && (
          <div className="mt-4 p-3 bg-primary/5 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              🏆 You've achieved {milestones.length} milestone{milestones.length !== 1 ? 's' : ''}!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
