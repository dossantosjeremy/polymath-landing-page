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

interface Domain {
  value: string;
  count: number;
}

interface DomainCarouselProps {
  selectedDomain?: string;
  onSelect: (domain: string) => void;
}

export const DomainCarousel = ({ selectedDomain, onSelect }: DomainCarouselProps) => {
  const { t } = useTranslation();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    try {
      const { data, error } = await supabase
        .from("disciplines")
        .select("l1")
        .not("l1", "is", null);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data.forEach((item) => {
        counts[item.l1] = (counts[item.l1] || 0) + 1;
      });

      const uniqueDomains = Object.entries(counts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value));

      setDomains(uniqueDomains);
    } catch (error) {
      console.error("Error loading domains:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{t('explore.selectDomain')}</h2>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 w-72 flex-shrink-0 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{t('explore.selectDomain')}</h2>
      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {domains.map((domain) => (
            <CarouselItem key={domain.value} className="pl-4 basis-auto">
              <DisciplineCard
                name={domain.value}
                description={t(`domainDescriptions.${domain.value}`, { defaultValue: '' })}
                isSelected={selectedDomain === domain.value}
                onClick={() => onSelect(domain.value)}
                size="large"
                childCount={domain.count}
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
