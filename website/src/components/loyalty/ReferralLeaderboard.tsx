import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Medal, Award, Crown, Users, Sparkles, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface Referrer {
  id: string;
  name: string;
  referralCount: number;
  pointsEarned: number;
  tier: string;
  milestones: string[];
}

const REFERRAL_MILESTONES = [
  { count: 5, name: 'Friendly Neighbor', icon: Users },
  { count: 10, name: 'Community Builder', icon: Award },
  { count: 25, name: 'Ambassador', icon: Medal },
  { count: 50, name: 'Champion', icon: Crown },
];

const getMilestones = (completedCount: number): string[] => {
  return REFERRAL_MILESTONES
    .filter(m => completedCount >= m.count)
    .map(m => m.name);
};

const getHighestMilestone = (completedCount: number) => {
  const achieved = REFERRAL_MILESTONES.filter(m => completedCount >= m.count);
  return achieved.length > 0 ? achieved[achieved.length - 1] : null;
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="h-6 w-6 text-yellow-500" />;
    case 2:
      return <Medal className="h-6 w-6 text-gray-400" />;
    case 3:
      return <Medal className="h-6 w-6 text-amber-600" />;
    default:
      return <span className="text-lg font-bold text-muted-foreground w-6 text-center">{rank}</span>;
  }
};

const getRankBg = (rank: number) => {
  switch (rank) {
    case 1:
      return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/30';
    case 2:
      return 'bg-gradient-to-r from-gray-400/20 to-gray-300/10 border-gray-400/30';
    case 3:
      return 'bg-gradient-to-r from-amber-600/20 to-orange-500/10 border-amber-600/30';
    default:
      return 'bg-background/60 border-border';
  }
};

export const ReferralLeaderboard = () => {
  const { user } = useAuth();
  const [topReferrers, setTopReferrers] = useState<Referrer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [user?.dairyId]);

  const fetchLeaderboard = async () => {
    if (!user?.dairyId) return;
    setError(null);

    try {
      // Get all customers for this dairy
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name, tier')
        .eq('dairy_id', user.dairyId);

      if (!customers || customers.length === 0) {
        setLoading(false);
        return;
      }

      const customerIds = customers.map(c => c.id);
      const customerMap = new Map(customers.map(c => [c.id, { name: c.name, tier: c.tier }]));

      // Get all referrals
      const { data: referrals } = await supabase
        .from('referrals')
        .select('referrer_customer_id, status, points_awarded')
        .in('referrer_customer_id', customerIds);

      if (!referrals || referrals.length === 0) {
        setLoading(false);
        return;
      }

      // Calculate stats per referrer
      const referrerStats = new Map<string, { total: number; completed: number; points: number }>();
      
      referrals.forEach(r => {
        const current = referrerStats.get(r.referrer_customer_id) || { total: 0, completed: 0, points: 0 };
        referrerStats.set(r.referrer_customer_id, {
          total: current.total + 1,
          completed: current.completed + (r.status === 'completed' ? 1 : 0),
          points: current.points + (r.points_awarded || 0),
        });
      });

      // Build leaderboard
      const leaderboard: Referrer[] = Array.from(referrerStats.entries())
        .map(([id, stats]) => {
          const customer = customerMap.get(id);
          return {
            id,
            name: customer?.name || 'Unknown',
            referralCount: stats.completed,
            pointsEarned: stats.points,
            tier: customer?.tier || 'bronze',
            milestones: getMilestones(stats.completed),
          };
        })
        .filter(r => r.referralCount > 0)
        .sort((a, b) => b.referralCount - a.referralCount)
        .slice(0, 10);

      setTopReferrers(leaderboard);
    } catch (error) {
      console.error('Error fetching referral leaderboard:', error);
      setError('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading leaderboard...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mb-3" />
          <p className="font-medium text-foreground">Failed to load leaderboard</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button 
            onClick={() => fetchLeaderboard()} 
            variant="outline" 
            size="sm" 
            className="mt-4"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" />
          <CardTitle>Referral Champions</CardTitle>
        </div>
        <CardDescription>Top customers who have referred the most friends</CardDescription>
      </CardHeader>
      <CardContent>
        {topReferrers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No referrals yet</p>
            <p className="text-sm">Encourage customers to share their referral codes!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topReferrers.map((referrer, index) => {
              const rank = index + 1;
              const highestMilestone = getHighestMilestone(referrer.referralCount);
              const MilestoneIcon = highestMilestone?.icon || Users;
              
              return (
                <div
                  key={referrer.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all hover:shadow-soft ${getRankBg(rank)}`}
                >
                  {/* Rank */}
                  <div className="flex-shrink-0 w-8 flex justify-center">
                    {getRankIcon(rank)}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-10 w-10 border-2 border-background">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {referrer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground truncate">{referrer.name}</p>
                      {highestMilestone && (
                        <Badge 
                          variant="outline" 
                          className="bg-accent/10 text-accent border-accent/30 text-xs gap-1"
                        >
                          <MilestoneIcon className="h-3 w-3" />
                          {highestMilestone.name}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {referrer.referralCount} referral{referrer.referralCount !== 1 ? 's' : ''}
                      </span>
                      {referrer.milestones.length > 1 && (
                        <span className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          {referrer.milestones.length} badges
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Points */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-lg font-bold text-primary">{referrer.pointsEarned.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">pts earned</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Milestone Legend */}
        {topReferrers.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-sm font-medium text-muted-foreground mb-3">Milestone Badges</p>
            <div className="flex flex-wrap gap-2">
              {REFERRAL_MILESTONES.map((milestone) => {
                const Icon = milestone.icon;
                return (
                  <Badge
                    key={milestone.name}
                    variant="outline"
                    className="gap-1.5 text-xs py-1.5"
                  >
                    <Icon className="h-3 w-3" />
                    {milestone.name}
                    <span className="text-muted-foreground">({milestone.count}+)</span>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
