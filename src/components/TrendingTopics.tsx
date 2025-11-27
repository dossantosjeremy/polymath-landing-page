import { ArrowRight, Columns3, Wrench, Palette } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const topics = [
  {
    id: 1,
    title: "Stoicism",
    description: "Explore the ancient philosophy of resilience, virtue, and tranquility in the modern world.",
    icon: Columns3
  },
  {
    id: 2,
    title: "Machine Learning",
    description: "Dive into the fundamentals of algorithms that allow computers to learn from data.",
    icon: Wrench
  },
  {
    id: 3,
    title: "UX Design",
    description: "Learn the principles of creating user-centered products that are both beautiful and effective.",
    icon: Palette
  }
];

export const TrendingTopics = () => {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <h2 className="text-3xl font-serif font-bold text-center mb-12">
        Trending Topics
      </h2>
      
      <div className="grid md:grid-cols-3 gap-6">
        {topics.map((topic) => {
          const Icon = topic.icon;
          return (
            <Card 
              key={topic.id}
              className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2"
            >
              <CardHeader>
                <div className="mb-4 h-16 w-16 rounded-full bg-accent flex items-center justify-center">
                  <Icon className="h-8 w-8 text-accent-foreground" />
                </div>
                <CardTitle className="text-xl font-semibold">
                  {topic.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed mb-4">
                  {topic.description}
                </CardDescription>
                <div className="flex justify-end">
                  <ArrowRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};
