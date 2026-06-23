import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, CheckCircle, Clock, Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SuccessOverlay } from '@/components/ui/success-animation';

interface Delivery {
  id: string;
  customerName: string;
  address: string;
  status: 'pending' | 'delivered' | 'not_delivered' | 'out_for_delivery';
}

interface RouteViewProps {
  deliveries: Delivery[];
  onRouteStarted?: () => void;
}

export const RouteView = ({ deliveries, onRouteStarted }: RouteViewProps) => {
  const { toast } = useToast();
  const [isStartingRoute, setIsStartingRoute] = useState(false);
  const [routeStarted, setRouteStarted] = useState(false);
  const [showRouteSuccess, setShowRouteSuccess] = useState(false);

  const pendingDeliveries = deliveries.filter(d => d.status === 'pending');
  const hasStartedRoute = deliveries.some(d => d.status === 'out_for_delivery') || routeStarted;

  const startRoute = async () => {
    if (pendingDeliveries.length === 0) return;

    setIsStartingRoute(true);
    try {
      // Get all pending order IDs with customer info
      const pendingOrderIds = pendingDeliveries.map(d => d.id);
      
      // Fetch customer IDs and product names for all pending orders
      const { data: ordersData, error: fetchError } = await supabase
        .from('orders')
        .select('id, customer_id, products(name)')
        .in('id', pendingOrderIds);

      if (fetchError) throw fetchError;

      // Update all pending orders to out_for_delivery
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'out_for_delivery' })
        .in('id', pendingOrderIds);

      if (updateError) throw updateError;

      // Send push notifications to all customers
      if (ordersData && ordersData.length > 0) {
        const notificationPromises = ordersData.map(order => 
          supabase.functions.invoke('send-push-notification', {
            body: {
              user_id: order.customer_id,
              title: '🚚 Out for Delivery!',
              message: `Your ${order.products?.name || 'order'} is on its way! Our delivery partner is en route.`,
              type: 'info',
              category: 'delivery',
              actionPath: '/'
            }
          }).catch(err => console.error('Notification error for order:', order.id, err))
        );

        await Promise.allSettled(notificationPromises);
      }

      setRouteStarted(true);
      setShowRouteSuccess(true);
    } catch (error) {
      console.error('Error starting route:', error);
      toast({
        title: "Error",
        description: "Failed to start route. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsStartingRoute(false);
    }
  };

  // Group by sector
  const getRouteGroups = () => {
    const groups: { [key: string]: Delivery[] } = {};
    
    deliveries.forEach(delivery => {
      const match = delivery.address.match(/Sector (\d+)/);
      const sector = match ? `Sector ${match[1]}` : 'Other Areas';
      
      if (!groups[sector]) groups[sector] = [];
      groups[sector].push(delivery);
    });
    
    return groups;
  };

  const routeGroups = getRouteGroups();
  const sectors = Object.keys(routeGroups);

  const handleRouteSuccessComplete = () => {
    setShowRouteSuccess(false);
    toast({
      title: "Route Started!",
      description: `${pendingDeliveries.length} customers notified that their orders are on the way.`
    });
    onRouteStarted?.();
  };

  return (
    <>
      <SuccessOverlay 
        show={showRouteSuccess} 
        message="Route Started! Customers Notified" 
        type="celebration"
        onComplete={handleRouteSuccessComplete}
      />
      <div className="p-4 space-y-4">
      {/* Route Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Optimized Route</h2>
          <p className="text-sm text-muted-foreground">{sectors.length} areas to cover</p>
        </div>
        {hasStartedRoute ? (
          <Badge className="bg-success/20 text-success border-success/20">
            <Navigation className="h-3 w-3 mr-1" />
            Route Active
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            <Navigation className="h-3 w-3 mr-1" />
            GPS Ready
          </Badge>
        )}
      </div>

      {/* Start Route Button */}
      {pendingDeliveries.length > 0 && !hasStartedRoute && (
        <Button 
          onClick={startRoute} 
          disabled={isStartingRoute}
          className="w-full gap-2"
          size="lg"
        >
          {isStartingRoute ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Notifying Customers...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Start Route ({pendingDeliveries.length} deliveries)
            </>
          )}
        </Button>
      )}

      {/* Route Timeline */}
      <div className="space-y-4">
        {sectors.map((sector, sectorIndex) => {
          const sectorDeliveries = routeGroups[sector];
          const completedCount = sectorDeliveries.filter(d => d.status === 'delivered').length;
          const isComplete = completedCount === sectorDeliveries.length;

          return (
            <Card 
              key={sector} 
              className={cn(
                "overflow-hidden transition-all",
                isComplete && "opacity-60"
              )}
            >
              <CardContent className="p-0">
                {/* Sector Header */}
                <div className={cn(
                  "flex items-center justify-between p-3",
                  isComplete ? "bg-success/10" : "bg-primary/5"
                )}>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      isComplete 
                        ? "bg-success text-success-foreground" 
                        : "bg-primary text-primary-foreground"
                    )}>
                      {isComplete ? <CheckCircle className="h-4 w-4" /> : sectorIndex + 1}
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{sector}</h3>
                      <p className="text-xs text-muted-foreground">
                        {completedCount}/{sectorDeliveries.length} delivered
                      </p>
                    </div>
                  </div>
                  {!isComplete && (
                    <Badge variant="outline" className="text-xs">
                      {sectorDeliveries.length - completedCount} left
                    </Badge>
                  )}
                </div>

                {/* Deliveries in Sector */}
                <div className="divide-y divide-border/50">
                  {sectorDeliveries.map((delivery, idx) => (
                    <div 
                      key={delivery.id}
                      className={cn(
                        "flex items-center gap-3 p-3 pl-6",
                        delivery.status === 'delivered' && "bg-success/5"
                      )}
                    >
                      <div className="relative">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                          delivery.status === 'delivered' 
                            ? "bg-success text-success-foreground" 
                            : delivery.status === 'not_delivered'
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {delivery.status === 'delivered' ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : delivery.status === 'not_delivered' ? (
                            '✕'
                          ) : (
                            idx + 1
                          )}
                        </div>
                        {idx < sectorDeliveries.length - 1 && (
                          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-border" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          delivery.status === 'delivered' ? "text-muted-foreground line-through" : "text-foreground"
                        )}>
                          {delivery.customerName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {delivery.address}
                        </p>
                      </div>
                      {delivery.status === 'pending' && (
                        <Clock className="h-4 w-4 text-warning" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {deliveries.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No deliveries scheduled for today</p>
        </div>
      )}
      </div>
    </>
  );
};
