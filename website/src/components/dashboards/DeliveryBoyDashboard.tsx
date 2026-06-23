import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { SwipeableDeliveryCard } from '@/components/delivery/SwipeableDeliveryCard';
import { BottomNavigation } from '@/components/delivery/BottomNavigation';
import { DeliveryStats } from '@/components/delivery/DeliveryStats';
import { EarningsPanel } from '@/components/delivery/EarningsPanel';
import { RouteView } from '@/components/delivery/RouteView';
import { ProfilePanel } from '@/components/delivery/ProfilePanel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Package, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePullToRefresh, PullToRefreshIndicator } from '@/hooks/usePullToRefresh';
import { SkeletonCard, SkeletonStats } from '@/components/ui/skeleton-card';

interface Delivery {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
  products: { name: string; quantity: number; unit: string }[];
  status: 'pending' | 'delivered' | 'not_delivered' | 'out_for_delivery';
  scheduledTime: string;
  remarks?: string;
}

export const DeliveryBoyDashboard = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('deliveries');
  const [remarks, setRemarks] = useState<{ [key: string]: string }>({});
  const [adjustedQuantities, setAdjustedQuantities] = useState<{ [key: string]: { [productName: string]: number } }>({});

  useEffect(() => {
    if (user?.id) {
      fetchDeliveries();
    }
  }, [user]);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          quantity,
          delivery_date,
          delivery_time,
          status,
          special_instructions,
          customers (name, phone, address),
          products (name, unit)
        `)
        .eq('delivery_boy_id', user?.id)
        .eq('delivery_date', new Date().toISOString().split('T')[0])
        .order('delivery_time', { ascending: true });

      if (error) throw error;

      const transformedDeliveries: Delivery[] = (data || []).map((order: any) => ({
        id: order.id,
        customerName: order.customers?.name || 'Unknown',
        customerPhone: order.customers?.phone || '',
        address: order.customers?.address || '',
        products: [{ 
          name: order.products?.name || 'Unknown', 
          quantity: order.quantity, 
          unit: order.products?.unit || 'unit' 
        }],
        status: order.status === 'out_for_delivery' ? 'pending' : order.status,
        scheduledTime: order.delivery_time || '08:00',
        remarks: order.special_instructions
      }));

      setDeliveries(transformedDeliveries);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      toast({
        title: "Error",
        description: "Failed to load deliveries",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateDeliveryStatus = async (deliveryId: string, status: 'delivered' | 'not_delivered') => {
    try {
      // First get the order details including customer_id
      const { data: orderData, error: fetchError } = await supabase
        .from('orders')
        .select('customer_id, products(name)')
        .eq('id', deliveryId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('orders')
        .update({ 
          status,
          special_instructions: remarks[deliveryId] || null
        })
        .eq('id', deliveryId);

      if (error) throw error;

      // Send push notification to customer
      if (orderData?.customer_id) {
        try {
          const notificationData = status === 'delivered' 
            ? {
                title: '🎉 Order Delivered!',
                message: `Your ${orderData.products?.name || 'order'} has been delivered successfully. Enjoy!`,
                type: 'success',
                category: 'delivery'
              }
            : {
                title: '📦 Delivery Update',
                message: `We couldn't deliver your ${orderData.products?.name || 'order'} today. We'll try again soon.`,
                type: 'warning',
                category: 'delivery'
              };

          await supabase.functions.invoke('send-push-notification', {
            body: {
              user_id: orderData.customer_id,
              ...notificationData,
              actionPath: '/'
            }
          });
        } catch (notifyError) {
          console.error('Error sending push notification:', notifyError);
        }
      }

      if (status === 'delivered') {
        try {
          await supabase.functions.invoke('award-loyalty-points', {
            body: { orderId: deliveryId }
          });
        } catch (pointsError) {
          console.error('Error awarding loyalty points:', pointsError);
        }
      }

      toast({
        title: status === 'delivered' ? "Delivered!" : "Marked as failed",
        description: status === 'delivered' 
          ? "Order marked as delivered and loyalty points awarded!"
          : "Order marked as not delivered"
      });

      setDeliveries(prev => prev.map(delivery => {
        if (delivery.id === deliveryId) {
          const updatedProducts = delivery.products.map(product => ({
            ...product,
            quantity: adjustedQuantities[deliveryId]?.[product.name] ?? product.quantity
          }));
          
          return { 
            ...delivery, 
            status, 
            remarks: remarks[deliveryId] || '',
            products: updatedProducts
          };
        }
        return delivery;
      }));
    } catch (error) {
      console.error('Error updating delivery status:', error);
      toast({
        title: "Error",
        description: "Failed to update delivery status",
        variant: "destructive"
      });
    }
  };

  const updateRemarks = (deliveryId: string, value: string) => {
    setRemarks(prev => ({ ...prev, [deliveryId]: value }));
  };

  const updateQuantity = (deliveryId: string, productName: string, newQuantity: number) => {
    setAdjustedQuantities(prev => ({
      ...prev,
      [deliveryId]: {
        ...prev[deliveryId],
        [productName]: newQuantity
      }
    }));
  };

  const getDeliveryStats = () => {
    const total = deliveries.length;
    const delivered = deliveries.filter(d => d.status === 'delivered').length;
    const pending = deliveries.filter(d => d.status === 'pending').length;
    const notDelivered = deliveries.filter(d => d.status === 'not_delivered').length;
    
    return { total, delivered, pending, notDelivered };
  };

  const getSortedDeliveries = () => {
    return [...deliveries].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      
      const getSectorNumber = (address: string) => {
        const match = address.match(/Sector (\d+)/);
        return match ? parseInt(match[1]) : 999;
      };
      
      return getSectorNumber(a.address) - getSectorNumber(b.address);
    });
  };

  const stats = getDeliveryStats();
  const pendingDeliveries = getSortedDeliveries().filter(d => d.status === 'pending');
  const completedDeliveries = getSortedDeliveries().filter(d => d.status !== 'pending');

  const handleLogout = async () => {
    await logout();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Pull to refresh for deliveries tab
  const handleRefresh = useCallback(async () => {
    await fetchDeliveries();
  }, []);

  const {
    pullDistance,
    isRefreshing,
    handlers: pullHandlers,
    containerRef: pullContainerRef
  } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    disabled: activeTab !== 'deliveries'
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'deliveries':
        return (
          <div 
            ref={pullContainerRef as React.RefObject<HTMLDivElement>}
            className="h-full overflow-auto relative"
            {...pullHandlers}
          >
            <PullToRefreshIndicator 
              pullDistance={pullDistance} 
              threshold={80} 
              isRefreshing={isRefreshing} 
            />
            <div 
              className="space-y-4 transition-transform"
              style={{ transform: `translateY(${Math.min(pullDistance, 60)}px)` }}
            >
              {/* Stats Widget */}
              <DeliveryStats 
                total={stats.total}
                delivered={stats.delivered}
                pending={stats.pending}
                notDelivered={stats.notDelivered}
              />

              {/* Pending Deliveries */}
              {pendingDeliveries.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4 text-warning" />
                      Pending ({pendingDeliveries.length})
                    </h3>
                  </div>
                  {pendingDeliveries.map((delivery, index) => (
                    <SwipeableDeliveryCard
                      key={delivery.id}
                      id={delivery.id}
                      index={index + 1}
                      customerName={delivery.customerName}
                      customerPhone={delivery.customerPhone}
                      address={delivery.address}
                      products={delivery.products}
                      status={delivery.status}
                      scheduledTime={delivery.scheduledTime}
                      remarks={delivery.remarks}
                      adjustedQuantities={adjustedQuantities[delivery.id] || {}}
                      localRemarks={remarks[delivery.id] || ''}
                      onMarkDelivered={(id) => updateDeliveryStatus(id, 'delivered')}
                      onMarkNotDelivered={(id) => updateDeliveryStatus(id, 'not_delivered')}
                      onUpdateRemarks={updateRemarks}
                      onUpdateQuantity={updateQuantity}
                    />
                  ))}
                </div>
              )}

              {/* Empty State */}
              {pendingDeliveries.length === 0 && !loading && (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">All done for today!</p>
                  <p className="text-sm">No pending deliveries</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'completed':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-success" />
              <h2 className="font-semibold text-foreground">Completed ({completedDeliveries.length})</h2>
            </div>
            {completedDeliveries.length > 0 ? (
              completedDeliveries.map((delivery, index) => (
                <SwipeableDeliveryCard
                  key={delivery.id}
                  id={delivery.id}
                  index={index + 1}
                  customerName={delivery.customerName}
                  customerPhone={delivery.customerPhone}
                  address={delivery.address}
                  products={delivery.products}
                  status={delivery.status}
                  scheduledTime={delivery.scheduledTime}
                  remarks={delivery.remarks}
                  adjustedQuantities={{}}
                  localRemarks=""
                  onMarkDelivered={() => {}}
                  onMarkNotDelivered={() => {}}
                  onUpdateRemarks={() => {}}
                  onUpdateQuantity={() => {}}
                />
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No completed deliveries yet</p>
              </div>
            )}
          </div>
        );

      case 'route':
        return <RouteView deliveries={deliveries} onRouteStarted={fetchDeliveries} />;

      case 'earnings':
        return <EarningsPanel deliveredToday={stats.delivered} totalDeliveries={stats.total} />;

      case 'profile':
        return <ProfilePanel onLogout={handleLogout} />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border px-4 py-3 safe-area-inset-top">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{getGreeting()}</p>
            <h1 className="text-xl font-bold text-foreground">{user?.name || 'Delivery Partner'}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchDeliveries}
              disabled={loading}
              className="h-9 w-9"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Badge className="bg-success/20 text-success border-success/20 text-xs">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <ScrollArea className="h-[calc(100vh-130px)]">
        <div className="p-4">
          {loading ? (
            <div className="space-y-4">
              <SkeletonStats count={4} />
              <SkeletonCard lines={3} />
              <SkeletonCard lines={3} />
              <SkeletonCard lines={3} />
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </ScrollArea>

      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        stats={{ pending: stats.pending, delivered: stats.delivered }}
      />
    </div>
  );
};
