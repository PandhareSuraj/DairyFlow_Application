import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { UpdateLocationModal } from './UpdateLocationModal';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Package,
  Edit3,
  Save,
  X
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  area?: string;
  status: string;
  location_notes?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  quantity: number;
  total_price: number;
  delivery_date: string;
  product_id: string;
}

interface Subscription {
  id: string;
  created_at: string;
  status: string;
  quantity: number;
  frequency: string;
  next_delivery_date: string;
  product_id: string;
}

interface CustomerManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onCustomerUpdated: () => void;
}

export const CustomerManagementModal: React.FC<CustomerManagementModalProps> = ({
  isOpen,
  onClose,
  customer,
  onCustomerUpdated
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [products, setProducts] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    area: '',
    status: 'active',
    location_notes: ''
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        area: customer.area || '',
        status: customer.status || 'active',
        location_notes: customer.location_notes || ''
      });
      fetchCustomerData();
    }
  }, [customer]);

  const fetchCustomerData = async () => {
    if (!customer) return;
    
    setLoading(true);
    try {
      const [ordersRes, subscriptionsRes, productsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, created_at, status, quantity, total_price, delivery_date, product_id')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('customer_subscriptions')
          .select('id, created_at, status, quantity, frequency, next_delivery_date, product_id')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('products')
          .select('id, name')
      ]);

      if (ordersRes.data) setOrders(ordersRes.data);
      if (subscriptionsRes.data) setSubscriptions(subscriptionsRes.data);
      
      if (productsRes.data) {
        const productMap: Record<string, string> = {};
        productsRes.data.forEach((product) => {
          productMap[product.id] = product.name;
        });
        setProducts(productMap);
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
      toast.error('Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!customer) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          address: formData.address,
          area: formData.area || null,
          status: formData.status,
          location_notes: formData.location_notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', customer.id);

      if (error) throw error;

      toast.success('Customer updated successfully');
      setIsEditing(false);
      onCustomerUpdated();
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('Failed to update customer');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-success-foreground';
      case 'inactive': return 'bg-muted text-muted-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'delivered': return 'bg-success text-success-foreground';
      case 'cancelled': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-primary" />
              <span>Customer Management</span>
            </div>
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: customer.name || '',
                        phone: customer.phone || '',
                        email: customer.email || '',
                        address: customer.address || '',
                        area: customer.area || '',
                        status: customer.status || 'active',
                        location_notes: customer.location_notes || ''
                      });
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={loading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            View and manage customer information, orders, and subscriptions
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Customer Details</TabsTrigger>
            <TabsTrigger value="orders">Order History</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Customer Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    disabled={!isEditing}
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label htmlFor="area">Area/Sector</Label>
                  <Input
                    id="area"
                    value={formData.area}
                    onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
                
                <div>
                  <Label htmlFor="location_notes">Location Notes</Label>
                  <Textarea
                    id="location_notes"
                    value={formData.location_notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, location_notes: e.target.value }))}
                    disabled={!isEditing}
                    rows={2}
                    placeholder="Special delivery instructions, landmarks, etc."
                  />
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location on Map
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsLocationModalOpen(true)}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Set Location
                    </Button>
                  </div>
                  {customer?.latitude && customer?.longitude && (
                    <p className="text-sm text-muted-foreground">
                      Current: {customer.latitude.toFixed(6)}, {customer.longitude.toFixed(6)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Recent Orders</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No orders found</div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{products[order.product_id] || 'Unknown Product'}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {order.quantity} • ₹{order.total_price}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Active Subscriptions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading subscriptions...</div>
                ) : subscriptions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No subscriptions found</div>
                ) : (
                  <div className="space-y-3">
                    {subscriptions.map((subscription) => (
                      <div key={subscription.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{products[subscription.product_id] || 'Unknown Product'}</p>
                          <p className="text-sm text-muted-foreground">
                            {subscription.frequency} • Quantity: {subscription.quantity}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Next delivery: {new Date(subscription.next_delivery_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={getStatusColor(subscription.status)}>
                          {subscription.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <UpdateLocationModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          customerId={customer?.id || ''}
          currentLocation={
            customer?.latitude && customer?.longitude
              ? { lat: customer.latitude, lng: customer.longitude }
              : undefined
          }
          customerAddress={customer?.address || ''}
          onLocationUpdated={() => {
            fetchCustomerData();
            onCustomerUpdated();
          }}
        />
      </DialogContent>
    </Dialog>
  );
};