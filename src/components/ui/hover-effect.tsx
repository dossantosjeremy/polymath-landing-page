import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

export interface HoverEffectItem {
  title: string;
  description?: string;
  childCount?: number;
}

interface HoverEffectProps {
  items: HoverEffectItem[];
  selectedIndex?: number;
  onSelect: (index: number) => void;
  className?: string;
}

export const HoverEffect = ({
  items,
  selectedIndex,
  onSelect,
  className,
}: HoverEffectProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
        className
      )}
    >
      {items.map((item, idx) => (
        <div
          key={idx}
          className="relative group block p-2 h-full w-full cursor-pointer"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
          onClick={() => onSelect(idx)}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0 h-full w-full bg-primary/10 block rounded-2xl"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { duration: 0.15 },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, delay: 0.2 },
                }}
              />
            )}
          </AnimatePresence>
          <Card isSelected={selectedIndex === idx}>
            <CardTitle>{item.title}</CardTitle>
            {item.description && (
              <CardDescription>{item.description}</CardDescription>
            )}
            {item.childCount !== undefined && item.childCount > 0 && (
              <p className="text-zinc-400 text-xs mt-2">
                {item.childCount} {item.childCount === 1 ? 'subcategory' : 'subcategories'}
              </p>
            )}
          </Card>
        </div>
      ))}
    </div>
  );
};

const Card = ({
  className,
  children,
  isSelected = false,
}: {
  className?: string;
  children: React.ReactNode;
  isSelected?: boolean;
}) => {
  return (
    <div
      className={cn(
        "rounded-2xl h-full w-full p-4 overflow-hidden bg-card border border-border group-hover:border-primary/50 relative z-20 transition-all duration-200",
        isSelected && "ring-2 ring-primary border-primary",
        className
      )}
    >
      <div className="relative z-50">
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

const CardTitle = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <h4 className={cn("text-foreground font-bold tracking-wide", className)}>
      {children}
    </h4>
  );
};

const CardDescription = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <p
      className={cn(
        "mt-2 text-muted-foreground tracking-wide leading-relaxed text-sm",
        className
      )}
    >
      {children}
    </p>
  );
};

export { Card as HoverCard, CardTitle as HoverCardTitle, CardDescription as HoverCardDescription };
