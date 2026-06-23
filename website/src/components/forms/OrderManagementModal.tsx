import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, User, Package, MapPin, Edit, Trash2, Pause, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Order {
  id: string;
  customer_id: string;
  product_id: string;
  delivery_boy_id?: string;
  quantity: number;
  price: number;
  total_price: number;
  delivery_date: string;
  delivery_time: string;
  status: string;
  order_type: string;
  special_instructions?: string;
  customers: { name: string; phone: string; address: string } | null;
  products: { name: string; unit: string } | null;
  delivery_boys?: { name: string } | null;
}

interface Subscription {
  id: string;
  customer_id: string;
  product_id: string;
  quantity: number;
  frequency: string;
  start_date: string;
  end_date?: string;
  next_delivery_date: string;
  delivery_time: string;
  status: string;
  special_instructions?: string;
  customers: { name: string; phone: string; address: string } | null;
  products: { name: string; unit: string } | null;
}

interface OrderManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  dairyId: string;
}

export const OrderManagementModal = ({ isOpen, onClose, dairyId }: OrderManagementModalProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && dairyId) {
      fetchOrders();
      fetchSubscriptions();
    }
  }, [isOpen, dairyId]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers (name, phone, address),
          products (name, unit),
          delivery_boys (name)
        `)
        .eq('dairy_id', dairyId)
        .order('delivery_date', { ascending: true });

      if (error) throw error;
      setOrders((data || []) as any);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_subscriptions')
        .select(`
          *,
          customers (name, phone, address),
          products (name, unit)
        `)
        .eq('dairy_id', dairyId)
        .order('next_delivery_date', { ascending: true });

      if (error) throw error;
      setSubscriptions((data || []) as any);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch subscriptions",
        variant: "destructive"
      });
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      // If order is marked as delivered, award loyalty points
      if (newStatus === 'delivered') {
        try {
          await supabase.functions.invoke('award-loyalty-points', {
            body: { orderId }
          });
          console.log('Loyalty points awarded for order:', orderId);
        } catch (pointsError) {
          console.error('Error awarding loyalty points:', pointsError);
          // Don't fail the status update if points awarding fails
        }
      }
      
      toast({
        title: "Success",
        description: newStatus === 'delivered' 
          ? "Order marked as delivered and loyalty points awarded!"
          : "Order status updated successfully"
      });
      
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  const updateSubscriptionStatus = async (subscriptionId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('customer_subscriptions')
        .update({ status: newStatus })
        .eq('id', subscriptionId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Subscription status updated successfully"
      });
      
      fetchSubscriptions();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        title: "Error",
        description: "Failed to update subscription status",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'out_for_delivery': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(order => order.status === statusFilter);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Management
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="orders">One-Time Orders</TabsTrigger>
            <TabsTrigger value="subscriptions">Active Subscriptions</TabsTrigger>
            <TabsTrigger value="pending">
              Pending Requests
              {subscriptions.filter(s => s.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {subscriptions.filter(s => s.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Orders ({filteredOrders.length})</h3>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4">
              {loading ? (
                <div className="text-center py-8">Loading orders...</div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No orders found for this dairy
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <Card key={order.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{order.customers?.name || 'Unknown Customer'}</span>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Package className="h-4 w-4" />
                          <span>{order.quantity} {order.products?.unit || 'units'} of {order.products?.name || 'Unknown Product'}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(order.delivery_date).toLocaleDateString()}</span>
                          <Clock className="h-4 w-4 ml-2" />
                          <span>{order.delivery_time}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{order.customers?.address || 'Address not available'}</span>
                        </div>

                        {order.special_instructions && (
                          <p className="text-sm text-muted-foreground">
                            Instructions: {order.special_instructions}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className="font-semibold">₹{order.total_price}</span>
                        
                        <div className="flex gap-2">
                          {order.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'confirmed')}
                            >
                              Confirm
                            </Button>
                          )}
                          
                          {order.status === 'confirmed' && (
                            <Button
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}
                            >
                              Out for Delivery
                            </Button>
                          )}
                          
                          {order.status === 'out_for_delivery' && (
                            <Button
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'delivered')}
                            >
                              Mark Delivered
                            </Button>
                          )}
                          
                          {order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateOrderStatus(order.id, 'cancelled')}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-4">
            <h3 className="text-lg font-semibold">Subscriptions ({subscriptions.length})</h3>
            
            <div className="grid gap-4">
              {subscriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No subscriptions found for this dairy
                </div>
              ) : (
                subscriptions.map((subscription) => (
                  <Card key={subscription.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{subscription.customers?.name || 'Unknown Customer'}</span>
                          <Badge className={getStatusColor(subscription.status)}>
                            {subscription.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Package className="h-4 w-4" />
                          <span>{subscription.quantity} {subscription.products?.unit || 'units'} of {subscription.products?.name || 'Unknown Product'}</span>
                          <span className="ml-2">({subscription.frequency})</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Next delivery: {new Date(subscription.next_delivery_date).toLocaleDateString()}</span>
                          <Clock className="h-4 w-4 ml-2" />
                          <span>{subscription.delivery_time}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{subscription.customers?.address || 'Address not available'}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {subscription.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateSubscriptionStatus(subscription.id, 'paused')}
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                        )}
                        
                        {subscription.status === 'paused' && (
                          <Button
                            size="sm"
                            onClick={() => updateSubscriptionStatus(subscription.id, 'active')}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Resume
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateSubscriptionStatus(subscription.id, 'cancelled')}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            <h3 className="text-lg font-semibold">Pending Subscription Requests ({subscriptions.filter(s => s.status === 'pending').length})</h3>
            
            <div className="grid gap-4">
              {subscriptions.filter(s => s.status === 'pending').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending subscription requests
                </div>
              ) : (
                subscriptions.filter(s => s.status === 'pending').map((subscription) => (
                  <Card key={subscription.id} className="p-4 border-yellow-200 dark:border-yellow-800">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{subscription.customers?.name || 'Unknown Customer'}</span>
                          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            Pending Approval
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Package className="h-4 w-4" />
                          <span>{subscription.quantity} {subscription.products?.unit || 'units'} of {subscription.products?.name || 'Unknown Product'}</span>
                          <span className="ml-2">({subscription.frequency})</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Start date: {new Date(subscription.next_delivery_date).toLocaleDateString()}</span>
                          <Clock className="h-4 w-4 ml-2" />
                          <span>{subscription.delivery_time}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{subscription.customers?.address || 'Address not available'}</span>
                        </div>

                        {subscription.special_instructions && (
                          <p className="text-sm text-muted-foreground">
                            Instructions: {subscription.special_instructions}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateSubscriptionStatus(subscription.id, 'active')}
                        >
                          Approve
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateSubscriptionStatus(subscription.id, 'rejected')}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};