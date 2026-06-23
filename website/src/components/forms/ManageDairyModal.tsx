import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, MapPin, Phone, Mail, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ManageDairyModalProps {
  isOpen: boolean;
  onClose: () => void;
  dairy: {
    id: string;
    name: string;
    owner_name: string;
    owner_email?: string;
    owner_phone: string;
    address: string;
    description?: string;
  } | null;
}

export const ManageDairyModal = ({ isOpen, onClose, dairy }: ManageDairyModalProps) => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [deliveryBoys, setDeliveryBoys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleStatusChange = (newStatus: string) => {
    toast({
      title: "Status Updated",
      description: `${dairy.name} status changed to ${newStatus}`,
    });
  };

  const handleAction = (action: string) => {
    toast({
      title: "Action Performed",
      description: `${action} completed for ${dairy.name}`,
    });
  };

  const fetchDairyData = async () => {
    if (!dairy?.id) return;
    
    setLoading(true);
    try {
      // Fetch customers for this dairy
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('dairy_id', dairy.id)
        .order('created_at', { ascending: false });

      if (customersError) throw customersError;
      setCustomers(customersData || []);

      // Fetch delivery boys for this dairy
      const { data: deliveryBoysData, error: deliveryBoysError } = await supabase
        .from('delivery_boys')
        .select('*')
        .eq('dairy_id', dairy.id)
        .order('created_at', { ascending: false });

      if (deliveryBoysError) throw deliveryBoysError;
      setDeliveryBoys(deliveryBoysData || []);
    } catch (error) {
      console.error('Error fetching dairy data:', error);
      toast({
        title: "Error",
        description: "Failed to load dairy data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && dairy?.id) {
      fetchDairyData();
    }
  }, [isOpen, dairy?.id]);

  if (!dairy) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Manage {dairy.name}
            <Badge variant="default" className="bg-success text-success-foreground">
              Active
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Owner: {dairy.owner_name} • Phone: {dairy.owner_phone}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="delivery">Delivery Boys</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Customers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{loading ? '...' : customers.length}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Delivery Boys</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{loading ? '...' : deliveryBoys.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{dairy.owner_email || `${dairy.owner_name.toLowerCase().replace(' ', '')}@email.com`}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{dairy.owner_phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{dairy.address}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="customers" className="space-y-4">
            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading customers...</div>
              ) : customers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No customers found for this dairy</div>
              ) : (
                customers.map((customer) => (
                  <Card key={customer.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <h4 className="font-semibold">{customer.name}</h4>
                        <p className="text-sm text-muted-foreground">{customer.address}</p>
                        <p className="text-sm text-muted-foreground">{customer.phone}</p>
                        {customer.area && (
                          <Badge variant="outline" className="mt-1">
                            {customer.area}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                          {customer.status}
                        </Badge>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="delivery" className="space-y-4">
            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading delivery boys...</div>
              ) : deliveryBoys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No delivery boys found for this dairy</div>
              ) : (
                deliveryBoys.map((boy) => (
                  <Card key={boy.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <h4 className="font-semibold">{boy.name}</h4>
                        <p className="text-sm text-muted-foreground">{boy.phone}</p>
                        {boy.email && (
                          <p className="text-sm text-muted-foreground">{boy.email}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={boy.status === 'active' ? 'default' : 'secondary'}>
                          {boy.status}
                        </Badge>
                        <Button variant="outline" size="sm">
                          Manage
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="actions" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={() => handleStatusChange('suspended')}
                variant="destructive"
              >
                Suspend Dairy
              </Button>
              <Button 
                onClick={() => handleStatusChange('active')}
                variant="outline"
              >
                Activate Dairy
              </Button>
              <Button 
                onClick={() => handleAction('Generate Report')}
                variant="outline"
              >
                Generate Report
              </Button>
              <Button 
                onClick={() => handleAction('Send Notification')}
                variant="outline"
              >
                Send Notification
              </Button>
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