import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export interface NestedTabItem {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  content?: React.ReactNode;
  subTabs?: NestedTabItem[];
}

interface NestedTabsProps {
  tabs: NestedTabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export function NestedTabs({ 
  tabs, 
  defaultValue, 
  value, 
  onValueChange,
  className 
}: NestedTabsProps) {
  const [activeTab, setActiveTab] = React.useState(value || defaultValue || tabs[0]?.value);
  const [activeSubTab, setActiveSubTab] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (value !== undefined) {
      setActiveTab(value);
    }
  }, [value]);

  const handleTabChange = (newValue: string) => {
    setActiveTab(newValue);
    onValueChange?.(newValue);
    
    // Reset sub-tab when changing main tab
    const tab = tabs.find(t => t.value === newValue);
    if (tab?.subTabs && tab.subTabs.length > 0) {
      setActiveSubTab(tab.subTabs[0].value);
    } else {
      setActiveSubTab(null);
    }
  };

  const currentTab = tabs.find(t => t.value === activeTab);
  const hasSubTabs = currentTab?.subTabs && currentTab.subTabs.length > 0;

  // Initialize sub-tab on first render if needed
  React.useEffect(() => {
    if (hasSubTabs && !activeSubTab && currentTab?.subTabs) {
      setActiveSubTab(currentTab.subTabs[0].value);
    }
  }, [activeTab, hasSubTabs, activeSubTab, currentTab?.subTabs]);

  const currentSubTab = hasSubTabs && currentTab?.subTabs
    ? currentTab.subTabs.find(st => st.value === activeSubTab)
    : null;

  return (
    <div className={cn("w-full", className)}>
      {/* Main Tabs */}
      <TabsPrimitive.Root value={activeTab} onValueChange={handleTabChange}>
        <TabsPrimitive.List className="inline-flex h-11 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-full max-w-md">
          {tabs.map((tab) => (
            <TabsPrimitive.Trigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:pointer-events-none disabled:opacity-50",
                "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
                "flex-1 gap-2"
              )}
            >
              {tab.icon}
              {tab.label}
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>
      </TabsPrimitive.Root>

      {/* Sub Tabs (if any) */}
      {hasSubTabs && currentTab?.subTabs && (
        <TabsPrimitive.Root 
          value={activeSubTab || currentTab.subTabs[0].value} 
          onValueChange={setActiveSubTab}
          className="mt-3"
        >
          <TabsPrimitive.List className="inline-flex h-9 items-center gap-1 text-muted-foreground">
            {currentTab.subTabs.map((subTab) => (
              <TabsPrimitive.Trigger
                key={subTab.value}
                value={subTab.value}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-sm font-medium transition-all",
                  "border-b-2 border-transparent",
                  "hover:text-foreground",
                  "data-[state=active]:border-primary data-[state=active]:text-foreground",
                  "gap-1.5"
                )}
              >
                {subTab.icon}
                {subTab.label}
              </TabsPrimitive.Trigger>
            ))}
          </TabsPrimitive.List>
        </TabsPrimitive.Root>
      )}

      {/* Content */}
      <div className="mt-4">
        {hasSubTabs && currentSubTab ? (
          currentSubTab.content
        ) : (
          currentTab?.content
        )}
      </div>
    </div>
  );
}
