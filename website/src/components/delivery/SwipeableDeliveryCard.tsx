import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  XCircle, 
  MapPin, 
  Phone, 
  Clock,
  User,
  MessageCircle,
  ChevronRight,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SuccessAnimation } from '@/components/ui/success-animation';

interface Product {
  name: string;
  quantity: number;
  unit: string;
}

interface SwipeableDeliveryCardProps {
  id: string;
  index: number;
  customerName: string;
  customerPhone: string;
  address: string;
  products: Product[];
  status: 'pending' | 'delivered' | 'not_delivered' | 'out_for_delivery';
  scheduledTime: string;
  remarks?: string;
  adjustedQuantities: { [productName: string]: number };
  onMarkDelivered: (id: string) => void;
  onMarkNotDelivered: (id: string) => void;
  onUpdateRemarks: (id: string, value: string) => void;
  onUpdateQuantity: (id: string, productName: string, quantity: number) => void;
  localRemarks: string;
}

export const SwipeableDeliveryCard = ({
  id,
  index,
  customerName,
  customerPhone,
  address,
  products,
  status,
  scheduledTime,
  remarks,
  adjustedQuantities,
  onMarkDelivered,
  onMarkNotDelivered,
  onUpdateRemarks,
  onUpdateQuantity,
  localRemarks
}: SwipeableDeliveryCardProps) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isExpanded, setIsExpanded] = useState(status === 'pending');
  const [showDeliveredAnimation, setShowDeliveredAnimation] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (status !== 'pending') return;
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (status !== 'pending') return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    // Only allow right swipe for delivered
    if (diff > 0 && diff < 100) {
      setSwipeOffset(diff);
    }
    // Only allow left swipe for not delivered
    if (diff < 0 && diff > -100) {
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    if (status !== 'pending') return;
    if (swipeOffset > 80) {
      setShowDeliveredAnimation(true);
      setTimeout(() => {
        setShowDeliveredAnimation(false);
        onMarkDelivered(id);
      }, 800);
    } else if (swipeOffset < -80) {
      onMarkNotDelivered(id);
    }
    setSwipeOffset(0);
  };

  const handleDeliveredClick = () => {
    setShowDeliveredAnimation(true);
    setTimeout(() => {
      setShowDeliveredAnimation(false);
      onMarkDelivered(id);
    }, 800);
  };

  const getStatusStyles = () => {
    switch (status) {
      case 'delivered':
        return 'border-l-4 border-l-success bg-success/5';
      case 'not_delivered':
        return 'border-l-4 border-l-destructive bg-destructive/5';
      default:
        return 'border-l-4 border-l-primary';
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Success Animation Overlay */}
      {showDeliveredAnimation && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
          <SuccessAnimation type="check" size="md" />
        </div>
      )}
      
      {/* Swipe Action Indicators */}
      {status === 'pending' && (
        <>
          <div 
            className={cn(
              "absolute inset-y-0 left-0 flex items-center justify-start pl-4 bg-success transition-opacity",
              swipeOffset > 40 ? "opacity-100" : "opacity-0"
            )}
            style={{ width: Math.max(0, swipeOffset) }}
          >
            <CheckCircle className="h-6 w-6 text-success-foreground" />
          </div>
          <div 
            className={cn(
              "absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-destructive transition-opacity",
              swipeOffset < -40 ? "opacity-100" : "opacity-0"
            )}
            style={{ width: Math.max(0, -swipeOffset) }}
          >
            <XCircle className="h-6 w-6 text-destructive-foreground" />
          </div>
        </>
      )}

      <Card 
        className={cn(
          "relative transition-all duration-200 shadow-soft",
          getStatusStyles()
        )}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <CardContent className="p-4">
          {/* Header Row */}
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold">
                  {index}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{customerName}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{scheduledTime}</span>
                  <span>•</span>
                  <Package className="h-3 w-3" />
                  <span>{products.length} item{products.length > 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                className={cn(
                  "text-xs",
                  status === 'delivered' ? 'bg-success text-success-foreground' :
                  status === 'not_delivered' ? 'bg-destructive text-destructive-foreground' :
                  'bg-warning text-warning-foreground'
                )}
              >
                {status === 'delivered' ? 'Done' :
                 status === 'not_delivered' ? 'Failed' :
                 'Pending'}
              </Badge>
              <ChevronRight 
                className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform",
                  isExpanded && "rotate-90"
                )} 
              />
            </div>
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="mt-4 space-y-4 animate-fade-in">
              {/* Contact & Address */}
              <div className="space-y-2">
                <a 
                  href={`tel:${customerPhone}`} 
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {customerPhone}
                </a>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{address}</span>
                </div>
              </div>

              {/* Products */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Products
                </Label>
                {products.map((product, idx) => {
                  const adjustedQty = adjustedQuantities[product.name] ?? product.quantity;
                  const hasAdjustment = adjustedQuantities[product.name] !== undefined;

                  return (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <span className="text-sm font-medium text-foreground">{product.name}</span>
                        <div className="text-xs text-muted-foreground">
                          {hasAdjustment ? (
                            <>
                              <span className="line-through">{product.quantity}</span>
                              <span className="text-warning ml-1">→ {adjustedQty}</span>
                            </>
                          ) : (
                            product.quantity
                          )} {product.unit}
                        </div>
                      </div>
                      {status === 'pending' && (
                        <Input
                          type="number"
                          step="0.1"
                          className="w-20 h-8 text-center text-sm"
                          value={adjustedQty}
                          onChange={(e) => onUpdateQuantity(id, product.name, parseFloat(e.target.value) || product.quantity)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Remarks */}
              {status === 'pending' && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    Remarks
                  </Label>
                  <Textarea
                    placeholder="Add delivery notes..."
                    value={localRemarks}
                    onChange={(e) => onUpdateRemarks(id, e.target.value)}
                    className="min-h-[60px] text-sm"
                  />
                </div>
              )}

              {/* Completed Remarks Display */}
              {status !== 'pending' && remarks && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <Label className="text-xs font-medium text-muted-foreground">Remarks:</Label>
                  <p className="text-sm text-foreground mt-1">{remarks}</p>
                </div>
              )}

              {/* Action Buttons */}
              {status === 'pending' && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button 
                    onClick={handleDeliveredClick}
                    className="bg-success hover:bg-success/90 text-success-foreground"
                    size="lg"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Delivered
                  </Button>
                  <Button 
                    onClick={() => onMarkNotDelivered(id)}
                    variant="destructive"
                    size="lg"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Failed
                  </Button>
                </div>
              )}

              {/* Swipe Hint for Mobile */}
              {status === 'pending' && (
                <p className="text-xs text-center text-muted-foreground">
                  Swipe right to deliver • Swipe left to mark failed
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
