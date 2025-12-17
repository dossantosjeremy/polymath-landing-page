import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { getGradientFromName } from "./imageUtils";

interface DisciplineCardProps {
  name: string;
  description?: string;
  imageUrl: string;
  fallbackImageUrl?: string;
  categoryFallbackUrl?: string;
  isSelected?: boolean;
  onClick: () => void;
  size?: 'large' | 'medium' | 'compact';
  childCount?: number;
}

export const DisciplineCard = ({
  name,
  description,
  imageUrl,
  fallbackImageUrl,
  categoryFallbackUrl,
  isSelected = false,
  onClick,
  size = 'large',
  childCount
}: DisciplineCardProps) => {
  const [imageLoadAttempt, setImageLoadAttempt] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const sizeClasses = {
    large: 'h-48 w-72',
    medium: 'h-40 w-64',
    compact: 'h-32 w-56'
  };

  // Determine which image URL to use based on attempts
  const getCurrentImageUrl = (): string | null => {
    switch (imageLoadAttempt) {
      case 0: return imageUrl;
      case 1: return fallbackImageUrl || categoryFallbackUrl || null;
      case 2: return categoryFallbackUrl || null;
      default: return null;
    }
  };

  const handleImageError = () => {
    const nextAttempt = imageLoadAttempt + 1;
    
    // Check if we have more fallbacks to try
    if (nextAttempt === 1 && (fallbackImageUrl || categoryFallbackUrl)) {
      setImageLoadAttempt(1);
    } else if (nextAttempt === 2 && categoryFallbackUrl && fallbackImageUrl) {
      setImageLoadAttempt(2);
    } else {
      // No more fallbacks, show gradient
      setImageLoadAttempt(3);
      setIsLoading(false);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const currentUrl = getCurrentImageUrl();

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
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}
      
      {/* Image or Gradient fallback */}
      {currentUrl ? (
        <img 
          src={currentUrl} 
          alt={name}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
            isLoading && "opacity-0"
          )}
        />
      ) : (
        <div 
          className="absolute inset-0"
          style={{ background: getGradientFromName(name) }}
        />
      )}
      
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
