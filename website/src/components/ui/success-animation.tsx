import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, Sparkles, Coins } from "lucide-react";

interface SuccessAnimationProps {
  type?: "check" | "celebration" | "points";
  size?: "sm" | "md" | "lg";
  className?: string;
  onComplete?: () => void;
}

export function SuccessAnimation({
  type = "check",
  size = "md",
  className,
  onComplete,
}: SuccessAnimationProps) {
  React.useEffect(() => {
    if (onComplete) {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [onComplete]);

  const sizeClasses = {
    sm: { wrapper: "h-12 w-12", icon: "h-5 w-5" },
    md: { wrapper: "h-16 w-16", icon: "h-7 w-7" },
    lg: { wrapper: "h-24 w-24", icon: "h-10 w-10" },
  };

  const sizes = sizeClasses[size];

  if (type === "check") {
    return (
      <div className={cn("relative", className)}>
        <div
          className={cn(
            "rounded-full bg-success flex items-center justify-center",
            "animate-success-circle",
            sizes.wrapper
          )}
        >
          <Check
            className={cn("text-success-foreground animate-success-check", sizes.icon)}
            strokeWidth={3}
          />
        </div>
        {/* Ripple effect */}
        <div
          className={cn(
            "absolute inset-0 rounded-full bg-success/30 animate-success-ripple",
            sizes.wrapper
          )}
        />
      </div>
    );
  }

  if (type === "celebration") {
    return (
      <div className={cn("relative", className)}>
        <div
          className={cn(
            "rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center",
            "animate-bounce-in",
            sizes.wrapper
          )}
        >
          <Sparkles className={cn("text-primary-foreground", sizes.icon)} />
        </div>
        {/* Confetti particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-confetti"
              style={{
                left: "50%",
                top: "50%",
                backgroundColor: ["#FFD700", "#FF6B6B", "#4ECDC4", "#A855F7", "#F472B6", "#34D399"][i],
                animationDelay: `${i * 0.1}s`,
                transform: `rotate(${i * 60}deg)`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (type === "points") {
    return (
      <div className={cn("relative", className)}>
        <div
          className={cn(
            "rounded-full bg-warning flex items-center justify-center",
            "animate-bounce-in",
            sizes.wrapper
          )}
        >
          <Coins className={cn("text-warning-foreground animate-coin-flip", sizes.icon)} />
        </div>
        {/* Floating +points */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 animate-float-up text-sm font-bold text-warning">
          +10
        </div>
      </div>
    );
  }

  return null;
}

interface SuccessOverlayProps {
  show: boolean;
  message?: string;
  type?: "check" | "celebration" | "points";
  onComplete?: () => void;
}

export function SuccessOverlay({
  show,
  message,
  type = "check",
  onComplete,
}: SuccessOverlayProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center gap-4">
        <SuccessAnimation type={type} size="lg" onComplete={onComplete} />
        {message && (
          <p className="text-lg font-medium text-foreground animate-fade-in-up">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
