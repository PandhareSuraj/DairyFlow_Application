import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Copy, Share2, Users, Gift, CheckCircle2, Clock, Trophy, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ReferralCardProps {
  customerId: string;
}

interface ReferralStat {
  total: number;
  pending: number;
  completed: number;
  pointsEarned: number;
}

interface Milestone {
  count: number;
  bonus: number;
  name: string;
  achieved: boolean;
}

const REFERRAL_MILESTONES: Milestone[] = [
  { count: 5, bonus: 1000, name: 'Friendly Neighbor', achieved: false },
  { count: 10, bonus: 2500, name: 'Community Builder', achieved: false },
  { count: 25, bonus: 7500, name: 'Ambassador', achieved: false },
  { count: 50, bonus: 20000, name: 'Champion', achieved: false },
];

export function ReferralCard({ customerId }: ReferralCardProps) {
  const [referralCode, setReferralCode] = useState<string>('');
  const [stats, setStats] = useState<ReferralStat>({ total: 0, pending: 0, completed: 0, pointsEarned: 0 });
  const [milestones, setMilestones] = useState<Milestone[]>(REFERRAL_MILESTONES);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchReferralData();
  }, [customerId]);

  const fetchReferralData = async () => {
    try {
      // Get referral code
      const { data: customer } = await supabase
        .from('customers')
        .select('referral_code')
        .eq('id', customerId)
        .single();

      if (customer?.referral_code) {
        setReferralCode(customer.referral_code);
      }

      // Get referral statistics
      const { data: referrals } = await supabase
        .from('referrals')
        .select('status, points_awarded')
        .eq('referrer_customer_id', customerId);

      if (referrals) {
        const total = referrals.length;
        const pending = referrals.filter(r => r.status === 'pending').length;
        const completed = referrals.filter(r => r.status === 'completed').length;
        const pointsEarned = referrals.reduce((sum, r) => sum + (r.points_awarded || 0), 0);
        
        setStats({ total, pending, completed, pointsEarned });

        // Update milestones based on completed count
        const updatedMilestones = REFERRAL_MILESTONES.map(m => ({
          ...m,
          achieved: completed >= m.count,
        }));
        setMilestones(updatedMilestones);
      }
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard",
    });
  };

  const shareReferral = async () => {
    const shareText = `Join me on this amazing dairy delivery service! Use my referral code ${referralCode} and get 100 bonus points on your first order!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join with my referral code',
          text: shareText,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast({
        title: "Copied!",
        description: "Referral message copied to clipboard",
      });
    }
  };

  // Calculate next milestone progress
  const getNextMilestone = () => {
    const nextMilestone = milestones.find(m => !m.achieved);
    if (!nextMilestone) return null;
    
    const previousMilestone = milestones.filter(m => m.achieved).pop();
    const startCount = previousMilestone?.count || 0;
    const progress = ((stats.completed - startCount) / (nextMilestone.count - startCount)) * 100;
    
    return {
      ...nextMilestone,
      progress: Math.min(Math.max(progress, 0), 100),
      remaining: nextMilestone.count - stats.completed,
    };
  };

  const nextMilestone = getNextMilestone();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle>Refer Friends & Earn</CardTitle>
        </div>
        <CardDescription>
          Share your referral code and earn 500 points when your friends make their first purchase!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Referral Code */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Referral Code</label>
          <div className="flex gap-2">
            <Input 
              value={referralCode} 
              readOnly 
              className="font-mono text-lg text-center tracking-wider bg-background"
            />
            <Button variant="outline" size="icon" onClick={copyReferralCode}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="default" size="icon" onClick={shareReferral}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-background/60 rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Total Referrals</p>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>

          <div className="bg-background/60 rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-4 w-4 text-primary" />
              <p className="text-sm text-muted-foreground">Points Earned</p>
            </div>
            <p className="text-2xl font-bold text-primary">{stats.pointsEarned}</p>
          </div>

          <div className="bg-background/60 rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-warning" />
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
            <p className="text-2xl font-bold">{stats.pending}</p>
          </div>

          <div className="bg-background/60 rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <p className="text-2xl font-bold">{stats.completed}</p>
          </div>
        </div>

        {/* Milestone Progress */}
        {nextMilestone && (
          <div className="bg-gradient-to-r from-accent/10 to-primary/10 rounded-lg p-4 border border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-accent" />
                <span className="font-medium">Next Milestone</span>
              </div>
              <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                +{nextMilestone.bonus.toLocaleString()} pts
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">"{nextMilestone.name}"</span>
                <span className="font-medium">{stats.completed}/{nextMilestone.count} referrals</span>
              </div>
              <Progress value={nextMilestone.progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {nextMilestone.remaining} more referral{nextMilestone.remaining !== 1 ? 's' : ''} to unlock bonus!
              </p>
            </div>
          </div>
        )}

        {/* Milestones Overview */}
        <div className="space-y-3">
          <p className="font-medium text-sm flex items-center gap-2">
            <Star className="h-4 w-4 text-accent" />
            Referral Milestones
          </p>
          <div className="grid grid-cols-2 gap-2">
            {milestones.map((milestone) => (
              <div 
                key={milestone.count}
                className={`p-3 rounded-lg border transition-all ${
                  milestone.achieved 
                    ? 'bg-success/10 border-success/30' 
                    : 'bg-muted/30 border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${milestone.achieved ? 'text-success' : 'text-muted-foreground'}`}>
                    {milestone.count} referrals
                  </span>
                  {milestone.achieved && <CheckCircle2 className="h-3 w-3 text-success" />}
                </div>
                <p className={`text-sm font-semibold ${milestone.achieved ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {milestone.name}
                </p>
                <p className={`text-xs ${milestone.achieved ? 'text-success' : 'text-muted-foreground'}`}>
                  +{milestone.bonus.toLocaleString()} pts
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <p className="font-medium text-sm">How it works:</p>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Share your referral code with friends</li>
            <li>They enter your code when placing their first order</li>
            <li>You get 500 points, they get 100 points!</li>
            <li>Hit milestones for massive bonus rewards!</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
