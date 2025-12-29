import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { getGradientFromName } from "./imageUtils";

interface DisciplineCardProps {
  name: string;
  description?: string;
  context?: string;
  isSelected?: boolean;
  onClick: () => void;
  size?: 'large' | 'medium' | 'compact';
  childCount?: number;
}

export const DisciplineCard = ({
  name,
  description,
  isSelected = false,
  onClick,
  size = 'large',
  childCount
}: DisciplineCardProps) => {
  const sizeClasses = {
    large: 'h-48 w-72',
    medium: 'h-40 w-64',
    compact: 'h-32 w-56'
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all duration-300 flex-shrink-0",
        "hover:scale-[1.02] hover:shadow-xl",
        sizeClasses[size],
        isSelected && "ring-2 ring-primary scale-[1.02] shadow-xl"
      )}
    >
      {/* Gradient background */}
      <div 
        className="absolute inset-0"
        style={{ background: getGradientFromName(name) }}
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className={cn(
          "text-white font-semibold leading-tight",
          size === 'large' && "text-lg",
          size === 'medium' && "text-base",
          size === 'compact' && "text-sm"
        )}>
          {name}
        </h3>
        {description && (
          <p className="text-white/70 text-sm truncate mt-1">{description}</p>
        )}
        {childCount !== undefined && childCount > 0 && (
          <p className="text-white/60 text-xs mt-1">
            {childCount} {childCount === 1 ? 'subcategory' : 'subcategories'}
          </p>
        )}
      </div>
    </Card>
  );
};
