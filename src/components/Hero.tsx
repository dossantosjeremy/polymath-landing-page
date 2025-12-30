import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export const Hero = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleExplore = () => {
    navigate("/explore");
  };

  return (
    <section className="max-w-5xl mx-auto px-6 py-20 md:py-32">
      <div className="text-center space-y-8">
        <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight">
          {t('home.heroTitle')}
        </h1>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative">
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('home.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-32 h-14 text-base rounded-full border-2"
            />
            <Button
              type="submit"
              className="absolute right-1 h-12 px-8 rounded-full font-medium"
            >
              {t('home.search')}
            </Button>
          </div>
        </form>

        <div className="pt-4">
          <button
            onClick={handleExplore}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            {t('home.browseAll')}
          </button>
        </div>
      </div>
    </section>
  );
};
