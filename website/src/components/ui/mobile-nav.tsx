import React, { useState } from 'react';
 import { useTranslation } from 'react-i18next';
import { Menu, X, User, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

interface MobileNavProps {
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
}

export function MobileNav({ onProfileClick, onSettingsClick }: MobileNavProps) {
   const { t } = useTranslation('common');
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
       case 'super_admin': return t('roles.superAdmin');
       case 'dairy_owner': return t('roles.dairyOwner');
       case 'delivery_boy': return t('roles.deliveryBoy');
       default: return t('roles.user');
    }
  };

  return (
    <div className="lg:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80 bg-gradient-card backdrop-blur-xl border-border/20">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-border/20">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                    {getInitials(user?.name || '')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{getRoleLabel(user?.role || '')}</p>
                </div>
              </div>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 py-6 space-y-2">
              <Button 
                variant="ghost" 
                className="w-full justify-start h-12 text-base hover:bg-primary/10"
                onClick={() => {
                  onProfileClick?.();
                  setIsOpen(false);
                }}
              >
                <User className="mr-3 h-5 w-5" />
                 {t('navigation.profile')}
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full justify-start h-12 text-base hover:bg-primary/10"
                onClick={() => {
                  onSettingsClick?.();
                  setIsOpen(false);
                }}
              >
                <Settings className="mr-3 h-5 w-5" />
                 {t('navigation.settings')}
              </Button>
            </div>

            {/* Logout */}
            <div className="pt-6 border-t border-border/20">
              <Button 
                variant="ghost" 
                className="w-full justify-start h-12 text-base text-destructive hover:bg-destructive/10"
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
              >
                <LogOut className="mr-3 h-5 w-5" />
                 {t('navigation.signOut')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}