import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DisciplineCard } from "./DisciplineCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";

interface Specialization {
  value: string;
  count: number;
}

interface SpecializationCarouselProps {
  domain: string;
  subDomain: string;
  selectedSpecialization?: string;
  onSelect: (specialization: string) => void;
}

// Generate contextual image using Unsplash Source API with the specialization name
const getSpecializationImage = (specialization: string, subDomain?: string): string => {
  // Clean the specialization name for use as a search query
  const searchTerm = specialization.toLowerCase().replace(/[^a-z0-9\s]/gi, ' ').trim();
  return `https://source.unsplash.com/600x400/?${encodeURIComponent(searchTerm)}`;
};

export const SpecializationCarousel = ({ 
  domain, 
  subDomain, 
  selectedSpecialization, 
  onSelect 
}: SpecializationCarouselProps) => {
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSpecializations();
  }, [domain, subDomain]);

  const loadSpecializations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("disciplines")
        .select("l3")
        .eq("l1", domain)
        .eq("l2", subDomain)
        .not("l3", "is", null);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data.forEach((item) => {
        if (item.l3) {
          counts[item.l3] = (counts[item.l3] || 0) + 1;
        }
      });

      const uniqueSpecializations = Object.entries(counts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value));

      setSpecializations(uniqueSpecializations);
    } catch (error) {
      console.error("Error loading specializations:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-lg font-semibold text-muted-foreground">
          Select a Specialization in <span className="text-foreground">{subDomain}</span>
        </h2>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 w-56 flex-shrink-0 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (specializations.length === 0) {
    return null; // No specializations - parent handles this case
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-lg font-semibold text-muted-foreground">
        Select a Specialization in <span className="text-foreground">{subDomain}</span>
      </h2>
      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {specializations.map((spec) => (
            <CarouselItem key={spec.value} className="pl-4 basis-auto">
              <DisciplineCard
                name={spec.value}
                imageUrl={getSpecializationImage(spec.value)}
                isSelected={selectedSpecialization === spec.value}
                onClick={() => onSelect(spec.value)}
                size="compact"
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="-left-4" />
        <CarouselNext className="-right-4" />
      </Carousel>
    </div>
  );
};
