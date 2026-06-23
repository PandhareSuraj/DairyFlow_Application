import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Award, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ReferralLeaderboard } from './ReferralLeaderboard';

interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  conversionRate: number;
  totalPointsAwarded: number;
  avgPointsPerReferral: number;
}

interface TopReferrer {
  id: string;
  name: string;
  referralCount: number;
  pointsEarned: number;
}

export const ReferralAnalytics = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    completedReferrals: 0,
    pendingReferrals: 0,
    conversionRate: 0,
    totalPointsAwarded: 0,
    avgPointsPerReferral: 0,
  });
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferralAnalytics();
  }, [user?.dairyId]);

  const fetchReferralAnalytics = async () => {
    if (!user?.dairyId) return;
    
    try {
      // Get all customers for this dairy
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name')
        .eq('dairy_id', user.dairyId);

      if (!customers || customers.length === 0) {
        setLoading(false);
        return;
      }

      const customerIds = customers.map(c => c.id);
      const customerMap = new Map(customers.map(c => [c.id, c.name]));

      // Get all referrals for these customers
      const { data: referrals } = await supabase
        .from('referrals')
        .select('*')
        .in('referrer_customer_id', customerIds);

      if (!referrals) {
        setLoading(false);
        return;
      }

      // Calculate stats
      const totalReferrals = referrals.length;
      const completedReferrals = referrals.filter(r => r.status === 'completed').length;
      const pendingReferrals = referrals.filter(r => r.status === 'pending').length;
      const conversionRate = totalReferrals > 0 ? (completedReferrals / totalReferrals) * 100 : 0;
      const totalPointsAwarded = referrals.reduce((sum, r) => sum + (r.points_awarded || 0), 0);
      const avgPointsPerReferral = completedReferrals > 0 ? totalPointsAwarded / completedReferrals : 0;

      setStats({
        totalReferrals,
        completedReferrals,
        pendingReferrals,
        conversionRate,
        totalPointsAwarded,
        avgPointsPerReferral,
      });

      // Calculate top referrers
      const referrerStats = new Map<string, { count: number; points: number }>();
      referrals.forEach(r => {
        const current = referrerStats.get(r.referrer_customer_id) || { count: 0, points: 0 };
        referrerStats.set(r.referrer_customer_id, {
          count: current.count + 1,
          points: current.points + (r.points_awarded || 0),
        });
      });

      const topReferrersList = Array.from(referrerStats.entries())
        .map(([id, data]) => ({
          id,
          name: customerMap.get(id) || 'Unknown',
          referralCount: data.count,
          pointsEarned: data.points,
        }))
        .sort((a, b) => b.referralCount - a.referralCount)
        .slice(0, 5);

      setTopReferrers(topReferrersList);

      // Calculate monthly data (last 6 months)
      const monthlyStats = new Map<string, { total: number; completed: number }>();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      referrals.forEach(r => {
        const date = new Date(r.created_at);
        const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
        const current = monthlyStats.get(monthKey) || { total: 0, completed: 0 };
        monthlyStats.set(monthKey, {
          total: current.total + 1,
          completed: current.completed + (r.status === 'completed' ? 1 : 0),
        });
      });

      // Get last 6 months
      const now = new Date();
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
        const data = monthlyStats.get(key) || { total: 0, completed: 0 };
        last6Months.push({
          month: months[d.getMonth()],
          total: data.total,
          completed: data.completed,
        });
      }

      setMonthlyData(last6Months);
    } catch (error) {
      console.error('Error fetching referral analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const pieData = [
    { name: 'Completed', value: stats.completedReferrals, color: 'hsl(var(--success))' },
    { name: 'Pending', value: stats.pendingReferrals, color: 'hsl(var(--warning))' },
  ];

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">Loading referral analytics...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Referrals</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalReferrals}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                <p className="text-3xl font-bold text-foreground">{stats.conversionRate.toFixed(1)}%</p>
              </div>
              <div className="p-3 bg-success/10 rounded-full">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Points Distributed</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalPointsAwarded.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-accent/10 rounded-full">
                <Award className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Points/Referral</p>
                <p className="text-3xl font-bold text-foreground">{stats.avgPointsPerReferral.toFixed(0)}</p>
              </div>
              <div className="p-3 bg-warning/10 rounded-full">
                <UserPlus className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Referrals Chart */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Monthly Referrals</CardTitle>
            <CardDescription>Referral activity over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.some(d => d.total > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No referral data available yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversion Pie Chart */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Referral Status Distribution</CardTitle>
            <CardDescription>Breakdown of completed vs pending referrals</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.totalReferrals > 0 ? (
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No referral data available yet
              </div>
            )}
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm text-muted-foreground">Completed: {stats.completedReferrals}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                <span className="text-sm text-muted-foreground">Pending: {stats.pendingReferrals}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Leaderboard */}
      <ReferralLeaderboard />
    </div>
  );
};
