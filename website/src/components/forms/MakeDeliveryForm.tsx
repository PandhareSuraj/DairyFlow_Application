import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, User, Package, MapPin, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  category: string;
}

interface DeliveryBoy {
  id: string;
  name: string;
  phone: string;
}

interface MakeDeliveryFormProps {
  isOpen: boolean;
  onClose: () => void;
  dairyId: string;
}

export const MakeDeliveryForm = ({ isOpen, onClose, dairyId }: MakeDeliveryFormProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    customerId: '',
    deliveryBoyId: '',
    productId: '',
    quantity: '',
    deliveryDate: '',
    deliveryTime: '08:00',
    orderType: 'one_time',
    frequency: 'daily',
    specialInstructions: ''
  });

  useEffect(() => {
    if (isOpen && dairyId) {
      fetchData();
    }
  }, [isOpen, dairyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, phone, address')
        .eq('dairy_id', dairyId)
        .eq('status', 'active');

      if (customersError) throw customersError;

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, price, unit, category')
        .eq('dairy_id', dairyId);

      if (productsError) throw productsError;

      // Fetch delivery boys
      const { data: deliveryBoysData, error: deliveryBoysError } = await supabase
        .from('delivery_boys')
        .select('id, name, phone')
        .eq('dairy_id', dairyId)
        .eq('status', 'active');

      if (deliveryBoysError) throw deliveryBoysError;

      setCustomers(customersData || []);
      setProducts(productsData || []);
      setDeliveryBoys(deliveryBoysData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch form data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerId || !formData.productId || !formData.quantity || !formData.deliveryDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const selectedProduct = products.find(p => p.id === formData.productId);
      if (!selectedProduct) throw new Error('Product not found');

      const quantity = parseInt(formData.quantity);
      const totalPrice = selectedProduct.price * quantity;
      const pointsEarned = Math.floor(totalPrice / 10); // 1 point per ₹10 spent

      if (formData.orderType === 'one_time') {
        // Create one-time order
        const { error } = await supabase
          .from('orders')
          .insert({
            customer_id: formData.customerId,
            dairy_id: dairyId,
            product_id: formData.productId,
            delivery_boy_id: formData.deliveryBoyId === 'none' ? null : formData.deliveryBoyId || null,
            quantity: quantity,
            price: selectedProduct.price,
            total_price: totalPrice,
            points_earned: pointsEarned,
            delivery_date: formData.deliveryDate,
            delivery_time: formData.deliveryTime,
            order_type: 'one_time',
            special_instructions: formData.specialInstructions || null
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: `Order created! Customer will earn ${pointsEarned} points.`
        });
      } else {
        // Create subscription
        const startDate = new Date(formData.deliveryDate);
        let nextDeliveryDate = new Date(startDate);

        // Calculate next delivery based on frequency
        if (formData.frequency === 'weekly') {
          nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 7);
        } else if (formData.frequency === 'monthly') {
          nextDeliveryDate.setMonth(nextDeliveryDate.getMonth() + 1);
        } else {
          // daily
          nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 1);
        }

        const { error } = await supabase
          .from('customer_subscriptions')
          .insert({
            customer_id: formData.customerId,
            dairy_id: dairyId,
            product_id: formData.productId,
            quantity: quantity,
            frequency: formData.frequency,
            start_date: formData.deliveryDate,
            next_delivery_date: nextDeliveryDate.toISOString().split('T')[0],
            delivery_time: formData.deliveryTime,
            special_instructions: formData.specialInstructions || null
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Recurring subscription created successfully!"
        });
      }

      // Reset form
      setFormData({
        customerId: '',
        deliveryBoyId: '',
        productId: '',
        quantity: '',
        deliveryDate: '',
        deliveryTime: '08:00',
        orderType: 'one_time',
        frequency: 'daily',
        specialInstructions: ''
      });
      
      onClose();
    } catch (error: any) {
      console.error('Error creating order:', error);
      const message = error?.message || error?.details || 'Failed to create order. Please try again.';
      toast({
        title: "Order Creation Failed",
        description: message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const selectedCustomer = customers.find(c => c.id === formData.customerId);
  const selectedProduct = products.find(p => p.id === formData.productId);
  const quantity = parseInt(formData.quantity) || 0;
  const totalPrice = selectedProduct ? selectedProduct.price * quantity : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Order Type Selection */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="orderType">Order Type</Label>
                  <Select 
                    value={formData.orderType} 
                    onValueChange={(value) => handleSelectChange('orderType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select order type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">One-Time Order</SelectItem>
                      <SelectItem value="recurring">Recurring Subscription</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Frequency Selection (only for recurring orders) */}
                {formData.orderType === 'recurring' && (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="frequency">Delivery Frequency</Label>
                    <Select 
                      value={formData.frequency} 
                      onValueChange={(value) => handleSelectChange('frequency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Customer Selection */}
                <div className="space-y-2">
                  <Label htmlFor="customerId">Select Customer *</Label>
                  <Select 
                    value={formData.customerId} 
                    onValueChange={(value) => handleSelectChange('customerId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {customer.name} - {customer.phone}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Product Selection */}
                <div className="space-y-2">
                  <Label htmlFor="productId">Select Product *</Label>
                  <Select 
                    value={formData.productId} 
                    onValueChange={(value) => handleSelectChange('productId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            {product.name} - ₹{product.price}/{product.unit}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantity Input */}
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    placeholder="Enter quantity"
                  />
                </div>

                {/* Delivery Boy Selection */}
                <div className="space-y-2">
                  <Label htmlFor="deliveryBoyId">Assign Delivery Boy (Optional)</Label>
                  <Select 
                    value={formData.deliveryBoyId} 
                    onValueChange={(value) => handleSelectChange('deliveryBoyId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose delivery boy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No assignment</SelectItem>
                      {deliveryBoys.map((boy) => (
                        <SelectItem key={boy.id} value={boy.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {boy.name} - {boy.phone}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Delivery Date */}
                <div className="space-y-2">
                  <Label htmlFor="deliveryDate">
                    {formData.orderType === 'recurring' ? 'Start Date *' : 'Delivery Date *'}
                  </Label>
                  <Input
                    id="deliveryDate"
                    name="deliveryDate"
                    type="date"
                    value={formData.deliveryDate}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Delivery Time */}
                <div className="space-y-2">
                  <Label htmlFor="deliveryTime">Preferred Delivery Time</Label>
                  <Input
                    id="deliveryTime"
                    name="deliveryTime"
                    type="time"
                    value={formData.deliveryTime}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Special Instructions */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="specialInstructions">Special Instructions</Label>
                  <Textarea
                    id="specialInstructions"
                    name="specialInstructions"
                    value={formData.specialInstructions}
                    onChange={handleInputChange}
                    placeholder="Any special delivery instructions..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Order Summary Card */}
              {selectedCustomer && selectedProduct && formData.quantity && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-800">
                      <Package className="h-5 w-5" />
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-blue-600" />
                      <strong>Customer:</strong> {selectedCustomer.name}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-blue-600" />
                      <strong>Phone:</strong> {selectedCustomer.phone}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <strong>Address:</strong> {selectedCustomer.address}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-blue-600" />
                      <strong>Product:</strong> {selectedProduct.name} ({selectedProduct.category})
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <strong>Quantity:</strong> {formData.quantity} {selectedProduct.unit}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <strong>Unit Price:</strong> ₹{selectedProduct.price}/{selectedProduct.unit}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                      <strong>Total Amount:</strong> ₹{totalPrice}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <strong>Delivery Time:</strong> {formData.deliveryTime}
                    </div>
                    {formData.deliveryDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <strong>{formData.orderType === 'recurring' ? 'Start Date' : 'Delivery Date'}:</strong> {new Date(formData.deliveryDate).toLocaleDateString()}
                      </div>
                    )}
                    {formData.orderType === 'recurring' && (
                      <div className="flex items-center gap-2 text-sm">
                        <strong>Frequency:</strong> {formData.frequency}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading 
                ? 'Creating...' 
                : formData.orderType === 'recurring' 
                  ? 'Create Subscription' 
                  : 'Create Order'
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};