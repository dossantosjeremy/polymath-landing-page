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

// Domain-specific images from Unsplash
const domainImages: Record<string, string> = {
  "Arts and Humanities": "https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=600&q=80",
  "Business": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80",
  "Computer Science": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80",
  "Data Science": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80",
  "Education": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80",
  "Engineering": "https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=600&q=80",
  "Health and Medicine": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80",
  "Language": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&q=80",
  "Law": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80",
  "Math and Logic": "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&q=80",
  "Personal Development": "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&q=80",
  "Physical Science": "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=600&q=80",
  "Social Sciences": "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80",
  "Information Technology": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80",
};

const defaultImage = "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&q=80";

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
                imageUrl={domainImages[domain.value] || defaultImage}
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
