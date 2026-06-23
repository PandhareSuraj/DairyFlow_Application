import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Loader2, AlertCircle, Package } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';

interface Subscription {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
  next_delivery_date: string;
  frequency: string;
}

interface SkipDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeliverySkipped?: () => void;
}

export const SkipDeliveryModal = ({ isOpen, onClose, onDeliverySkipped }: SkipDeliveryModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchingSubscriptions, setFetchingSubscriptions] = useState(false);
  const [upcomingSubscriptions, setUpcomingSubscriptions] = useState<Subscription[]>([]);
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchUpcomingSubscriptions();
    }
  }, [isOpen, user?.id]);

  const fetchUpcomingSubscriptions = async () => {
    setFetchingSubscriptions(true);
    try {
      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('customer_subscriptions')
        .select(`
          id,
          product_id,
          quantity,
          next_delivery_date,
          frequency
        `)
        .eq('customer_id', user?.id)
        .eq('status', 'active')
        .eq('next_delivery_date', tomorrow);

      if (error) throw error;

      // Fetch product details
      const subscriptionsWithProducts = await Promise.all(
        (data || []).map(async (subscription) => {
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('name, unit')
            .eq('id', subscription.product_id)
            .single();

          if (productError) {
            console.error('Error fetching product:', productError);
            return {
              ...subscription,
              product_name: 'Unknown Product',
              unit: ''
            };
          }

          return {
            ...subscription,
            product_name: product.name,
            unit: product.unit
          };
        })
      );

      setUpcomingSubscriptions(subscriptionsWithProducts);
    } catch (error) {
      console.error('Error fetching upcoming subscriptions:', error);
      toast({
        title: "Error",
        description: "Failed to load tomorrow's deliveries",
        variant: "destructive"
      });
    } finally {
      setFetchingSubscriptions(false);
    }
  };

  const handleToggleSubscription = (subscriptionId: string) => {
    setSelectedSubscriptions(prev => 
      prev.includes(subscriptionId)
        ? prev.filter(id => id !== subscriptionId)
        : [...prev, subscriptionId]
    );
  };

  const calculateNextDeliveryDate = (frequency: string, currentDate: string): string => {
    const current = parseISO(currentDate);
    
    switch (frequency) {
      case 'daily':
        return format(addDays(current, 1), 'yyyy-MM-dd');
      case 'alternate_days':
        return format(addDays(current, 2), 'yyyy-MM-dd');
      case 'weekly':
        return format(addDays(current, 7), 'yyyy-MM-dd');
      default:
        return format(addDays(current, 1), 'yyyy-MM-dd');
    }
  };

  const handleSkipDeliveries = async () => {
    if (selectedSubscriptions.length === 0) {
      toast({
        title: "Selection Required",
        description: "Please select at least one delivery to skip",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Update each selected subscription's next_delivery_date
      const updates = selectedSubscriptions.map(subscriptionId => {
        const subscription = upcomingSubscriptions.find(s => s.id === subscriptionId);
        if (!subscription) return null;

        const newDeliveryDate = calculateNextDeliveryDate(
          subscription.frequency,
          subscription.next_delivery_date
        );

        return supabase
          .from('customer_subscriptions')
          .update({
            next_delivery_date: newDeliveryDate,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscriptionId);
      });

      const results = await Promise.all(updates.filter(Boolean));
      
      const hasError = results.some(result => result.error);
      if (hasError) {
        throw new Error('Some updates failed');
      }

      toast({
        title: "Success",
        description: `Skipped ${selectedSubscriptions.length} delivery(ies) for tomorrow`
      });

      onDeliverySkipped?.();
      onClose();
      setSelectedSubscriptions([]);
    } catch (error) {
      console.error('Error skipping deliveries:', error);
      toast({
        title: "Error",
        description: "Failed to skip deliveries. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Skip Tomorrow's Deliveries</DialogTitle>
          <DialogDescription>
            Select which deliveries you'd like to skip for tomorrow
          </DialogDescription>
        </DialogHeader>

        {fetchingSubscriptions ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : upcomingSubscriptions.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No deliveries scheduled for tomorrow</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start space-x-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Skipped deliveries will be rescheduled based on your subscription frequency
              </p>
            </div>

            <div className="space-y-3">
              {upcomingSubscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleToggleSubscription(subscription.id)}
                >
                  <Checkbox
                    id={subscription.id}
                    checked={selectedSubscriptions.includes(subscription.id)}
                    onCheckedChange={() => handleToggleSubscription(subscription.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{subscription.product_name}</p>
                      </div>
                      <Badge variant="secondary">{subscription.frequency}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Quantity: {subscription.quantity} {subscription.unit}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Scheduled: {format(parseISO(subscription.next_delivery_date), 'PPP')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {selectedSubscriptions.length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">
                  {selectedSubscriptions.length} delivery(ies) selected to skip
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleSkipDeliveries} 
            disabled={loading || upcomingSubscriptions.length === 0 || selectedSubscriptions.length === 0} 
            className="flex-1"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Skip Selected
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};