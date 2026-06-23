import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  ShoppingBag, 
  Users, 
  Truck, 
  Bell, 
  Search, 
  FileText,
  Calendar,
  Gift,
  Star,
  type LucideIcon 
} from "lucide-react";

const illustrations: Record<string, LucideIcon> = {
  orders: ShoppingBag,
  products: Package,
  customers: Users,
  deliveries: Truck,
  notifications: Bell,
  search: Search,
  documents: FileText,
  schedule: Calendar,
  rewards: Gift,
  ratings: Star,
};

interface EmptyStateProps {
  type?: keyof typeof illustrations;
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyState({
  type,
  icon: CustomIcon,
  title,
  description,
  action,
  className,
  size = "md",
}: EmptyStateProps) {
  const Icon = CustomIcon || (type ? illustrations[type] : Package);
  
  const sizeClasses = {
    sm: {
      container: "py-6 px-4",
      icon: "h-10 w-10",
      iconWrapper: "h-16 w-16",
      title: "text-base",
      description: "text-sm",
    },
    md: {
      container: "py-10 px-6",
      icon: "h-12 w-12",
      iconWrapper: "h-20 w-20",
      title: "text-lg",
      description: "text-sm",
    },
    lg: {
      container: "py-16 px-8",
      icon: "h-16 w-16",
      iconWrapper: "h-28 w-28",
      title: "text-xl",
      description: "text-base",
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center animate-fade-in",
        sizes.container,
        className
      )}
    >
      <div
        className={cn(
          "rounded-full bg-muted/50 flex items-center justify-center mb-4",
          "animate-bounce-subtle",
          sizes.iconWrapper
        )}
      >
        <Icon className={cn("text-muted-foreground/60", sizes.icon)} />
      </div>
      <h3 className={cn("font-semibold text-foreground mb-1", sizes.title)}>
        {title}
      </h3>
      {description && (
        <p className={cn("text-muted-foreground max-w-sm", sizes.description)}>
          {description}
        </p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          className="mt-4"
          size={size === "sm" ? "sm" : "default"}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
