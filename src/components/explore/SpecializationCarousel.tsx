import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { useDisciplineTable } from "@/hooks/useDisciplineTable";

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

export const SpecializationCarousel = ({ 
  domain,
  subDomain, 
  selectedSpecialization, 
  onSelect 
}: SpecializationCarouselProps) => {
  const { t } = useTranslation();
  const { tableName } = useDisciplineTable();
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSpecializations();
  }, [domain, subDomain, tableName]);

  const loadSpecializations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(tableName)
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
          {t('explore.selectSpecializationIn', { subdomain: subDomain })}
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
        {t('explore.selectSpecializationIn', { subdomain: subDomain })}
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
                context={subDomain}
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
