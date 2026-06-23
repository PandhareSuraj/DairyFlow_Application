import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, UserPlus } from 'lucide-react';
import { CreateUserModal } from '@/components/forms/CreateUserModal';

export function UserManagement() {
  const { toast } = useToast();
  const [deliveryBoys, setDeliveryBoys] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModal, setCreateModal] = useState<{ open: boolean; role: 'delivery_boy' | 'customer' | null }>({ 
    open: false, 
    role: null 
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's dairy_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('dairy_id')
        .eq('id', user.id)
        .single();

      if (!profile?.dairy_id) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No dairy associated with your account',
        });
        return;
      }

      // Fetch delivery boys
      const { data: dbData, error: dbError } = await supabase
        .from('delivery_boys')
        .select('*')
        .eq('dairy_id', profile.dairy_id)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;
      setDeliveryBoys(dbData || []);

      // Fetch customers
      const { data: custData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .eq('dairy_id', profile.dairy_id)
        .order('created_at', { ascending: false });

      if (custError) throw custError;
      setCustomers(custData || []);

    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch users',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateSuccess = () => {
    fetchUsers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Delivery Boys Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Delivery Boys</CardTitle>
            <CardDescription>Manage your delivery personnel accounts</CardDescription>
          </div>
          <Button onClick={() => setCreateModal({ open: true, role: 'delivery_boy' })}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Delivery Boy
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveryBoys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No delivery boys found
                  </TableCell>
                </TableRow>
              ) : (
                deliveryBoys.map((db) => (
                  <TableRow key={db.id}>
                    <TableCell>{db.name}</TableCell>
                    <TableCell>{db.email || '-'}</TableCell>
                    <TableCell>{db.phone}</TableCell>
                    <TableCell>
                      <Badge variant={db.status === 'active' ? 'default' : 'secondary'}>
                        {db.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Customers Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Customers</CardTitle>
            <CardDescription>Manage your customer accounts</CardDescription>
          </div>
          <Button onClick={() => setCreateModal({ open: true, role: 'customer' })}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.email || '-'}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>{customer.area || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                        {customer.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create User Modal */}
      {createModal.role && (
        <CreateUserModal
          open={createModal.open}
          onOpenChange={(open) => setCreateModal({ ...createModal, open })}
          role={createModal.role}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}
