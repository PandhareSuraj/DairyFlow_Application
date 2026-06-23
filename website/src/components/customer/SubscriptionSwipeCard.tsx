import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Calendar, Clock, Pause, Play, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, isToday, isTomorrow } from 'date-fns';

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

interface SubscriptionSwipeCardProps {
  subscription: Subscription;
  onPause: () => void;
  onResume: () => void;
}

function getDeliveryLabel(dateStr: string): { text: string; urgent: boolean } {
  const date = new Date(dateStr);
  if (isToday(date)) return { text: 'Today', urgent: true };
  if (isTomorrow(date)) return { text: 'Tomorrow', urgent: true };
  return { text: format(date, 'EEE, MMM d'), urgent: false };
}

export function SubscriptionSwipeCard({ subscription, onPause, onResume }: SubscriptionSwipeCardProps) {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [startX, setStartX] = useState(0);

  const deliveryInfo = getDeliveryLabel(subscription.next_delivery_date);
  const isPaused = subscription.status === 'paused';
  const isPending = subscription.status === 'pending';

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const diff = e.touches[0].clientX - startX;
    setSwipeX(Math.max(-80, Math.min(80, diff)));
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (Math.abs(swipeX) > 60) {
      if (swipeX > 0 && isPaused) {
        onResume();
      } else if (swipeX < 0 && !isPaused && !isPending) {
        onPause();
      }
    }
    setSwipeX(0);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Background actions */}
      <div className="absolute inset-y-0 left-0 w-20 flex items-center justify-center bg-emerald-500 rounded-l-2xl">
        <Play className="h-6 w-6 text-white" />
      </div>
      <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-amber-500 rounded-r-2xl">
        <Pause className="h-6 w-6 text-white" />
      </div>

      {/* Main card */}
      <div
        className={cn(
          "relative bg-card border border-border/30 p-4 transition-transform duration-200",
          isPaused && "opacity-60",
          isPending && "border-amber-500/30"
        )}
        style={{ transform: `translateX(${swipeX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-start gap-4">
          {/* Product icon */}
          <div className={cn(
            "p-3 rounded-xl",
            isPending ? "bg-amber-500/10" : "bg-primary/10"
          )}>
            <Package className={cn(
              "h-6 w-6",
              isPending ? "text-amber-500" : "text-primary"
            )} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold text-foreground truncate">
                {subscription.products.name}
              </h4>
              <Badge 
                variant={isPaused ? "secondary" : isPending ? "outline" : "default"}
                className={cn(
                  "text-xs",
                  isPending && "border-amber-500/50 text-amber-600"
                )}
              >
                {subscription.status}
              </Badge>
            </div>

            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>{subscription.quantity} {subscription.products.unit}</span>
              <span>•</span>
              <span>{subscription.frequency}</span>
              <span>•</span>
              <span className="font-medium text-foreground">₹{subscription.products.price}</span>
            </div>

            {!isPending && (
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-xs">
                  <Calendar className={cn(
                    "h-3.5 w-3.5",
                    deliveryInfo.urgent ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    deliveryInfo.urgent ? "text-primary font-medium" : "text-muted-foreground"
                  )}>
                    {deliveryInfo.text}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{subscription.delivery_time}</span>
                </div>
              </div>
            )}

            {isPending && (
              <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-600">Awaiting dairy owner approval</p>
              </div>
            )}
          </div>
        </div>

        {/* Swipe hint */}
        {!isPending && (
          <p className="text-[10px] text-center text-muted-foreground mt-3">
            Swipe {isPaused ? 'right to resume' : 'left to pause'}
          </p>
        )}
      </div>
    </div>
  );
}
