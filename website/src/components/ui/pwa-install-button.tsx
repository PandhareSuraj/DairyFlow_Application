import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
  className?: string;
  label?: string;
}

export function PWAInstallButton({ 
  variant = 'outline', 
  size = 'sm', 
  className,
  label = 'Install App' 
}: PWAInstallButtonProps) {
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();

  if (isInstalled || !canInstall) return null;

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={promptInstall}
    >
      <Download className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}
