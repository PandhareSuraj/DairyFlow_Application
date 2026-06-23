import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { FeatureCard, FeatureCardGrid } from './FeatureCard';
import { MockupFrame } from './MockupFrame';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DairyOwnerMockup, DeliveryMockup, CustomerMockup, AdminMockup } from './mockups';
import { InlineLeadForm } from './InlineLeadForm';

import { 
  Building2, Truck, Users, Shield, Megaphone,
  Package, MapPin, BarChart3, Bell,
  Route, Clock, Wallet, Navigation,
  Gift, Heart, Calendar, Star,
  Settings, Database, UserCog, Activity
} from 'lucide-react';

type UserRole = 'dairy_owner' | 'delivery' | 'customer' | 'admin';

const roleIcons: Record<UserRole, React.ElementType> = {
  dairy_owner: Building2,
  delivery: Truck,
  customer: Users,
  admin: Shield,
};

const featureIcons: Record<UserRole, React.ElementType[]> = {
  dairy_owner: [Package, Users, Truck, MapPin, BarChart3, Bell],
  delivery: [Route, Clock, Wallet, Navigation, Bell, Star],
  customer: [Calendar, Package, Gift, Heart, Bell, Star],
  admin: [Building2, Database, UserCog, Settings, Shield, Activity],
};

const DashboardMockups: Record<UserRole, React.ComponentType> = {
  dairy_owner: DairyOwnerMockup,
  delivery: DeliveryMockup,
  customer: CustomerMockup,
  admin: AdminMockup,
};

export function FeaturesShowcase() {
  const { t } = useTranslation('tour');
  const [activeRole, setActiveRole] = useState<UserRole>('dairy_owner');
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const roles: UserRole[] = ['dairy_owner', 'delivery', 'customer', 'admin'];
  
  const getRoleLabel = (role: UserRole) => {
    const roleMap: Record<UserRole, string> = {
      dairy_owner: 'dairyOwner',
      delivery: 'delivery',
      customer: 'customer',
      admin: 'admin',
    };
    return t(`features.roles.${roleMap[role]}`);
  };

  const getFeatures = (role: UserRole) => {
    const roleMap: Record<UserRole, string> = {
      dairy_owner: 'dairyOwner',
      delivery: 'delivery',
      customer: 'customer',
      admin: 'admin',
    };
    return t(`features.${roleMap[role]}`, { returnObjects: true }) as Array<{ title: string; description: string }>;
  };

  return (
    <section 
      id="features"
      ref={ref as React.RefObject<HTMLDivElement>}
      className="py-24 px-4 scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className={cn(
          'text-center mb-12 transition-all duration-700',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        )}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('features.title')} <span className="text-primary">{t('features.titleHighlight')}</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('features.subtitle')}
          </p>
        </div>

        {/* Role tabs */}
        <Tabs 
          value={activeRole} 
          onValueChange={(v) => setActiveRole(v as UserRole)}
          className={cn(
            'transition-all duration-700 delay-200',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full max-w-2xl mx-auto mb-12 h-auto p-1">
            {roles.map((role) => {
              const RoleIcon = roleIcons[role];
              return (
                <TabsTrigger 
                  key={role} 
                  value={role}
                  className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <RoleIcon className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">{getRoleLabel(role)}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {roles.map((role) => {
            const features = getFeatures(role);
            const icons = featureIcons[role];
            
            return (
              <TabsContent key={role} value={role} className="mt-0">
                <div className="grid lg:grid-cols-2 gap-12 items-start">
                  {/* Dashboard mockup */}
                  <div className="order-2 lg:order-1">
                    <MockupFrame type={role === 'delivery' || role === 'customer' ? 'mobile' : 'desktop'}>
                      {React.createElement(DashboardMockups[role])}
                    </MockupFrame>
                  </div>

                  {/* Feature cards */}
                  <div className="order-1 lg:order-2">
                    <FeatureCardGrid columns={2}>
                      {features.map((feature, index) => (
                        <FeatureCard
                          key={index}
                          icon={icons[index] || Package}
                          title={feature.title}
                          description={feature.description}
                          index={index}
                          isVisible={isVisible}
                        />
                      ))}
                    </FeatureCardGrid>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </section>
  );
}

export function LeadBanner() {
  const { t } = useTranslation('tour');
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  return (
    <section
      ref={ref as React.RefObject<HTMLDivElement>}
      className={cn(
        'py-16 px-4 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-y border-primary/10 transition-all duration-700',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      )}
    >
      <div className="max-w-4xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
          <Megaphone className="w-4 h-4" />
          {t('leadMagnet.banner.badge')}
        </div>
        <h3 className="text-2xl md:text-3xl font-bold text-foreground">
          {t('leadMagnet.banner.title')}
        </h3>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t('leadMagnet.banner.description')}
        </p>
        <InlineLeadForm variant="banner" />
        <p className="text-xs text-muted-foreground">{t('leadMagnet.privacyNote')}</p>
      </div>
    </section>
  );
}
