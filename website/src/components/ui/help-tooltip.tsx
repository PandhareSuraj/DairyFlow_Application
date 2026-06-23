import * as React from "react";
import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface HelpTooltipProps {
  content: string | React.ReactNode;
  title?: string;
  className?: string;
  iconClassName?: string;
  side?: "top" | "right" | "bottom" | "left";
  /** Use popover instead of tooltip for longer content */
  asPopover?: boolean;
}

export function HelpTooltip({
  content,
  title,
  className,
  iconClassName,
  side = "top",
  asPopover = false,
}: HelpTooltipProps) {
  const triggerButton = (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-full",
        "text-muted-foreground hover:text-foreground",
        "hover:bg-muted/50 transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "h-5 w-5",
        className
      )}
      aria-label="Help information"
    >
      <HelpCircle className={cn("h-4 w-4", iconClassName)} />
    </button>
  );

  if (asPopover) {
    return (
      <Popover>
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
        <PopoverContent side={side} className="max-w-xs">
          {title && <p className="font-medium mb-1">{title}</p>}
          <div className="text-sm text-muted-foreground">{content}</div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          {title && <p className="font-medium mb-1">{title}</p>}
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface HelpLabelProps {
  label: string;
  help: string;
  htmlFor?: string;
  className?: string;
  required?: boolean;
}

export function HelpLabel({
  label,
  help,
  htmlFor,
  className,
  required,
}: HelpLabelProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <HelpTooltip content={help} />
    </div>
  );
}
