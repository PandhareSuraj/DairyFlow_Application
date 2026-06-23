import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Users, 
  TrendingUp, 
  Plus, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  UserPlus,
  ShoppingCart,
  DollarSign
} from 'lucide-react';
import { AddProductForm } from '@/components/forms/AddProductForm';
import { EditProductForm } from '@/components/forms/EditProductForm';
import { AddCustomerForm } from '@/components/forms/AddCustomerForm';
import { AddDeliveryBoyForm } from '@/components/forms/AddDeliveryBoyForm';
import { ManageDeliveryBoyModal } from '@/components/forms/ManageDeliveryBoyModal';
import { OrderManagementModal } from '@/components/forms/OrderManagementModal';
import { MakeDeliveryForm } from '@/components/forms/MakeDeliveryForm';
import { CustomerManagementModal } from '@/components/forms/CustomerManagementModal';
import CustomerMap from '@/components/map/CustomerMap';
import { UserManagement } from '@/components/dashboards/UserManagement';
import { LoyaltyLeaderboard } from '@/components/loyalty/LoyaltyLeaderboard';
import { LoyaltyAnalytics } from '@/components/loyalty/LoyaltyAnalytics';
import { ReferralAnalytics } from '@/components/loyalty/ReferralAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  DashboardSidebar,
  DashboardHeader,
  StatsWidget,
  QuickActionsPanel,
  ActivityFeed,
  ProgressRing
} from '@/components/dashboard';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SkeletonDashboard } from '@/components/ui/skeleton-card';

export const DairyOwnerDashboard = () => {
  const { t } = useTranslation(['dairy', 'dashboard', 'common']);
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [showEditProductForm, setShowEditProductForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
  const [showAddDeliveryBoyForm, setShowAddDeliveryBoyForm] = useState(false);
  const [showManageDeliveryBoyModal, setShowManageDeliveryBoyModal] = useState(false);
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState<any>(null);
  const [showOrderManagementModal, setShowOrderManagementModal] = useState(false);
  const [showMakeDeliveryForm, setShowMakeDeliveryForm] = useState(false);
  const [showCustomerManagementModal, setShowCustomerManagementModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [deliveryBoys, setDeliveryBoys] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [productsRes, customersRes, deliveryBoysRes, ordersRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('delivery_boys').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(100)
      ]);

      if (productsRes.data) setProducts(productsRes.data);
      if (customersRes.data) setCustomers(customersRes.data);
      if (deliveryBoysRes.data) setDeliveryBoys(deliveryBoysRes.data);
      if (ordersRes.data) setOrders(ordersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate stats
  const todayOrders = orders.filter(o => {
    const orderDate = new Date(o.created_at).toDateString();
    return orderDate === new Date().toDateString();
  });
  const completedToday = todayOrders.filter(o => o.status === 'delivered').length;
  const pendingToday = todayOrders.filter(o => o.status === 'pending').length;
  const inProgressToday = todayOrders.filter(o => o.status === 'out_for_delivery').length;
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
  const deliveryProgress = todayOrders.length > 0 ? Math.round((completedToday / todayOrders.length) * 100) : 0;

  const handleQuickAction = (actionId: string) => {
    switch (actionId) {
      case 'add-product':
        setShowAddProductForm(true);
        break;
      case 'add-customer':
        setShowAddCustomerForm(true);
        break;
      case 'add-delivery-boy':
        setShowAddDeliveryBoyForm(true);
        break;
      case 'make-delivery':
        setShowMakeDeliveryForm(true);
        break;
      case 'manage-orders':
        setShowOrderManagementModal(true);
        break;
      case 'view-map':
        setActiveSection('map');
        break;
    }
  };

  const recentActivities = orders.slice(0, 5).map(order => ({
    id: order.id,
    type: 'order' as const,
    action: `Order ${order.status}`,
    description: `Order #${order.id.slice(0, 8)} - ₹${order.total_price}`,
    timestamp: new Date(order.created_at),
    status: order.status === 'delivered' ? 'success' as const : order.status === 'pending' ? 'warning' as const : 'info' as const
  }));

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsWidget
                title={t('todaysRevenue')}
                value={`₹${todayRevenue.toLocaleString()}`}
                icon={<DollarSign className="h-6 w-6" />}
                trend={{ value: '+12%', direction: 'up', label: t('common:vsYesterday') }}
              />
              <StatsWidget
                title={t('totalProducts')}
                value={products.length.toString()}
                icon={<Package className="h-6 w-6" />}
                subtitle={t('common:activeItems')}
              />
              <StatsWidget
                title={t('activeCustomers')}
                value={customers.filter(c => c.status === 'active').length.toString()}
                icon={<Users className="h-6 w-6" />}
                trend={{ value: '+5%', direction: 'up', label: t('common:thisMonth') }}
              />
              <StatsWidget
                title={t('deliveryBoys')}
                value={deliveryBoys.filter(d => d.status === 'active').length.toString()}
                icon={<TrendingUp className="h-6 w-6" />}
                subtitle={t('common:activeStaff')}
              />
            </div>

            {/* Delivery Progress + Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="shadow-soft border-border">
                <CardHeader>
                  <CardTitle className="text-lg">{t('dashboard:todaysDeliveryProgress')}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <ProgressRing progress={deliveryProgress} size={140} strokeWidth={12} />
                  <div className="mt-4 grid grid-cols-3 gap-4 w-full text-center">
                    <div>
                      <p className="text-2xl font-bold text-success">{completedToday}</p>
                      <p className="text-xs text-muted-foreground">{t('common:completed')}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-warning">{inProgressToday}</p>
                      <p className="text-xs text-muted-foreground">{t('common:inProgress')}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-destructive">{pendingToday}</p>
                      <p className="text-xs text-muted-foreground">{t('common:pending')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <QuickActionsPanel role="dairy_owner" onAction={handleQuickAction} />
              
              <ActivityFeed title={t('dashboard:recentOrders')} activities={recentActivities} />
            </div>

            {/* Low Stock Alerts */}
            <Card className="shadow-soft border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  {t('lowStockAlerts')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {products.filter(p => p.stock_quantity < 20).length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">{t('common:allProductsStocked')}</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {products.filter(p => p.stock_quantity < 20).map(product => (
                      <div key={product.id} className="p-3 border border-warning/30 rounded-lg bg-warning/5">
                        <p className="font-medium text-foreground">{product.name}</p>
                        <p className="text-sm text-warning">{t('common:onlyLeft', { count: product.stock_quantity, unit: product.unit })}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'products':
        return (
          <Card className="shadow-soft border-border">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t('productManagement')}</CardTitle>
                  <CardDescription>{t('dashboard:manageProductsAndPricing')}</CardDescription>
                </div>
                <Button 
                  className="bg-gradient-primary hover:bg-primary-hover shadow-soft"
                  onClick={() => setShowAddProductForm(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('addProduct')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">{t('common:loadingProducts')}</div>
              ) : products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t('common:noProductsYet')}</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <Card key={product.id} className="border border-border hover:shadow-soft transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-foreground">{product.name}</h3>
                          <Badge variant="outline">{product.category}</Badge>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {t('common:price')}: <span className="font-medium text-foreground">₹{product.price}/{product.unit}</span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t('common:stock')}: <span className="font-medium text-foreground">{product.stock_quantity} {product.unit}s</span>
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-3"
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowEditProductForm(true);
                          }}
                        >
                          {t('editProduct')}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'customers':
        return (
          <Card className="shadow-soft border-border">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t('customerManagement')}</CardTitle>
                  <CardDescription>{t('dashboard:manageCustomerBase')}</CardDescription>
                </div>
                <Button 
                  className="bg-gradient-primary hover:bg-primary-hover shadow-soft"
                  onClick={() => setShowAddCustomerForm(true)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t('addCustomer')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">{t('common:loadingCustomers')}</div>
              ) : customers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t('common:noCustomersYet')}</div>
              ) : (
                <div className="space-y-4">
                  {customers.map((customer) => (
                    <div key={customer.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-accent/10 rounded-lg">
                          <Users className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{customer.name}</h3>
                          <p className="text-sm text-muted-foreground">{customer.phone}</p>
                          <p className="text-xs text-muted-foreground">{customer.area || customer.address}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge 
                          variant={customer.status === 'active' ? 'default' : 'secondary'}
                          className={customer.status === 'active' ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'}
                        >
                          {customer.status === 'active' ? t('common:active') : t('common:inactive')}
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowCustomerManagementModal(true);
                          }}
                        >
                          {t('common:manage')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'map':
        return (
          <CustomerMap 
            customers={customers}
            onCustomerLocationUpdate={(customerId, lat, lng) => {
              supabase
                .from('customers')
                .update({ latitude: lat, longitude: lng })
                .eq('id', customerId)
                .then(() => fetchData());
            }}
            onRouteOptimize={(optimizedRoute) => {
              console.log('Optimized delivery route:', optimizedRoute);
            }}
          />
        );

      case 'delivery-boys':
        return (
          <Card className="shadow-soft border-border">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t('deliveryBoys')}</CardTitle>
                  <CardDescription>{t('dashboard:manageDeliveryPersonnel')}</CardDescription>
                </div>
                <Button 
                  className="bg-gradient-primary hover:bg-primary-hover shadow-soft"
                  onClick={() => setShowAddDeliveryBoyForm(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('addDeliveryBoy')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">{t('common:loadingDeliveryBoys')}</div>
              ) : deliveryBoys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t('common:noDeliveryBoysYet')}</div>
              ) : (
                <div className="space-y-4">
                  {deliveryBoys.map((boy) => (
                    <div key={boy.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{boy.name}</h3>
                          <p className="text-sm text-muted-foreground">{boy.phone}</p>
                          {boy.email && (
                            <p className="text-xs text-muted-foreground">{boy.email}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge 
                          variant={boy.status === 'active' ? 'default' : 'secondary'}
                          className={boy.status === 'active' ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'}
                        >
                          {boy.status === 'active' ? t('common:active') : t('common:inactive')}
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedDeliveryBoy(boy);
                            setShowManageDeliveryBoyModal(true);
                          }}
                        >
                          {t('common:manage')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'orders':
        return (
          <Card className="shadow-soft border-border">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t('orderManagement')}</CardTitle>
                  <CardDescription>{t('viewOrders')}</CardDescription>
                </div>
                <Button 
                  className="bg-gradient-primary hover:bg-primary-hover shadow-soft"
                  onClick={() => setShowOrderManagementModal(true)}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {t('createOrder')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">{t('common:loadingOrders')}</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t('common:noOrdersYet')}</div>
              ) : (
                <div className="space-y-4">
                  {orders.slice(0, 20).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-lg ${
                          order.status === 'delivered' ? 'bg-success/10' :
                          order.status === 'pending' ? 'bg-warning/10' : 'bg-primary/10'
                        }`}>
                          {order.status === 'delivered' ? (
                            <CheckCircle className="h-5 w-5 text-success" />
                          ) : order.status === 'pending' ? (
                            <Clock className="h-5 w-5 text-warning" />
                          ) : (
                            <Package className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">#{order.id.slice(0, 8)}</h3>
                          <p className="text-sm text-muted-foreground">
                            ₹{order.total_price} • {new Date(order.delivery_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={order.status === 'delivered' ? 'default' : order.status === 'pending' ? 'secondary' : 'outline'}
                        className={
                          order.status === 'delivered' ? 'bg-success text-success-foreground' :
                          order.status === 'pending' ? 'bg-warning text-warning-foreground' : ''
                        }
                      >
                        {order.status === 'delivered' ? t('common:completed') : 
                         order.status === 'pending' ? t('common:pending') : 
                         t('common:inProgress')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'loyalty':
        return (
          <div className="space-y-6">
            <LoyaltyAnalytics />
            <LoyaltyLeaderboard />
          </div>
        );

      case 'referrals':
        return <ReferralAnalytics />;

      case 'users':
        return <UserManagement />;

      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar
          role="dairy_owner"
          activeSection={activeSection}
          onNavigate={setActiveSection}
        />
        
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <DashboardHeader
            title={activeSection === 'overview' ? t('dashboard:overview') : 
                   activeSection === 'products' ? t('productManagement') :
                   activeSection === 'customers' ? t('customerManagement') :
                   activeSection === 'delivery-boys' ? t('deliveryBoys') :
                   activeSection === 'orders' ? t('orderManagement') :
                   activeSection === 'map' ? t('dashboard:map') :
                   activeSection === 'loyalty' ? t('dashboard:loyalty') :
                   activeSection === 'referrals' ? t('dashboard:referrals') :
                   activeSection === 'users' ? t('dashboard:userManagement') : t('dashboard:overview')}
            subtitle={`${t('common:welcome')}, ${user?.name || 'Dairy Owner'}`}
          />
          
          <main className="flex-1 p-6 overflow-auto">
            {renderContent()}
          </main>
        </div>
      </div>

      {/* Modals */}
      <AddProductForm
        isOpen={showAddProductForm}
        onClose={() => setShowAddProductForm(false)}
        onProductAdded={fetchData}
      />

      {selectedProduct && (
        <EditProductForm
          isOpen={showEditProductForm}
          onClose={() => setShowEditProductForm(false)}
          product={selectedProduct}
          onProductUpdated={fetchData}
        />
      )}

      <AddCustomerForm
        isOpen={showAddCustomerForm}
        onClose={() => setShowAddCustomerForm(false)}
        onCustomerAdded={fetchData}
      />

      <AddDeliveryBoyForm
        isOpen={showAddDeliveryBoyForm}
        onClose={() => setShowAddDeliveryBoyForm(false)}
        onDeliveryBoyAdded={fetchData}
      />

      {selectedDeliveryBoy && (
        <ManageDeliveryBoyModal
          isOpen={showManageDeliveryBoyModal}
          onClose={() => setShowManageDeliveryBoyModal(false)}
          deliveryBoy={selectedDeliveryBoy}
          onUpdated={fetchData}
        />
      )}

      <OrderManagementModal
        isOpen={showOrderManagementModal}
        onClose={() => setShowOrderManagementModal(false)}
        dairyId={user?.dairyId || ''}
      />

      <MakeDeliveryForm
        isOpen={showMakeDeliveryForm}
        onClose={() => setShowMakeDeliveryForm(false)}
        dairyId={user?.dairyId || ''}
      />

      {selectedCustomer && (
        <CustomerManagementModal
          isOpen={showCustomerManagementModal}
          onClose={() => setShowCustomerManagementModal(false)}
          customer={selectedCustomer}
          onCustomerUpdated={fetchData}
        />
      )}
    </SidebarProvider>
  );
};
