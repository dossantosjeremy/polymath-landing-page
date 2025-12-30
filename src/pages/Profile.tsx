import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Navigation } from "@/components/Navigation";

interface CustomSource {
  name: string;
  url: string;
  type: "Custom";
}

interface AuthoritativeSource {
  id: string;
  name: string;
  domain: string;
  tier: string;
  tierName: string;
}

const AUTHORITATIVE_SOURCES: AuthoritativeSource[] = [
  // Tier 1A - University OCW
  { id: "open_syllabus", name: "Open Syllabus", domain: "opensyllabus.org", tier: "1A", tierName: "University OpenCourseWare" },
  { id: "mit_ocw", name: "MIT OCW", domain: "ocw.mit.edu", tier: "1A", tierName: "University OpenCourseWare" },
  { id: "yale_oyc", name: "Yale Open Courses", domain: "oyc.yale.edu", tier: "1A", tierName: "University OpenCourseWare" },
  { id: "harvard_extension", name: "Harvard Extension", domain: "pll.harvard.edu", tier: "1A", tierName: "University OpenCourseWare" },
  { id: "cmu_oli", name: "Carnegie Mellon OLI", domain: "oli.cmu.edu", tier: "1A", tierName: "University OpenCourseWare" },
  { id: "hillsdale", name: "Hillsdale College", domain: "hillsdale.edu", tier: "1A", tierName: "University OpenCourseWare" },
  { id: "saylor", name: "Saylor Academy", domain: "saylor.org", tier: "1A", tierName: "University OpenCourseWare" },
  // Tier 1B - Great Books
  { id: "st_johns", name: "St. John's College", domain: "sjc.edu", tier: "1B", tierName: "Great Books Programs" },
  { id: "uchicago_basic", name: "UChicago Basic Program", domain: "graham.uchicago.edu", tier: "1B", tierName: "Great Books Programs" },
  { id: "great_books_academy", name: "Great Books Academy", domain: "greatbooksacademy.org", tier: "1B", tierName: "Great Books Programs" },
  { id: "sattler", name: "Sattler College", domain: "sattler.edu", tier: "1B", tierName: "Great Books Programs" },
  { id: "harvard_classics", name: "Harvard Classics", domain: "archive.org", tier: "1B", tierName: "Great Books Programs" },
  // Tier 1C - Philosophy
  { id: "daily_idea_philosophy", name: "Daily Idea Philosophy", domain: "thedailyidea.org", tier: "1C", tierName: "Philosophy-Specific" },
  { id: "stanford_encyclopedia", name: "Stanford Encyclopedia", domain: "plato.stanford.edu", tier: "1C", tierName: "Philosophy-Specific" },
  // Tier 2 - MOOCs
  { id: "coursera", name: "Coursera", domain: "coursera.org", tier: "2", tierName: "MOOCs & OER" },
  { id: "edx", name: "edX", domain: "edx.org", tier: "2", tierName: "MOOCs & OER" },
  { id: "khan_academy", name: "Khan Academy", domain: "khanacademy.org", tier: "2", tierName: "MOOCs & OER" },
  { id: "openlearn", name: "OpenLearn", domain: "open.edu/openlearn", tier: "2", tierName: "MOOCs & OER" },
  { id: "oer_commons", name: "OER Commons", domain: "oercommons.org", tier: "2", tierName: "MOOCs & OER" },
  { id: "merlot", name: "MERLOT", domain: "merlot.org", tier: "2", tierName: "MOOCs & OER" },
  { id: "openstax", name: "OpenStax", domain: "openstax.org", tier: "2", tierName: "MOOCs & OER" },
  { id: "oer_project", name: "OER Project", domain: "oerproject.com", tier: "2", tierName: "MOOCs & OER" },
  // Tier 3 - Text Repositories
  { id: "project_gutenberg", name: "Project Gutenberg", domain: "gutenberg.org", tier: "3", tierName: "Text Repositories" },
  { id: "archive_org", name: "Archive.org", domain: "archive.org", tier: "3", tierName: "Text Repositories" },
];

const Profile = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  
  const [fullName, setFullName] = useState("");
  const [enabledSources, setEnabledSources] = useState<string[]>([]);
  const [customSources, setCustomSources] = useState<CustomSource[]>([]);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedTiers, setExpandedTiers] = useState<Record<string, boolean>>({
    "1A": true,
    "1B": false,
    "1C": false,
    "2": false,
    "3": false,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, enabled_sources, custom_sources")
      .eq("id", user?.id)
      .single();

    if (error) {
      console.error("Error loading profile:", error);
      return;
    }

    if (data) {
      setFullName(data.full_name || "");
      const sources = data.enabled_sources as unknown;
      setEnabledSources((sources as string[]) || AUTHORITATIVE_SOURCES.map(s => s.id));
      const customs = data.custom_sources as unknown;
      setCustomSources((customs as CustomSource[]) || []);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        enabled_sources: enabledSources as any,
        custom_sources: customSources as any,
      })
      .eq("id", user?.id);

    if (error) {
      toast({
        title: t('common.error'),
        description: t('errors.generic'),
        variant: "destructive",
      });
    } else {
      toast({
        title: t('toasts.profileUpdated'),
        description: t('toasts.profileUpdatedDesc'),
      });
    }
    setSaving(false);
  };

  const toggleSource = (sourceId: string) => {
    setEnabledSources(prev =>
      prev.includes(sourceId)
        ? prev.filter(id => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  const toggleTier = (tier: string) => {
    setExpandedTiers(prev => ({ ...prev, [tier]: !prev[tier] }));
  };

  const addCustomSource = () => {
    if (!newSourceName.trim() || !newSourceUrl.trim()) {
      toast({
        title: t('common.error'),
        description: t('errors.generic'),
        variant: "destructive",
      });
      return;
    }

    setCustomSources(prev => [
      ...prev,
      { name: newSourceName.trim(), url: newSourceUrl.trim(), type: "Custom" },
    ]);
    setNewSourceName("");
    setNewSourceUrl("");
  };

  const removeCustomSource = (index: number) => {
    setCustomSources(prev => prev.filter((_, i) => i !== index));
  };

  const groupedSources = AUTHORITATIVE_SOURCES.reduce((acc, source) => {
    if (!acc[source.tier]) {
      acc[source.tier] = { tierName: source.tierName, sources: [] };
    }
    acc[source.tier].sources.push(source);
    return acc;
  }, {} as Record<string, { tierName: string; sources: AuthoritativeSource[] }>);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('profile.backToHome')}
        </button>

        <h1 className="text-3xl font-bold mb-8">{t('profile.title')}</h1>

        {/* Account Section */}
        <div className="mb-8 p-6 border border-border bg-card">
          <h2 className="text-xl font-semibold mb-4">{t('profile.account')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('profile.fullName')}</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('auth.fullNamePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t('profile.email')}</label>
              <Input value={user?.email || ""} disabled className="opacity-60" />
            </div>
          </div>
        </div>

        {/* Authoritative Sources Section */}
        <div className="mb-8 p-6 border border-border bg-card">
          <h2 className="text-xl font-semibold mb-2">{t('profile.authoritativeSources')}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t('profile.authoritativeSourcesDesc')}
          </p>

          <div className="space-y-4">
            {Object.entries(groupedSources).map(([tier, { tierName, sources }]) => (
              <div key={tier}>
                <button
                  onClick={() => toggleTier(tier)}
                  className="flex items-center gap-2 text-sm font-medium mb-2 hover:text-primary transition-colors"
                >
                  <span>{expandedTiers[tier] ? "▼" : "▶"}</span>
                  <span>{tierName} (Tier {tier})</span>
                </button>
                {expandedTiers[tier] && (
                  <div className="ml-6 space-y-2">
                    {sources.map(source => (
                      <div key={source.id} className="flex items-center gap-3">
                        <Checkbox
                          checked={enabledSources.includes(source.id)}
                          onCheckedChange={() => toggleSource(source.id)}
                        />
                        <span className="text-sm flex-1">{source.name}</span>
                        <span className="text-xs text-muted-foreground">{source.domain}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Custom Sources Section */}
        <div className="mb-8 p-6 border border-border bg-card">
          <h2 className="text-xl font-semibold mb-2">{t('profile.customSources')}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t('profile.customSourcesDesc')}
          </p>

          <div className="flex gap-2 mb-4">
            <Input
              placeholder={t('profile.sourceName')}
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder={t('profile.sourceUrl')}
              value={newSourceUrl}
              onChange={(e) => setNewSourceUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addCustomSource} size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {customSources.length > 0 && (
            <div className="space-y-2">
              {customSources.map((source, index) => (
                <div key={index} className="flex items-center gap-3 p-2 border border-border">
                  <span className="text-sm flex-1">{source.name}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-xs">
                    {source.url}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCustomSource(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </div>
  );
};

export default Profile;
