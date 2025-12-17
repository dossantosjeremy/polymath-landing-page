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

interface Domain {
  value: string;
  count: number;
}

interface DomainCarouselProps {
  selectedDomain?: string;
  onSelect: (domain: string) => void;
}

const domainDescriptions: Record<string, string> = {
  "Arts and Humanities": "Literature, philosophy, history & creative arts",
  "Business": "Management, finance, marketing & entrepreneurship",
  "Computer Science": "Programming, algorithms & software development",
  "Data Science": "Analytics, machine learning & data visualization",
  "Education": "Teaching methods, curriculum & learning theory",
  "Engineering": "Civil, mechanical, electrical & systems engineering",
  "Health and Medicine": "Healthcare, biology & medical sciences",
  "Language": "Linguistics, language learning & communication",
  "Law": "Legal studies, policy & governance",
  "Math and Logic": "Mathematics, statistics & logical reasoning",
  "Personal Development": "Skills, productivity & self-improvement",
  "Physical Science": "Physics, chemistry & earth sciences",
  "Social Sciences": "Psychology, sociology & anthropology",
  "Information Technology": "Networks, security & IT infrastructure",
  "Life Sciences": "Biology, ecology & life systems",
  "Medicine and Health Sciences": "Medical research & healthcare sciences",
  "Natural Sciences": "Physics, chemistry & natural phenomena",
  "Agricultural Sciences": "Agriculture, farming & food sciences",
  "Architecture": "Design, buildings & urban planning",
};

export const DomainCarousel = ({ selectedDomain, onSelect }: DomainCarouselProps) => {
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
        <h2 className="text-xl font-semibold">Select a Domain</h2>
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
      <h2 className="text-xl font-semibold">Select a Domain</h2>
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
                description={domainDescriptions[domain.value]}
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
