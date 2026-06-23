import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, 
  Truck, 
  Users, 
  Package, 
  MapPin, 
  Bell, 
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  Target,
  Award
} from 'lucide-react';
import { UserRole } from '@/contexts/AuthContext';

interface WelcomeWizardProps {
  role: UserRole;
  userName: string;
  onComplete: () => void;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const WelcomeWizard: React.FC<WelcomeWizardProps> = ({ role, userName, onComplete }) => {
  const { t } = useTranslation(['auth', 'common']);
  const [currentStep, setCurrentStep] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);

  const getStepsForRole = (): WizardStep[] => {
    const commonWelcome: WizardStep = {
      id: 'welcome',
      title: t('auth:onboarding.welcome', { name: userName }),
      description: t('auth:onboarding.welcomeDescription'),
      icon: <Sparkles className="h-12 w-12 text-primary" />,
      content: (
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-24 w-24 rounded-full bg-gradient-primary flex items-center justify-center shadow-strong">
              <Building2 className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-2">
              {t('auth:onboarding.welcomeTitle')}
            </h3>
            <p className="text-muted-foreground">
              {t('auth:onboarding.welcomeMessage')}
            </p>
          </div>
        </div>
      )
    };

    if (role === 'dairy_owner') {
      return [
        commonWelcome,
        {
          id: 'manage-products',
          title: t('auth:onboarding.dairyOwner.manageProducts'),
          description: t('auth:onboarding.dairyOwner.manageProductsDesc'),
          icon: <Package className="h-12 w-12 text-primary" />,
          content: (
            <div className="space-y-4">
              <div className="flex justify-center">
                <Package className="h-16 w-16 text-primary" />
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5" />
                  <span>{t('auth:onboarding.dairyOwner.feature1')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5" />
                  <span>{t('auth:onboarding.dairyOwner.feature2')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5" />
                  <span>{t('auth:onboarding.dairyOwner.feature3')}</span>
                </li>
              </ul>
            </div>
          )
        },
        {
          id: 'manage-team',
          title: t('auth:onboarding.dairyOwner.manageTeam'),
          description: t('auth:onboarding.dairyOwner.manageTeamDesc'),
          icon: <Users className="h-12 w-12 text-primary" />,
          content: (
            <div className="space-y-4">
              <div className="flex justify-center">
                <Users className="h-16 w-16 text-primary" />
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5" />
                  <span>{t('auth:onboarding.dairyOwner.teamFeature1')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5" />
                  <span>{t('auth:onboarding.dairyOwner.teamFeature2')}</span>
                </li>
              </ul>
            </div>
          )
        },
        {
          id: 'ready',
          title: t('auth:onboarding.ready'),
          description: t('auth:onboarding.readyDescription'),
          icon: <Target className="h-12 w-12 text-primary" />,
          content: (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="h-24 w-24 rounded-full bg-success/20 flex items-center justify-center">
                  <Check className="h-12 w-12 text-success" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {t('auth:onboarding.allSet')}
                </h3>
                <p className="text-muted-foreground">
                  {t('auth:onboarding.startJourney')}
                </p>
              </div>
            </div>
          )
        }
      ];
    }

    if (role === 'delivery_boy') {
      return [
        commonWelcome,
        {
          id: 'deliveries',
          title: t('auth:onboarding.deliveryBoy.manageDeliveries'),
          description: t('auth:onboarding.deliveryBoy.manageDeliveriesDesc'),
          icon: <Truck className="h-12 w-12 text-primary" />,
          content: (
            <div className="space-y-4">
              <div className="flex justify-center">
                <Truck className="h-16 w-16 text-primary" />
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5" />
                  <span>{t('auth:onboarding.deliveryBoy.feature1')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5" />
                  <span>{t('auth:onboarding.deliveryBoy.feature2')}</span>
                </li>
              </ul>
            </div>
          )
        },
        {
          id: 'navigation',
          title: t('auth:onboarding.deliveryBoy.navigation'),
          description: t('auth:onboarding.deliveryBoy.navigationDesc'),
          icon: <MapPin className="h-12 w-12 text-primary" />,
          content: (
            <div className="space-y-4">
              <div className="flex justify-center">
                <MapPin className="h-16 w-16 text-primary" />
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5" />
                  <span>{t('auth:onboarding.deliveryBoy.navFeature1')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5" />
                  <span>{t('auth:onboarding.deliveryBoy.navFeature2')}</span>
                </li>
              </ul>
            </div>
          )
        },
        {
          id: 'ready',
          title: t('auth:onboarding.ready'),
          description: t('auth:onboarding.readyDescription'),
          icon: <Target className="h-12 w-12 text-primary" />,
          content: (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="h-24 w-24 rounded-full bg-success/20 flex items-center justify-center">
                  <Check className="h-12 w-12 text-success" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {t('auth:onboarding.allSet')}
                </h3>
                <p className="text-muted-foreground">
                  {t('auth:onboarding.startDelivering')}
                </p>
              </div>
            </div>
          )
        }
      ];
    }

    // Customer role
    return [
      commonWelcome,
      {
        id: 'subscriptions',
        title: t('auth:onboarding.customer.subscriptions'),
        description: t('auth:onboarding.customer.subscriptionsDesc'),
        icon: <Package className="h-12 w-12 text-primary" />,
        content: (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Package className="h-16 w-16 text-primary" />
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-success mt-0.5" />
                <span>{t('auth:onboarding.customer.feature1')}</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-success mt-0.5" />
                <span>{t('auth:onboarding.customer.feature2')}</span>
              </li>
            </ul>
          </div>
        )
      },
      {
        id: 'loyalty',
        title: t('auth:onboarding.customer.loyalty'),
        description: t('auth:onboarding.customer.loyaltyDesc'),
        icon: <Award className="h-12 w-12 text-primary" />,
        content: (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Award className="h-16 w-16 text-primary" />
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-success mt-0.5" />
                <span>{t('auth:onboarding.customer.loyaltyFeature1')}</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-success mt-0.5" />
                <span>{t('auth:onboarding.customer.loyaltyFeature2')}</span>
              </li>
            </ul>
          </div>
        )
      },
      {
        id: 'notifications',
        title: t('auth:onboarding.customer.notifications'),
        description: t('auth:onboarding.customer.notificationsDesc'),
        icon: <Bell className="h-12 w-12 text-primary" />,
        content: (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Bell className="h-16 w-16 text-primary" />
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-success mt-0.5" />
                <span>{t('auth:onboarding.customer.notifFeature1')}</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-success mt-0.5" />
                <span>{t('auth:onboarding.customer.notifFeature2')}</span>
              </li>
            </ul>
          </div>
        )
      },
      {
        id: 'ready',
        title: t('auth:onboarding.ready'),
        description: t('auth:onboarding.readyDescription'),
        icon: <Target className="h-12 w-12 text-primary" />,
        content: (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="h-24 w-24 rounded-full bg-success/20 flex items-center justify-center">
                <Check className="h-12 w-12 text-success" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                {t('auth:onboarding.allSet')}
              </h3>
              <p className="text-muted-foreground">
                {t('auth:onboarding.enjoyService')}
              </p>
            </div>
          </div>
        )
      }
    ];
  };

  const steps = getStepsForRole();
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setAnimationKey(prev => prev + 1);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setAnimationKey(prev => prev + 1);
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-strong border-0">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              {t('common:skip')}
            </Button>
          </div>
          <Progress value={progress} className="h-1" />
          <div className="text-center">
            <CardTitle className="text-xl">{steps[currentStep].title}</CardTitle>
            <CardDescription className="mt-2">
              {steps[currentStep].description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            key={animationKey}
            className="min-h-[200px] flex items-center justify-center animate-fade-in"
          >
            {steps[currentStep].content}
          </div>

          <div className="flex justify-between gap-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              {t('common:back')}
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1 bg-gradient-primary"
            >
              {isLastStep ? t('common:getStarted') : t('common:next')}
              {!isLastStep && <ChevronRight className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WelcomeWizard;
