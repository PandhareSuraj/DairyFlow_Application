import * as React from "react";
import { cn } from "@/lib/utils";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = React.useState(false);

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Brief delay to show "back online" message
        setTimeout(() => setWasOffline(false), 3000);
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
}

interface ConnectionStatusProps {
  className?: string;
  onRetry?: () => void;
  showWhenOnline?: boolean;
}

export function ConnectionStatus({
  className,
  onRetry,
  showWhenOnline = false,
}: ConnectionStatusProps) {
  const { isOnline, wasOffline } = useOnlineStatus();

  // Don't show anything if online and not recently offline
  if (isOnline && !wasOffline && !showWhenOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-20 left-1/2 -translate-x-1/2 z-50",
        "px-4 py-2 rounded-full shadow-lg",
        "flex items-center gap-2 text-sm font-medium",
        "animate-slide-up",
        isOnline
          ? "bg-success text-success-foreground"
          : "bg-destructive text-destructive-foreground",
        className
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          <span>Back online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>You're offline</span>
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="h-6 px-2 text-destructive-foreground hover:bg-destructive-foreground/20"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </>
      )}
    </div>
  );
}

interface OfflineBannerProps {
  className?: string;
  lastUpdated?: Date;
}

export function OfflineBanner({ className, lastUpdated }: OfflineBannerProps) {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className={cn(
        "w-full px-4 py-2 bg-warning/10 border-b border-warning/20",
        "flex items-center justify-center gap-2 text-sm",
        "text-warning-foreground",
        className
      )}
    >
      <WifiOff className="h-4 w-4" />
      <span>
        You're offline. Changes will sync when connected.
        {lastUpdated && (
          <span className="text-muted-foreground ml-2">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </span>
    </div>
  );
}
