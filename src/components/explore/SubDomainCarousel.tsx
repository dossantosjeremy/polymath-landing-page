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

interface SubDomain {
  value: string;
  count: number;
}

interface SubDomainCarouselProps {
  domain: string;
  selectedSubDomain?: string;
  onSelect: (subDomain: string, hasChildren: boolean) => void;
}

// Generate contextual image using Unsplash Source API with the subdomain name
const getSubDomainImage = (subDomain: string, domain: string): string => {
  // Clean the subdomain name for use as a search query
  const searchTerm = subDomain.toLowerCase().replace(/[^a-z0-9\s]/gi, ' ').trim();
  // Combine with domain for more relevant results
  const query = `${searchTerm} ${domain.toLowerCase()}`.substring(0, 50);
  return `https://source.unsplash.com/600x400/?${encodeURIComponent(query)}`;
};

export const SubDomainCarousel = ({ domain, selectedSubDomain, onSelect }: SubDomainCarouselProps) => {
  const [subDomains, setSubDomains] = useState<SubDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [childCounts, setChildCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadSubDomains();
  }, [domain]);

  const loadSubDomains = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("disciplines")
        .select("l2, l3")
        .eq("l1", domain)
        .not("l2", "is", null);

      if (error) throw error;

      const counts: Record<string, number> = {};
      const children: Record<string, Set<string>> = {};
      
      data.forEach((item) => {
        if (item.l2) {
          counts[item.l2] = (counts[item.l2] || 0) + 1;
          if (!children[item.l2]) children[item.l2] = new Set();
          if (item.l3) children[item.l2].add(item.l3);
        }
      });

      const uniqueSubDomains = Object.entries(counts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value));

      const childCountMap: Record<string, number> = {};
      Object.entries(children).forEach(([key, set]) => {
        childCountMap[key] = set.size;
      });

      setSubDomains(uniqueSubDomains);
      setChildCounts(childCountMap);
    } catch (error) {
      console.error("Error loading sub-domains:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-lg font-semibold text-muted-foreground">
          Select a Category in <span className="text-foreground">{domain}</span>
        </h2>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-40 w-64 flex-shrink-0 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (subDomains.length === 0) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-6 bg-muted/50 rounded-lg text-center">
        <p className="text-muted-foreground">No subcategories available for {domain}.</p>
        <p className="text-sm text-muted-foreground mt-1">You can generate a syllabus directly for this domain.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-lg font-semibold text-muted-foreground">
        Select a Category in <span className="text-foreground">{domain}</span>
      </h2>
      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {subDomains.map((subDomain) => (
            <CarouselItem key={subDomain.value} className="pl-4 basis-auto">
              <DisciplineCard
                name={subDomain.value}
                imageUrl={getSubDomainImage(subDomain.value, domain)}
                isSelected={selectedSubDomain === subDomain.value}
                onClick={() => onSelect(subDomain.value, childCounts[subDomain.value] > 0)}
                size="medium"
                childCount={childCounts[subDomain.value]}
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
