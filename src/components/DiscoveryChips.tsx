import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const disciplines = [
  "Humanities",
  "Computer Science",
  "Business",
  "Arts",
  "Social Sciences",
  "Natural Sciences"
];

export const DiscoveryChips = () => {
  const navigate = useNavigate();

  const handleChipClick = (discipline: string) => {
    navigate(`/explore?q=${encodeURIComponent(discipline)}`);
  };

  return (
    <section className="max-w-5xl mx-auto px-6 py-12">
      <div className="text-center space-y-6">
        <p className="text-muted-foreground">Or explore disciplines</p>
        
        <div className="flex flex-wrap justify-center gap-3">
          {disciplines.map((discipline) => (
            <Button
              key={discipline}
              variant="secondary"
              className="rounded-full px-6 h-11 font-normal text-base"
              onClick={() => handleChipClick(discipline)}
            >
              {discipline}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
};
