import React, { useState } from 'react';
 import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Bell, Shield, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsModal = ({ open, onOpenChange }: SettingsModalProps) => {
   const { t } = useTranslation('common');
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    notifications: {
      emailNotifications: true,
      pushNotifications: false,
      orderUpdates: true,
      systemAlerts: true,
    },
    appearance: {
      theme: 'system',
      language: 'en',
      dateFormat: 'DD/MM/YYYY',
      timezone: 'Asia/Kolkata',
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: '30',
      passwordExpiry: '90',
    },
  });

  const handleSave = () => {
    toast({
       title: t('settingsModal.settingsSaved'),
       description: t('settingsModal.settingsDescription'),
    });
    onOpenChange(false);
  };

  const updateNotificationSetting = (key: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value,
      },
    }));
  };

  const updateAppearanceSetting = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        [key]: value,
      },
    }));
  };

  const updateSecuritySetting = (key: string, value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      security: {
        ...prev.security,
        [key]: value,
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
             {t('settingsModal.title')}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
             <TabsTrigger value="profile">{t('settingsModal.tabs.profile')}</TabsTrigger>
             <TabsTrigger value="notifications">{t('settingsModal.tabs.notifications')}</TabsTrigger>
             <TabsTrigger value="appearance">{t('settingsModal.tabs.appearance')}</TabsTrigger>
             <TabsTrigger value="security">{t('settingsModal.tabs.security')}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                   {t('settingsModal.personalInfo.title')}
                </CardTitle>
                <CardDescription>
                   {t('settingsModal.personalInfo.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                   <Label htmlFor="birthday">{t('settingsModal.personalInfo.birthday')}</Label>
                  <Input
                    id="birthday"
                    type="date"
                     placeholder={t('settingsModal.personalInfo.selectBirthday')}
                  />
                  <p className="text-xs text-muted-foreground">
                     {t('settingsModal.personalInfo.birthdayHint')}
                  </p>
                </div>

                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                   <h4 className="font-medium text-sm mb-2 text-foreground">{t('settingsModal.personalInfo.birthdayRewards')}</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>🥉 Bronze: 50 points</li>
                    <li>🥈 Silver: 100 points</li>
                    <li>🥇 Gold: 200 points</li>
                    <li>💎 Platinum: 500 points</li>
                  </ul>
                </div>

                <div className="p-4 bg-secondary/5 rounded-lg border border-secondary/20">
                   <h4 className="font-medium text-sm mb-2 text-foreground">{t('settingsModal.personalInfo.anniversaryRewards')}</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                     {t('settingsModal.personalInfo.anniversaryHint')}
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>🥉 Bronze: 100 points</li>
                    <li>🥈 Silver: 250 points</li>
                    <li>🥇 Gold: 500 points</li>
                    <li>💎 Platinum: 1000 points</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            {/* Push Notifications Card */}
            <NotificationSettings />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                   {t('settingsModal.notifications.title')}
                </CardTitle>
                <CardDescription>
                   {t('settingsModal.notifications.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                     <Label>{t('settingsModal.notifications.emailNotifications')}</Label>
                    <p className="text-sm text-muted-foreground">
                       {t('settingsModal.notifications.emailDescription')}
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.emailNotifications}
                    onCheckedChange={(checked) => updateNotificationSetting('emailNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                     <Label>{t('settingsModal.notifications.orderUpdates')}</Label>
                    <p className="text-sm text-muted-foreground">
                       {t('settingsModal.notifications.orderDescription')}
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.orderUpdates}
                    onCheckedChange={(checked) => updateNotificationSetting('orderUpdates', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                     <Label>{t('settingsModal.notifications.systemAlerts')}</Label>
                    <p className="text-sm text-muted-foreground">
                       {t('settingsModal.notifications.systemDescription')}
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.systemAlerts}
                    onCheckedChange={(checked) => updateNotificationSetting('systemAlerts', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                   {t('settingsModal.appearance.title')}
                </CardTitle>
                <CardDescription>
                   {t('settingsModal.appearance.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                   <Label>{t('settingsModal.appearance.theme')}</Label>
                  <Select value={settings.appearance.theme} onValueChange={(value) => updateAppearanceSetting('theme', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                       <SelectItem value="light">{t('settingsModal.appearance.themeLight')}</SelectItem>
                       <SelectItem value="dark">{t('settingsModal.appearance.themeDark')}</SelectItem>
                       <SelectItem value="system">{t('settingsModal.appearance.themeSystem')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                   <Label>{t('settingsModal.appearance.language')}</Label>
                  <Select value={settings.appearance.language} onValueChange={(value) => updateAppearanceSetting('language', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="mr">Marathi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                   <Label>{t('settingsModal.appearance.dateFormat')}</Label>
                  <Select value={settings.appearance.dateFormat} onValueChange={(value) => updateAppearanceSetting('dateFormat', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                   <Label>{t('settingsModal.appearance.timezone')}</Label>
                  <Select value={settings.appearance.timezone} onValueChange={(value) => updateAppearanceSetting('timezone', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                   {t('settingsModal.security.title')}
                </CardTitle>
                <CardDescription>
                   {t('settingsModal.security.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                     <Label>{t('settingsModal.security.twoFactor')}</Label>
                    <p className="text-sm text-muted-foreground">
                       {t('settingsModal.security.twoFactorDescription')}
                    </p>
                  </div>
                  <Switch
                    checked={settings.security.twoFactorAuth}
                    onCheckedChange={(checked) => updateSecuritySetting('twoFactorAuth', checked)}
                  />
                </div>

                <div className="space-y-2">
                   <Label>{t('settingsModal.security.sessionTimeout')}</Label>
                  <Select value={settings.security.sessionTimeout} onValueChange={(value) => updateSecuritySetting('sessionTimeout', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                   <Label>{t('settingsModal.security.passwordExpiry')}</Label>
                  <Select value={settings.security.passwordExpiry} onValueChange={(value) => updateSecuritySetting('passwordExpiry', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                       <SelectItem value="never">{t('settingsModal.security.never')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4">
                  <Button variant="outline" className="w-full">
                     {t('settingsModal.security.changePassword')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} className="flex-1">
             {t('settingsModal.saveSettings')}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
             {t('cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};