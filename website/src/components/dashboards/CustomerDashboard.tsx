import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Package, 
  Calendar, 
  CreditCard, 
  MapPin, 
  Phone, 
  Mail, 
  TrendingUp,
  Star,
  Settings,
  History,
  Plus,
  Pause,
  LogOut,
  Gift,
  Sparkles
} from 'lucide-react';
import { RequestSubscriptionModal } from '@/components/forms/RequestSubscriptionModal';
import { ScheduleDeliveryModal } from '@/components/forms/ScheduleDeliveryModal';
import { SkipDeliveryModal } from '@/components/forms/SkipDeliveryModal';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { TierBenefits } from '@/components/loyalty/TierBenefits';
import { UpcomingRewards } from '@/components/loyalty/UpcomingRewards';
import { MilestoneBadges } from '@/components/loyalty/MilestoneBadges';
import { ReferralCard } from '@/components/loyalty/ReferralCard';
import { EnterReferralModal } from '@/components/loyalty/EnterReferralModal';
import { RateDeliveryModal } from '@/components/forms/RateDeliveryModal';
import { usePullToRefresh, PullToRefreshIndicator } from '@/hooks/usePullToRefresh';

import {
  CustomerBottomNav,
  LoyaltyProgressRing,
  OrderTrackingTimeline,
  GamificationBanner,
  QuickActionCard,
  PersonalizedGreeting,
  SubscriptionSwipeCard,
} from '@/components/customer';

interface CustomerData {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  area?: string;
  status: string;
}

interface Subscription {
  id: string;
  products: { name: string; category: string; unit: string; price: number };
  quantity: number;
  frequency: string;
  next_delivery_date: string;
  delivery_time: string;
  status: string;
  special_instructions?: string;
}

interface Order {
  id: string;
  product_id: string;
  dairy_id: string;
  products: { name: string; category: string; unit: string };
  quantity: number;
  total_price: number;
  delivery_date: string;
  status: string;
  created_at: string;
}

export const CustomerDashboard = () => {
  const { t } = useTranslation(['customer', 'common']);
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('home');
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [customerPoints, setCustomerPoints] = useState(0);
  const [customerTier, setCustomerTier] = useState<string>("bronze");
  const [loading, setLoading] = useState(true);
  const [showRequestSubscription, setShowRequestSubscription] = useState(false);
  const [showScheduleDelivery, setShowScheduleDelivery] = useState(false);
  const [showSkipDelivery, setShowSkipDelivery] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRateDelivery, setShowRateDelivery] = useState(false);
  const [showEnterReferral, setShowEnterReferral] = useState(false);
  const [selectedOrderToRate, setSelectedOrderToRate] = useState<Order | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchCustomerData();
      fetchCustomerLoyaltyInfo();
      fetchSubscriptions();
      fetchRecentOrders();
    }
  }, [user?.id]);

  const fetchCustomerLoyaltyInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("loyalty_points, tier")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      setCustomerPoints(data?.loyalty_points || 0);
      setCustomerTier(data?.tier || "bronze");
    } catch (error: any) {
      console.error("Error fetching loyalty info:", error);
    }
  };

  const fetchCustomerData = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setCustomerData(data);
    } catch (error) {
      console.error('Error fetching customer data:', error);
      toast({
        title: t('common:error'),
        description: t('common:noData'),
        variant: "destructive"
      });
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_subscriptions')
        .select(`
          id,
          product_id,
          quantity,
          frequency,
          next_delivery_date,
          delivery_time,
          status,
          special_instructions
        `)
        .eq('customer_id', user?.id)
        .in('status', ['active', 'pending', 'paused'])
        .order('next_delivery_date');

      if (error) throw error;

      const subscriptionsWithProducts = await Promise.all(
        (data || []).map(async (subscription) => {
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('name, category, unit, price')
            .eq('id', subscription.product_id)
            .single();

          if (productError) {
            return {
              ...subscription,
              products: { name: 'Unknown Product', category: '', unit: '', price: 0 }
            };
          }

          return { ...subscription, products: product };
        })
      );

      setSubscriptions(subscriptionsWithProducts);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  };

  const fetchRecentOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          product_id,
          dairy_id,
          quantity,
          total_price,
          delivery_date,
          status,
          created_at
        `)
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const ordersWithProducts = await Promise.all(
        (data || []).map(async (order) => {
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('name, category, unit')
            .eq('id', order.product_id)
            .single();

          if (productError) {
            return { ...order, products: { name: 'Unknown Product', category: '', unit: '' } };
          }

          return { ...order, products: product };
        })
      );

      setRecentOrders(ordersWithProducts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setLoading(false);
    }
  };

  const toggleSubscription = async (subscriptionId: string, action: 'pause' | 'resume') => {
    try {
      const { error } = await supabase
        .from('customer_subscriptions')
        .update({ 
          status: action === 'pause' ? 'paused' : 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      toast({
        title: t('common:success'),
        description: action === 'pause' ? t('pauseSubscription') : t('resumeSubscription')
      });

      fetchSubscriptions();
    } catch (error) {
      toast({
        title: t('common:error'),
        description: t('common:error'),
        variant: "destructive"
      });
    }
  };

  const calculateStats = () => {
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
    const upcomingDeliveries = subscriptions.filter(sub => 
      new Date(sub.next_delivery_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    ).length;
    const totalOrders = recentOrders.length;
    const monthlySpend = recentOrders
      .filter(order => new Date(order.created_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .reduce((sum, order) => sum + Number(order.total_price), 0);

    return { activeSubscriptions, upcomingDeliveries, totalOrders, monthlySpend };
  };

  const stats = calculateStats();

  // Calculate streak (mock - would need backend support)
  const calculateStreak = () => {
    const deliveredOrders = recentOrders.filter(o => o.status === 'delivered');
    return Math.min(deliveredOrders.length, 30);
  };

  // Pull to refresh for home tab
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      fetchCustomerData(),
      fetchCustomerLoyaltyInfo(),
      fetchSubscriptions(),
      fetchRecentOrders()
    ]);
  }, []);

  const {
    pullDistance,
    isRefreshing,
    handlers: pullHandlers,
    containerRef: pullContainerRef
  } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    disabled: activeTab !== 'home'
  });

  // Home Tab Content
  const HomeContent = () => (
    <div 
      ref={pullContainerRef as React.RefObject<HTMLDivElement>}
      className="h-[calc(100vh-180px)] overflow-auto relative"
      {...pullHandlers}
    >
      <PullToRefreshIndicator 
        pullDistance={pullDistance} 
        threshold={80} 
        isRefreshing={isRefreshing} 
      />
      <div 
        className="space-y-5 px-4 pb-20 transition-transform"
        style={{ transform: `translateY(${Math.min(pullDistance, 60)}px)` }}
      >
        {/* Loyalty Progress Ring */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">{t('yourLoyalty')}</h3>
              <p className="text-sm text-muted-foreground">{t('keepEarningPoints')}</p>
              <div className="flex items-center gap-2 mt-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  {customerPoints} {t('loyaltyPoints')} = ₹{(customerPoints / 10).toFixed(0)} {t('common:discount')}
                </span>
              </div>
            </div>
            <LoyaltyProgressRing 
              points={customerPoints} 
              tier={customerTier}
              nextTierPoints={customerTier === 'bronze' ? 500 : customerTier === 'silver' ? 2000 : 5000}
            />
          </div>
        </Card>

        {/* Gamification Banner */}
        <GamificationBanner
          currentStreak={calculateStreak()}
          pointsToNextReward={Math.max(0, 100 - (customerPoints % 100))}
          nextRewardName="₹10 Off"
          totalOrders={stats.totalOrders}
        />

        {/* Order Tracking */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t('upcomingDeliveries')}
          </h3>
          <OrderTrackingTimeline 
            orders={recentOrders}
            onRateOrder={(order) => {
              const fullOrder = recentOrders.find(o => o.id === order.id);
              if (fullOrder) setSelectedOrderToRate(fullOrder);
              setShowRateDelivery(true);
            }}
          />
        </div>

        {/* Quick Actions Grid */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">{t('quickActions')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <QuickActionCard
              icon={Plus}
              label={t('newSubscription')}
              description={t('addSubscription')}
              onClick={() => setShowRequestSubscription(true)}
              color="primary"
            />
            <QuickActionCard
              icon={Calendar}
              label={t('orderNow')}
              description={t('scheduledFor')}
              onClick={() => setShowScheduleDelivery(true)}
              color="accent"
            />
            <QuickActionCard
              icon={Pause}
              label={t('skipDelivery')}
              description={t('common:tomorrow')}
              onClick={() => setShowSkipDelivery(true)}
              color="warning"
            />
            <QuickActionCard
              icon={Gift}
              label={t('referFriend')}
              description={t('referralBonus')}
              onClick={() => setShowEnterReferral(true)}
              color="secondary"
              badge={t('common:new').toUpperCase()}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Subscriptions Tab Content
  const SubscriptionsContent = () => {
    const pendingSubscriptions = subscriptions.filter(sub => sub.status === 'pending');
    const otherSubscriptions = subscriptions.filter(sub => sub.status !== 'pending');

    return (
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="space-y-4 px-4 pb-20">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">{t('subscriptions')}</h2>
            <Button size="sm" onClick={() => setShowRequestSubscription(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('common:new')}
            </Button>
          </div>

          {pendingSubscriptions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-amber-600">{t('common:pending')}</h3>
              {pendingSubscriptions.map((sub) => (
                <SubscriptionSwipeCard
                  key={sub.id}
                  subscription={sub}
                  onPause={() => {}}
                  onResume={() => {}}
                />
              ))}
            </div>
          )}

          {otherSubscriptions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">{t('activeSubscriptions')} & {t('pausedSubscriptions')}</h3>
              {otherSubscriptions.map((sub) => (
                <SubscriptionSwipeCard
                  key={sub.id}
                  subscription={sub}
                  onPause={() => toggleSubscription(sub.id, 'pause')}
                  onResume={() => toggleSubscription(sub.id, 'resume')}
                />
              ))}
            </div>
          )}

          {subscriptions.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground mb-4">{t('noSubscriptions')}</p>
              <Button onClick={() => setShowRequestSubscription(true)}>
                {t('addSubscription')}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    );
  };

  // Orders Tab Content
  const OrdersContent = () => (
    <ScrollArea className="h-[calc(100vh-180px)]">
      <div className="space-y-4 px-4 pb-20">
        <h2 className="text-xl font-bold text-foreground">{t('orderHistory')}</h2>

        {recentOrders.length > 0 ? (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <Card key={order.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2.5 rounded-xl bg-primary/10">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">
                        {order.products.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {t('productQuantity')}: {order.quantity} • {new Date(order.delivery_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-semibold text-foreground">₹{order.total_price}</p>
                    <Badge variant={
                      order.status === 'delivered' ? 'default' :
                      order.status === 'pending' ? 'secondary' : 'destructive'
                    }>
                      {order.status === 'delivered' ? t('delivered') : 
                       order.status === 'pending' ? t('common:pending') : 
                       t('common:notDelivered')}
                    </Badge>
                  </div>
                </div>
                {order.status === 'delivered' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full"
                    onClick={() => {
                      setSelectedOrderToRate(order);
                      setShowRateDelivery(true);
                    }}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    {t('rateDelivery')}
                  </Button>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <History className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground">{t('common:noOrdersYet')}</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );

  // Rewards Tab Content
  const RewardsContent = () => (
    <ScrollArea className="h-[calc(100vh-180px)]">
      <div className="space-y-5 px-4 pb-20">
        <h2 className="text-xl font-bold text-foreground">{t('rewards')} & {t('yourLoyalty')}</h2>

        {/* Tier Benefits */}
        <TierBenefits currentTier={customerTier} currentPoints={customerPoints} />

        {/* Milestone Badges */}
        <MilestoneBadges customerId={user?.id || ''} />

        {/* Upcoming Rewards */}
        <UpcomingRewards customerId={user?.id || ''} />

        {/* Referral Card */}
        <ReferralCard customerId={user?.id || ''} />
      </div>
    </ScrollArea>
  );

  // Profile Tab Content
  const ProfileContent = () => (
    <ScrollArea className="h-[calc(100vh-180px)]">
      <div className="space-y-5 px-4 pb-20">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src="" />
              <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">
                {customerData?.name?.charAt(0) || user?.name?.charAt(0) || 'C'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground truncate">
                {customerData?.name || user?.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{t('common:profile')}</Badge>
                <Badge 
                  variant={customerData?.status === 'active' ? 'default' : 'destructive'}
                  className="capitalize"
                >
                  {t(customerTier)}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 text-center">
            <CreditCard className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">₹{stats.monthlySpend}</p>
            <p className="text-xs text-muted-foreground">{t('common:thisMonth')}</p>
          </Card>
          <Card className="p-4 text-center">
            <Package className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
            <p className="text-xs text-muted-foreground">{t('common:total')} {t('orders')}</p>
          </Card>
        </div>

        {/* Contact Info */}
        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-4">{t('common:details')}</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted/50">
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">{customerData?.phone}</p>
                <p className="text-xs text-muted-foreground">{t('common:phone')}</p>
              </div>
            </div>
            {customerData?.email && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted/50">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{customerData.email}</p>
                  <p className="text-xs text-muted-foreground">{t('common:email')}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted/50">
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">{customerData?.address}</p>
                {customerData?.area && (
                  <p className="text-xs text-muted-foreground">{customerData.area}</p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4 mr-3" />
            {t('common:settings')}
          </Button>
          <Button 
            variant="destructive" 
            className="w-full justify-start"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 mr-3" />
            {t('common:logout')}
          </Button>
        </div>
      </div>
    </ScrollArea>
  );

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <HomeContent />;
      case 'subscriptions': return <SubscriptionsContent />;
      case 'orders': return <OrdersContent />;
      case 'rewards': return <RewardsContent />;
      case 'profile': return <ProfileContent />;
      default: return <HomeContent />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <PersonalizedGreeting
        userName={user?.name || 'Customer'}
        notificationCount={subscriptions.filter(s => s.status === 'pending').length}
        onSettingsClick={() => setShowSettings(true)}
      />

      {/* Main Content */}
      <main className="pb-20">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <CustomerBottomNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
      />
      
      {/* Modals */}
      <RequestSubscriptionModal
        isOpen={showRequestSubscription}
        onClose={() => setShowRequestSubscription(false)}
        onSubscriptionRequested={() => {
          fetchSubscriptions();
          toast({
            title: t('common:success'),
            description: t('common:subscriptionRequested')
          });
        }}
      />

      <ScheduleDeliveryModal
        isOpen={showScheduleDelivery}
        onClose={() => setShowScheduleDelivery(false)}
        onDeliveryScheduled={() => {
          fetchRecentOrders();
          toast({
            title: t('common:success'),
            description: t('scheduledFor')
          });
        }}
      />

      <SkipDeliveryModal
        isOpen={showSkipDelivery}
        onClose={() => setShowSkipDelivery(false)}
        onDeliverySkipped={() => {
          fetchSubscriptions();
        }}
      />

      <SettingsModal
        open={showSettings}
        onOpenChange={setShowSettings}
      />

      <RateDeliveryModal
        isOpen={showRateDelivery}
        onClose={() => {
          setShowRateDelivery(false);
          setSelectedOrderToRate(null);
        }}
        order={selectedOrderToRate}
        customerId={user?.id || ''}
      />

      <EnterReferralModal
        open={showEnterReferral}
        onOpenChange={setShowEnterReferral}
        customerId={user?.id || ''}
        onSuccess={() => {
          toast({
            title: t('common:success'),
            description: t('referralBonus')
          });
        }}
      />
    </div>
  );
};
