import { Button } from "@/components/ui/button";

const disciplines = [
  "Humanities",
  "Computer Science",
  "Business",
  "Arts",
  "Social Sciences",
  "Natural Sciences"
];

export const DiscoveryChips = () => {
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
            >
              {discipline}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
};
