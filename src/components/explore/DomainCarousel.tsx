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
import { getPrimaryImageUrl, getFallbackImageUrl, getDomainFallbackImage } from "./imageUtils";

interface Domain {
  value: string;
  count: number;
}

interface DomainCarouselProps {
  selectedDomain?: string;
  onSelect: (domain: string) => void;
}

// Domain-specific curated images from Unsplash (hand-picked for quality)
const domainImages: Record<string, string> = {
  "Agricultural Sciences": "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&q=80",
  "Architecture": "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=600&q=80",
  "Arts and Humanities": "https://images.unsplash.com/photo-1544928147-79a2dbc1f389?w=600&q=80",
  "Business": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=80",
  "Computer Science": "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&q=80",
  "Data Science": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80",
  "Education": "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=600&q=80",
  "Engineering": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80",
  "Health and Medicine": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&q=80",
  "Language": "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&q=80",
  "Law": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80",
  "Math and Logic": "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&q=80",
  "Personal Development": "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&q=80",
  "Physical Science": "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=600&q=80",
  "Social Sciences": "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=600&q=80",
  "Information Technology": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80",
  "Life Sciences": "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=600&q=80",
  "Medicine and Health Sciences": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&q=80",
  "Natural Sciences": "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=600&q=80",
};

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
};

// Get image for domain - use curated if available, otherwise use unique signature
const getDomainImage = (domain: string): string => {
  return domainImages[domain] || getPrimaryImageUrl(domain);
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
                imageUrl={getDomainImage(domain.value)}
                fallbackImageUrl={getFallbackImageUrl(domain.value)}
                categoryFallbackUrl={getDomainFallbackImage(domain.value)}
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
