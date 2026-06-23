import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

interface MobileTabsProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
}

export function MobileTabs({ tabs, defaultTab, className }: MobileTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Mobile Tab Navigation */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/20 px-4 py-3">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex space-x-2">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "flex-shrink-0 h-10 px-4 text-sm font-medium transition-all duration-200",
                  activeTab === tab.id 
                    ? "bg-primary text-primary-foreground shadow-soft" 
                    : "hover:bg-primary/10 text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon && <span className="mr-2">{tab.icon}</span>}
                {tab.label}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full animate-fade-in">
          {activeTabContent}
        </div>
      </div>
    </div>
  );
}