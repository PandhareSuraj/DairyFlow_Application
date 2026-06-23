import { Bell, BellOff, Smartphone, Loader2 } from 'lucide-react';
 import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function NotificationSettings() {
   const { t } = useTranslation('notifications');
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe
  } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  if (!isSupported) {
    return (
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BellOff className="h-5 w-5 text-muted-foreground" />
             {t('settingsCard.title')}
          </CardTitle>
          <CardDescription>
             {t('settingsCard.notSupported')}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
           {t('settingsCard.title')}
        </CardTitle>
        <CardDescription>
           {t('settingsCard.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="push-toggle" className="text-sm font-medium">
                 {t('settingsCard.enablePush')}
              </Label>
              <p className="text-xs text-muted-foreground">
                 {t('settingsCard.enableDescription')}
              </p>
            </div>
          </div>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Switch
              id="push-toggle"
              checked={isSubscribed}
              onCheckedChange={handleToggle}
              disabled={permission === 'denied'}
            />
          )}
        </div>

        {permission === 'denied' && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
             {t('settingsCard.blocked')}
          </div>
        )}

        {isSubscribed && (
          <div className="rounded-lg bg-primary/10 p-3 space-y-2">
             <p className="text-sm font-medium text-primary">{t('settingsCard.willReceive')}</p>
            <ul className="text-xs text-muted-foreground space-y-1">
               <li>• {t('settingsCard.deliveryUpdates')}</li>
               <li>• {t('settingsCard.loyaltyPoints')}</li>
               <li>• {t('settingsCard.tierUpgrades')}</li>
               <li>• {t('settingsCard.birthdayAnniversary')}</li>
               <li>• {t('settingsCard.referralCompletions')}</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
