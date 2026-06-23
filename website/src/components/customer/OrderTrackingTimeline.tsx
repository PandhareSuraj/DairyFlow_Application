import React from 'react';
import { cn } from '@/lib/utils';
import { Package, Truck, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';

interface Order {
  id: string;
  products: { name: string };
  quantity: number;
  status: string;
  delivery_date: string;
  total_price: number;
}

interface OrderTrackingTimelineProps {
  orders: Order[];
  onRateOrder?: (order: Order) => void;
}

const statusConfig = {
  pending: { 
    icon: Clock, 
    color: 'text-amber-500', 
    bg: 'bg-amber-500/10', 
    label: 'Pending',
    step: 1 
  },
  confirmed: { 
    icon: Package, 
    color: 'text-blue-500', 
    bg: 'bg-blue-500/10', 
    label: 'Confirmed',
    step: 2 
  },
  'out-for-delivery': { 
    icon: Truck, 
    color: 'text-primary', 
    bg: 'bg-primary/10', 
    label: 'Out for Delivery',
    step: 3 
  },
  delivered: { 
    icon: CheckCircle2, 
    color: 'text-emerald-500', 
    bg: 'bg-emerald-500/10', 
    label: 'Delivered',
    step: 4 
  },
  cancelled: { 
    icon: XCircle, 
    color: 'text-destructive', 
    bg: 'bg-destructive/10', 
    label: 'Cancelled',
    step: 0 
  },
};

function getDeliveryLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

export function OrderTrackingTimeline({ orders, onRateOrder }: OrderTrackingTimelineProps) {
  const upcomingOrders = orders
    .filter(o => ['pending', 'confirmed', 'out-for-delivery'].includes(o.status))
    .sort((a, b) => new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime());

  if (upcomingOrders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Truck className="h-12 w-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No upcoming deliveries</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {upcomingOrders.slice(0, 3).map((order, index) => {
        const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;
        const Icon = config.icon;
        const isOutForDelivery = order.status === 'out-for-delivery';

        return (
          <div 
            key={order.id}
            className={cn(
              "relative p-4 rounded-2xl border transition-all duration-300",
              isOutForDelivery 
                ? "bg-primary/5 border-primary/30 shadow-lg shadow-primary/10" 
                : "bg-card border-border/30"
            )}
          >
            {/* Pulse indicator for out-for-delivery */}
            {isOutForDelivery && (
              <div className="absolute -top-1 -right-1">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-primary" />
                </span>
              </div>
            )}

            <div className="flex items-start gap-4">
              {/* Status icon */}
              <div className={cn("p-3 rounded-xl", config.bg)}>
                <Icon className={cn("h-5 w-5", config.color)} />
              </div>

              {/* Order details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-foreground truncate">
                    {order.products.name}
                  </h4>
                  <span className="text-sm font-medium text-foreground whitespace-nowrap">
                    ₹{order.total_price}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground">
                    Qty: {order.quantity}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className={cn(
                    "text-sm font-medium",
                    isOutForDelivery ? "text-primary" : "text-muted-foreground"
                  )}>
                    {getDeliveryLabel(order.delivery_date)}
                  </span>
                </div>

                {/* Progress steps */}
                <div className="flex items-center gap-1 mt-3">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={cn(
                        "flex-1 h-1.5 rounded-full transition-all duration-500",
                        step <= config.step 
                          ? "bg-primary" 
                          : "bg-muted/50"
                      )}
                    />
                  ))}
                </div>
                
                <p className={cn("text-xs mt-2 font-medium", config.color)}>
                  {config.label}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
