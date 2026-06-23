import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar as CalendarIcon, Clock, Loader2, Gift } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { SuccessOverlay } from '@/components/ui/success-animation';

interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
}

interface ScheduleDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeliveryScheduled?: () => void;
}

export const ScheduleDeliveryModal = ({ isOpen, onClose, onDeliveryScheduled }: ScheduleDeliveryModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [fetchingProducts, setFetchingProducts] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [dairyId, setDairyId] = useState<string>('');
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: 1,
    delivery_date: undefined as Date | undefined,
    delivery_time: '08:00',
    special_instructions: ''
  });

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchCustomerDairy();
    }
  }, [isOpen, user?.id]);

  useEffect(() => {
    if (dairyId) {
      fetchProducts();
    }
  }, [dairyId]);

  const fetchCustomerDairy = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('dairy_id, loyalty_points')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      if (data?.dairy_id) {
        setDairyId(data.dairy_id);
        setLoyaltyPoints(data.loyalty_points || 0);
      }
    } catch (error) {
      console.error('Error fetching customer dairy:', error);
      toast({
        title: "Error",
        description: "Failed to load your dairy information",
        variant: "destructive"
      });
    }
  };

  const fetchProducts = async () => {
    setFetchingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, unit, price')
        .eq('dairy_id', dairyId)
        .gt('stock_quantity', 0)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load available products",
        variant: "destructive"
      });
    } finally {
      setFetchingProducts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.product_id || !formData.delivery_date) {
      toast({
        title: "Validation Error",
        description: "Please select a product and delivery date",
        variant: "destructive"
      });
      return;
    }

    if (pointsToRedeem > loyaltyPoints) {
      toast({
        title: "Invalid Points",
        description: "You don't have enough points to redeem",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const selectedProduct = products.find(p => p.id === formData.product_id);
      if (!selectedProduct) throw new Error('Product not found');

      const subtotal = selectedProduct.price * formData.quantity;
      const discount = Math.floor(pointsToRedeem / 10); // 10 points = ₹1
      const totalPrice = Math.max(0, subtotal - discount);
      const pointsEarned = Math.floor(totalPrice / 10); // 1 point per ₹10 spent

      // Insert order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user?.id,
          dairy_id: dairyId,
          product_id: formData.product_id,
          quantity: formData.quantity,
          price: selectedProduct.price,
          total_price: totalPrice,
          points_earned: pointsEarned,
          points_redeemed: pointsToRedeem,
          discount_applied: discount,
          delivery_date: format(formData.delivery_date, 'yyyy-MM-dd'),
          delivery_time: formData.delivery_time,
          special_instructions: formData.special_instructions || null,
          order_type: 'one_time',
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // If points were redeemed, update customer points and create transaction
      if (pointsToRedeem > 0) {
        const newBalance = loyaltyPoints - pointsToRedeem;

        // Update customer loyalty points
        const { error: updateError } = await supabase
          .from('customers')
          .update({ loyalty_points: newBalance })
          .eq('id', user?.id);

        if (updateError) throw updateError;

        // Create points transaction
        const { error: transactionError } = await supabase
          .from('points_transactions')
          .insert({
            customer_id: user?.id,
            order_id: orderData.id,
            transaction_type: 'redeemed',
            points: -pointsToRedeem,
            balance_after: newBalance,
            description: `Redeemed ${pointsToRedeem} points for ₹${discount} discount`
          });

        if (transactionError) throw transactionError;
      }

      // Show success animation
      setSuccessMessage(pointsToRedeem > 0 
        ? `Delivery scheduled! You saved ₹${discount} with ${pointsToRedeem} points.`
        : "Your delivery has been scheduled successfully");
      setShowSuccess(true);
    } catch (error) {
      console.error('Error scheduling delivery:', error);
      toast({
        title: "Error",
        description: "Failed to schedule delivery. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find(p => p.id === formData.product_id);
  const subtotal = selectedProduct ? selectedProduct.price * formData.quantity : 0;
  const maxRedeemablePoints = Math.min(loyaltyPoints, subtotal * 10); // Can't redeem more than order value
  const discount = Math.floor(pointsToRedeem / 10);
  const estimatedPrice = Math.max(0, subtotal - discount);
  const willEarnPoints = Math.floor(estimatedPrice / 10);

  const handleSuccessComplete = () => {
    setShowSuccess(false);
    toast({
      title: "Success",
      description: successMessage
    });
    onDeliveryScheduled?.();
    onClose();
    setFormData({
      product_id: '',
      quantity: 1,
      delivery_date: undefined,
      delivery_time: '08:00',
      special_instructions: ''
    });
    setPointsToRedeem(0);
  };

  return (
    <>
      <SuccessOverlay 
        show={showSuccess} 
        message={successMessage}
        type="points"
        onComplete={handleSuccessComplete}
      />
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule One-Time Delivery</DialogTitle>
            <DialogDescription>
              Place a one-time order for immediate delivery
            </DialogDescription>
          </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product">Product *</Label>
            <Select 
              value={formData.product_id} 
              onValueChange={(value) => setFormData({ ...formData, product_id: value })}
              disabled={fetchingProducts || products.length === 0}
            >
              <SelectTrigger id="product">
                <SelectValue placeholder={fetchingProducts ? "Loading products..." : "Select a product"} />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} - ₹{product.price}/{product.unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {products.length === 0 && !fetchingProducts && (
              <p className="text-sm text-muted-foreground">No products available</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Delivery Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.delivery_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.delivery_date ? format(formData.delivery_date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.delivery_date}
                  onSelect={(date) => setFormData({ ...formData, delivery_date: date })}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery_time">Preferred Delivery Time</Label>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                id="delivery_time"
                type="time"
                value={formData.delivery_time}
                onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Special Instructions</Label>
            <Textarea
              id="instructions"
              placeholder="Add any special delivery instructions..."
              value={formData.special_instructions}
              onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
              rows={3}
            />
          </div>

          {loyaltyPoints > 0 && subtotal > 0 && (
            <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between">
                <Label htmlFor="points">Redeem Loyalty Points</Label>
                <span className="text-sm text-muted-foreground">
                  Available: {loyaltyPoints} points
                </span>
              </div>
              <Input
                id="points"
                type="number"
                min="0"
                max={maxRedeemablePoints}
                step="10"
                value={pointsToRedeem}
                onChange={(e) => setPointsToRedeem(Math.min(parseInt(e.target.value) || 0, maxRedeemablePoints))}
                placeholder="Enter points to redeem (10 points = ₹1)"
              />
              {pointsToRedeem > 0 && (
                <p className="text-sm text-green-600 font-medium">
                  You'll save ₹{discount} with {pointsToRedeem} points
                </p>
              )}
            </div>
          )}

          {estimatedPrice >= 0 && selectedProduct && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Points Discount:</span>
                  <span>-₹{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total:</span>
                <span>₹{estimatedPrice.toFixed(2)}</span>
              </div>
              {willEarnPoints > 0 && (
                <p className="text-xs text-muted-foreground pt-1">
                  You'll earn {willEarnPoints} points from this order
                </p>
              )}
            </div>
          )}

          <div className="flex space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading || products.length === 0} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule Delivery
            </Button>
          </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};