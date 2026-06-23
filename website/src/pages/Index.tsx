import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminDashboard } from '@/components/dashboards/SuperAdminDashboard';
import { DairyOwnerDashboard } from '@/components/dashboards/DairyOwnerDashboard';
import { DeliveryBoyDashboard } from '@/components/dashboards/DeliveryBoyDashboard';
import { CustomerDashboard } from '@/components/dashboards/CustomerDashboard';
import WelcomeWizard from '@/components/onboarding/WelcomeWizard';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ConnectionStatus } from '@/components/ui/connection-status';

const Index = () => {
  const { user, isLoading } = useAuth();
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  // Dashboard-specific head: own title, self canonical, noindex (private surface)
  useEffect(() => {
    document.title = 'Dashboard | DairyFlow';
    const link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const origCanonical = link?.getAttribute('href') || 'https://dairyflow.mywebz.in/';
    if (link) link.setAttribute('href', 'https://dairyflow.mywebz.in/dashboard');
    const robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const origRobots = robots?.getAttribute('content') || 'index, follow';
    if (robots) robots.setAttribute('content', 'noindex, nofollow');
    return () => {
      document.title = "DairyFlow - India's #1 Dairy Delivery Management App";
      if (link) link.setAttribute('href', origCanonical);
      if (robots) robots.setAttribute('content', origRobots);
    };
  }, []);

  // Check if user needs onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setCheckingOnboarding(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking onboarding status:', error);
          setCheckingOnboarding(false);
          return;
        }

        // Show onboarding if not completed
        if (data && !data.onboarding_completed) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('Error checking onboarding:', error);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    if (user && !isLoading) {
      checkOnboardingStatus();
    }
  }, [user, isLoading]);

  const handleOnboardingComplete = async () => {
    if (!user) return;

    try {
      // Mark onboarding as completed in the database
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      setShowOnboarding(false);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setShowOnboarding(false);
    }
  };

  if (isLoading || checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-soft">
        <div className="text-center p-8 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/20 shadow-medium">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-6 text-primary" />
            <div className="absolute inset-0 h-12 w-12 mx-auto rounded-full bg-primary/20 animate-pulse" />
          </div>
          <p className="text-lg font-medium text-foreground mb-2">{t('loading.dashboard')}</p>
          <p className="text-sm text-muted-foreground">{t('loading.dashboardDescription')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  // Show onboarding wizard for new users
  if (showOnboarding) {
    return (
      <WelcomeWizard
        role={user.role}
        userName={user.name}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  // Render email verification banner if needed
  const renderWithVerificationBanner = (dashboard: React.ReactNode) => {
    if (!user.emailVerified) {
      return (
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 pt-4">
            <EmailVerificationBanner email={user.email} />
          </div>
          {dashboard}
        </div>
      );
    }
    return dashboard;
  };

  const getDashboard = () => {
    switch (user.role) {
      case 'super_admin':
        return <SuperAdminDashboard />;
      case 'dairy_owner':
        return <DairyOwnerDashboard />;
      case 'delivery_boy':
        return <DeliveryBoyDashboard />;
      default:
        return <CustomerDashboard />;
    }
  };

  return (
    <>
      {renderWithVerificationBanner(getDashboard())}
      <ConnectionStatus />
    </>
  );
};

export default Index;
