import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Trash2, Search } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type DataTable = 'products' | 'customers' | 'delivery_boys' | 'orders' | 'customer_subscriptions';

interface DataManagementProps {
  dairies: Array<{ id: string; name: string }>;
}

export function DataManagement({ dairies }: DataManagementProps) {
  const { toast } = useToast();
  const [selectedTable, setSelectedTable] = useState<DataTable>('products');
  const [selectedDairy, setSelectedDairy] = useState<string>('all');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase.from(selectedTable).select('*');
      
      if (selectedDairy !== 'all') {
        query = query.eq('dairy_id', selectedDairy);
      }

      const { data: result, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setData(result || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch data',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedTable, selectedDairy]);

  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      const { error } = await supabase
        .from(selectedTable)
        .delete()
        .eq('id', deleteDialog.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Record deleted successfully',
      });

      fetchData();
    } catch (error: any) {
      console.error('Error deleting record:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete record',
      });
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const filteredData = data.filter((row) => {
    const searchLower = searchTerm.toLowerCase();
    return Object.values(row).some((value) => 
      String(value).toLowerCase().includes(searchLower)
    );
  });

  const getTableHeaders = () => {
    if (data.length === 0) return [];
    return Object.keys(data[0]).filter(key => 
      !['created_at', 'updated_at'].includes(key)
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Management</CardTitle>
        <CardDescription>View and manage all data across your system</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 flex-wrap">
          <Select value={selectedTable} onValueChange={(value: DataTable) => setSelectedTable(value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="products">Products</SelectItem>
              <SelectItem value="customers">Customers</SelectItem>
              <SelectItem value="delivery_boys">Delivery Boys</SelectItem>
              <SelectItem value="orders">Orders</SelectItem>
              <SelectItem value="customer_subscriptions">Subscriptions</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedDairy} onValueChange={setSelectedDairy}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dairies</SelectItem>
              {dairies.map((dairy) => (
                <SelectItem key={dairy.id} value={dairy.id}>
                  {dairy.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <Button onClick={fetchData} variant="outline">
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="border rounded-lg overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  {getTableHeaders().map((header) => (
                    <TableHead key={header}>{header}</TableHead>
                  ))}
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={getTableHeaders().length + 1} className="text-center text-muted-foreground">
                      No data found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((row) => (
                    <TableRow key={row.id}>
                      {getTableHeaders().map((header) => (
                        <TableCell key={header}>
                          {typeof row[header] === 'object' 
                            ? JSON.stringify(row[header]) 
                            : String(row[header] || '-')}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteDialog({ open: true, id: row.id })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          Showing {filteredData.length} of {data.length} records
        </div>
      </CardContent>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
