import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Clock, Package } from 'lucide-react';
import { SuccessOverlay } from '@/components/ui/success-animation';

interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
}

interface RequestSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscriptionRequested?: () => void;
}

export const RequestSubscriptionModal = ({ isOpen, onClose, onSubscriptionRequested }: RequestSubscriptionModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerDairyId, setCustomerDairyId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: 1,
    frequency: 'daily',
    start_date: new Date().toISOString().split('T')[0],
    delivery_time: '08:00',
    special_instructions: '',
    days_of_week: [] as string[]
  });

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchCustomerDairy();
    }
  }, [isOpen, user?.id]);

  useEffect(() => {
    if (customerDairyId) {
      fetchProducts();
    }
  }, [customerDairyId]);

  const fetchCustomerDairy = async () => {
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('dairy_id')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setCustomerDairyId(customer.dairy_id);
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
    if (!customerDairyId) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, unit, price')
        .eq('dairy_id', customerDairyId)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id || !customerDairyId) {
      toast({
        title: "Error",
        description: "User information not available",
        variant: "destructive"
      });
      return;
    }

    if (!formData.product_id) {
      toast({
        title: "Error",
        description: "Please select a product",
        variant: "destructive"
      });
      return;
    }

    if (formData.frequency === 'custom' && formData.days_of_week.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one day for custom frequency",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('customer_subscriptions')
        .insert({
          customer_id: user.id,
          dairy_id: customerDairyId,
          product_id: formData.product_id,
          quantity: formData.quantity,
          frequency: formData.frequency,
          start_date: formData.start_date,
          next_delivery_date: formData.start_date,
          delivery_time: formData.delivery_time,
          days_of_week: formData.frequency === 'custom' ? formData.days_of_week : null,
          special_instructions: formData.special_instructions || null,
          status: 'pending'
        });

      if (error) throw error;

      // Show success animation
      setShowSuccess(true);
    } catch (error) {
      console.error('Error requesting subscription:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to request subscription",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day]
    }));
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const selectedProduct = products.find(p => p.id === formData.product_id);
  const estimatedPrice = selectedProduct ? selectedProduct.price * formData.quantity : 0;

  const handleSuccessComplete = () => {
    setShowSuccess(false);
    toast({
      title: "Subscription Requested!",
      description: "Your subscription request has been submitted and is waiting for dairy owner approval.",
    });
    setFormData({
      product_id: '',
      quantity: 1,
      frequency: 'daily',
      start_date: new Date().toISOString().split('T')[0],
      delivery_time: '08:00',
      special_instructions: '',
      days_of_week: []
    });
    onSubscriptionRequested?.();
    onClose();
  };

  return (
    <>
      <SuccessOverlay 
        show={showSuccess} 
        message="Subscription Request Submitted!" 
        type="celebration"
        onComplete={handleSuccessComplete}
      />
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request New Subscription</DialogTitle>
          <DialogDescription>
            Submit a subscription request for dairy owner approval
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product_id">
              <Package className="h-4 w-4 inline mr-2" />
              Select Product
            </Label>
            <Select
              value={formData.product_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, product_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} ({product.category}) - ₹{product.price}/{product.unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                required
              />
              {selectedProduct && (
                <p className="text-xs text-muted-foreground">
                  {formData.quantity} {selectedProduct.unit}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="alternate">Alternate Days</SelectItem>
                  <SelectItem value="custom">Custom Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.frequency === 'custom' && (
            <div className="space-y-2">
              <Label>Select Days</Label>
              <div className="grid grid-cols-2 gap-2">
                {daysOfWeek.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={day}
                      checked={formData.days_of_week.includes(day)}
                      onCheckedChange={() => handleDayToggle(day)}
                    />
                    <Label htmlFor={day} className="cursor-pointer font-normal">
                      {day}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">
                <Calendar className="h-4 w-4 inline mr-2" />
                Start Date
              </Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery_time">
                <Clock className="h-4 w-4 inline mr-2" />
                Preferred Time
              </Label>
              <Input
                id="delivery_time"
                type="time"
                value={formData.delivery_time}
                onChange={(e) => setFormData(prev => ({ ...prev, delivery_time: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="special_instructions">Special Instructions (Optional)</Label>
            <Textarea
              id="special_instructions"
              value={formData.special_instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, special_instructions: e.target.value }))}
              placeholder="Any special delivery instructions..."
              rows={3}
            />
          </div>

          {estimatedPrice > 0 && (
            <div className="p-4 bg-muted/30 rounded-lg border">
              <div className="flex justify-between items-center">
                <span className="font-medium">Estimated Price per Delivery:</span>
                <span className="text-lg font-bold">₹{estimatedPrice.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Your subscription request will be reviewed by the dairy owner. You'll be notified once it's approved.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || products.length === 0}>
              {loading ? "Submitting..." : "Request Subscription"}
            </Button>
          </div>
        </form>
        </DialogContent>
      </Dialog>
    </>
  );
};