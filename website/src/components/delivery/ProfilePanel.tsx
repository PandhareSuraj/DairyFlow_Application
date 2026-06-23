import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Phone, 
  Mail, 
  Star, 
  Award, 
  TrendingUp,
  LogOut,
  Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ProfilePanelProps {
  onLogout: () => void;
  onSettingsClick?: () => void;
}

export const ProfilePanel = ({ onLogout, onSettingsClick }: ProfilePanelProps) => {
  const { user } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return 'DB';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Mock performance data
  const performanceData = {
    rating: 4.8,
    totalDeliveries: 156,
    onTimeRate: 95,
    streak: 12
  };

  return (
    <div className="p-4 space-y-4">
      {/* Profile Header */}
      <Card className="bg-gradient-to-br from-primary/10 to-background border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{user?.name || 'Delivery Partner'}</h2>
              <Badge className="mt-1 bg-success/20 text-success border-success/20">
                Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <Star className="h-6 w-6 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{performanceData.rating}</p>
            <p className="text-xs text-muted-foreground">Rating</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <Award className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{performanceData.totalDeliveries}</p>
            <p className="text-xs text-muted-foreground">Total Deliveries</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{performanceData.onTimeRate}%</p>
            <p className="text-xs text-muted-foreground">On-time Rate</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <span className="text-2xl mb-2 block">🔥</span>
            <p className="text-2xl font-bold text-foreground">{performanceData.streak}</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </CardContent>
        </Card>
      </div>

      {/* Contact Info */}
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Contact Information</h3>
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">{user?.email || 'Not set'}</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-2">
        {onSettingsClick && (
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={onSettingsClick}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        )}
        <Button 
          variant="outline" 
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};
