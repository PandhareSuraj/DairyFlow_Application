import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RegisterDairyForm } from '@/components/forms/RegisterDairyForm';
import { ManageDairyModal } from '@/components/forms/ManageDairyModal';
import { SystemSettingsModal } from '@/components/modals/SystemSettingsModal';
import { CreateDairyOwnerModal } from '@/components/forms/CreateDairyOwnerModal';
import { DataManagement } from '@/components/dashboards/DataManagement';
import { DashboardHeader, DashboardSidebar, StatsWidget, QuickActionsPanel, ActivityFeed, generateMockActivities } from '@/components/dashboard';
import { supabase } from '@/integrations/supabase/client';
import { Store, Users, Package, TrendingUp, Settings, MapPin, UserPlus, Building2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { SkeletonDashboard } from '@/components/ui/skeleton-card';

export const SuperAdminDashboard = () => {
  const { toast } = useToast();
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showSystemSettings, setShowSystemSettings] = useState(false);
  const [showCreateOwnerModal, setShowCreateOwnerModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDairy, setSelectedDairy] = useState<any>(null);
  const [dairies, setDairies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [googleMapsConfigured, setGoogleMapsConfigured] = useState(false);
  const [stats, setStats] = useState({
    totalDairies: 0,
    totalCustomers: 0,
    totalDeliveryBoys: 0,
    totalProducts: 0,
  });

  const fetchDairies = async () => {
    try {
      const { data, error } = await supabase
        .from('dairies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDairies(data || []);
    } catch (error) {
      console.error('Error fetching dairies:', error);
      toast({
        title: "Error loading dairies",
        description: "Failed to load dairy list. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: dairiesCount, error: dairiesError } = await supabase
        .from('dairies')
        .select('*', { count: 'exact', head: true });

      const { count: customersCount, error: customersError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      const { count: deliveryBoysCount, error: deliveryError } = await supabase
        .from('delivery_boys')
        .select('*', { count: 'exact', head: true });

      const { count: productsCount, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (dairiesError || customersError || deliveryError || productsError) {
        throw new Error('Failed to fetch statistics');
      }

      setStats({
        totalDairies: dairiesCount || 0,
        totalCustomers: customersCount || 0,
        totalDeliveryBoys: deliveryBoysCount || 0,
        totalProducts: productsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Error loading statistics",
        description: "Some statistics may not be up to date.",
        variant: "destructive",
      });
    }
  };

  const checkGoogleMapsConfiguration = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('google_maps_api_key')
        .maybeSingle();
      
      setGoogleMapsConfigured(!!data?.google_maps_api_key);
    } catch (error) {
      console.error('Error checking Google Maps configuration:', error);
      setGoogleMapsConfigured(false);
    }
  };

  useEffect(() => {
    fetchDairies();
    fetchStats();
    checkGoogleMapsConfiguration();
  }, []);

  const handleDairyRegistered = () => {
    setShowRegisterForm(false);
    fetchDairies();
    fetchStats();
  };

  const handleSystemSettingsClose = () => {
    setShowSystemSettings(false);
    checkGoogleMapsConfiguration();
  };

  const handleNavigate = (section: string) => {
    setActiveTab(section === 'dairies' ? 'dairies' : section === 'data' ? 'data' : 'overview');
  };

  const handleAction = (action: string) => {
    switch (action) {
      case 'add-dairy':
        setShowRegisterForm(true);
        break;
      case 'create-owner':
        setShowCreateOwnerModal(true);
        break;
      case 'system-settings':
        setShowSystemSettings(true);
        break;
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-gradient-soft">
      {/* Sidebar */}
      <div className="hidden lg:block">
        <DashboardSidebar 
          role="super_admin" 
          activeSection={activeTab}
          onNavigate={handleNavigate}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader 
          onNavigate={handleNavigate}
          onAction={handleAction}
        />
        
        <main className="flex-1 p-6 space-y-6 overflow-auto">

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="data">Data Management</TabsTrigger>
            <TabsTrigger value="dairies">Dairy Management</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Actions */}
            <QuickActionsPanel role="super_admin" onAction={handleAction} compact />

            {/* System Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsWidget
                title="Total Dairies"
                value={stats.totalDairies}
                subtitle="Registered businesses"
                icon={<Store className="h-6 w-6" />}
                variant="primary"
              />
              <StatsWidget
                title="Total Customers"
                value={stats.totalCustomers}
                subtitle="Across all dairies"
                icon={<Users className="h-6 w-6" />}
                trend={{ value: "+12%", direction: "up", label: "this month" }}
              />

              <StatsWidget
                title="Delivery Personnel"
                value={stats.totalDeliveryBoys}
                subtitle="Active delivery boys"
                icon={<Users className="h-6 w-6" />}
              />
              <StatsWidget
                title="Total Products"
                value={stats.totalProducts}
                subtitle="Listed across platform"
                icon={<Package className="h-6 w-6" />}
                variant="success"
              />
            </div>

            {/* Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ActivityFeed 
                activities={generateMockActivities('super_admin')} 
                title="Recent Activity"
              />

              {/* System Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    System Configuration
                  </CardTitle>
                  <CardDescription>Manage system-wide settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Google Maps Integration</p>
                        <p className="text-sm text-muted-foreground">
                          Status: {googleMapsConfigured ? (
                            <span className="text-success">Configured</span>
                          ) : (
                            <span className="text-destructive">Not Configured</span>
                          )}
                        </p>
                      </div>
                  </div>
                    <Button onClick={() => setShowSystemSettings(true)}>
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="data">
            <DataManagement dairies={dairies} />
          </TabsContent>

          <TabsContent value="dairies">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Dairy Management</CardTitle>
                    <CardDescription>Manage registered dairies and their owners</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowCreateOwnerModal(true)} variant="outline">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Dairy Owner
                    </Button>
                    <Button onClick={() => setShowRegisterForm(true)} className="button-gradient">
                      <Store className="mr-2 h-4 w-4" />
                      Register New Dairy
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <SkeletonDashboard />
                  ) : dairies.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No dairies registered yet</div>
                  ) : (
                    dairies.map((dairy) => (
                      <div key={dairy.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-accent/10 rounded-lg">
                            <Building2 className="h-5 w-5 text-accent" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{dairy.name}</h3>
                            <p className="text-sm text-muted-foreground">Owner: {dairy.owner_name}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">{dairy.owner_phone}</p>
                            <p className="text-xs text-muted-foreground">{dairy.address}</p>
                          </div>
                          <Badge variant="default">Active</Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedDairy(dairy);
                              setShowManageModal(true);
                            }}
                          >
                            Manage
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </main>
      </div>
      
      <RegisterDairyForm 
        isOpen={showRegisterForm} 
        onClose={handleDairyRegistered} 
      />
      
      <ManageDairyModal 
        isOpen={showManageModal} 
        onClose={() => setShowManageModal(false)} 
        dairy={selectedDairy}
      />
      
      {showSystemSettings && (
        <SystemSettingsModal
          isOpen={showSystemSettings}
          onClose={handleSystemSettingsClose}
        />
      )}

      <CreateDairyOwnerModal
        open={showCreateOwnerModal}
        onOpenChange={setShowCreateOwnerModal}
        dairies={dairies}
        onSuccess={fetchDairies}
      />
    </div>
  );
};
