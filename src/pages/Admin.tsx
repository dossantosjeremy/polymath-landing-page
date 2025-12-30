import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Check, Globe } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Discipline {
  id: string;
  l1: string;
  l2: string | null;
  l3: string | null;
  l4: string | null;
  l5: string | null;
  l6: string | null;
}

type LocaleKey = 'en' | 'es' | 'fr';

const localeConfig: Record<LocaleKey, { label: string; tableName: string }> = {
  en: { label: 'English', tableName: 'disciplines' },
  es: { label: 'Español', tableName: 'disciplines_es' },
  fr: { label: 'Français', tableName: 'disciplines_fr' },
};

const Admin = () => {
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [disciplineCounts, setDisciplineCounts] = useState<Record<LocaleKey, number | null>>({
    en: null,
    es: null,
    fr: null
  });
  const [disciplines, setDisciplines] = useState<Record<LocaleKey, Discipline[]>>({
    en: [],
    es: [],
    fr: []
  });
  const [loadingDisciplines, setLoadingDisciplines] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState<LocaleKey>('en');
  const { toast } = useToast();

  // Load current count and disciplines on mount
  useEffect(() => {
    loadAllCounts();
    loadDisciplines(selectedLocale);
  }, []);

  useEffect(() => {
    loadDisciplines(selectedLocale);
  }, [selectedLocale]);

  const loadAllCounts = async () => {
    for (const locale of Object.keys(localeConfig) as LocaleKey[]) {
      await loadCount(locale);
    }
  };

  const loadCount = async (locale: LocaleKey) => {
    try {
      const tableName = localeConfig[locale].tableName;
      const { count } = await supabase
        .from(tableName as any)
        .select('*', { count: 'exact', head: true });
      
      setDisciplineCounts(prev => ({ ...prev, [locale]: count || 0 }));
    } catch (error) {
      console.error(`Error loading count for ${locale}:`, error);
      setDisciplineCounts(prev => ({ ...prev, [locale]: 0 }));
    }
  };

  const loadDisciplines = async (locale: LocaleKey) => {
    setLoadingDisciplines(true);
    try {
      const tableName = localeConfig[locale].tableName;
      const { data, error } = await supabase
        .from(tableName as any)
        .select('*')
        .order('l1', { ascending: true })
        .limit(100);
      
      if (error) throw error;
      setDisciplines(prev => ({ ...prev, [locale]: data || [] }));
    } catch (error) {
      console.error(`Error loading disciplines for ${locale}:`, error);
    } finally {
      setLoadingDisciplines(false);
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const currentCount = disciplineCounts[selectedLocale];
    const tableName = localeConfig[selectedLocale].tableName;

    // Ask for confirmation if data exists
    if (currentCount && currentCount > 0) {
      if (!confirm(`${localeConfig[selectedLocale].label} database currently has ${currentCount} disciplines. Do you want to clear and re-import?`)) {
        event.target.value = '';
        return;
      }
      // Clear first
      await handleClearTable(true);
    }

    setImporting(true);
    setProgress({ current: 0, total: 0 });

    try {
      const text = await file.text();
      const lines = text.split('\n').slice(1); // Skip header
      const disciplinesList = [];

      for (const line of lines) {
        if (!line.trim()) continue;

        const fields = parseCSVLine(line);
        const [l1, l2, l3, l4, l5, l6] = fields;

        if (l1) {
          disciplinesList.push({
            l1,
            l2: l2 || null,
            l3: l3 || null,
            l4: l4 || null,
            l5: l5 || null,
            l6: l6 || null
          });
        }
      }

      setProgress({ current: 0, total: disciplinesList.length });

      // Insert in batches of 100
      const batchSize = 100;
      let inserted = 0;

      for (let i = 0; i < disciplinesList.length; i += batchSize) {
        const batch = disciplinesList.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from(tableName as any)
          .insert(batch);

        if (error) {
          console.error('Error inserting batch:', error);
          throw error;
        }

        inserted += batch.length;
        setProgress({ current: inserted, total: disciplinesList.length });
      }

      toast({
        title: "Import Successful!",
        description: `Successfully imported ${inserted} disciplines to ${localeConfig[selectedLocale].label}.`
      });

      // Reload count and disciplines
      await loadCount(selectedLocale);
      await loadDisciplines(selectedLocale);

    } catch (error) {
      console.error('Import error:', error);
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: "An error occurred during import. Check console for details."
      });
    } finally {
      setImporting(false);
      event.target.value = ''; // Reset input
    }
  };

  const handleClearTable = async (skipConfirm = false) => {
    const tableName = localeConfig[selectedLocale].tableName;
    
    if (!skipConfirm && !confirm(`Are you sure you want to delete all ${localeConfig[selectedLocale].label} disciplines? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from(tableName as any)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      if (!skipConfirm) {
        toast({
          title: "Table Cleared",
          description: `All ${localeConfig[selectedLocale].label} disciplines have been deleted.`
        });
      }

      // Reload count and disciplines
      await loadCount(selectedLocale);
      await loadDisciplines(selectedLocale);
    } catch (error) {
      console.error('Clear error:', error);
      toast({
        variant: "destructive",
        title: "Clear Failed",
        description: "Failed to clear the table."
      });
    }
  };

  const currentCount = disciplineCounts[selectedLocale];
  const currentDisciplines = disciplines[selectedLocale];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
        <h1 className="text-4xl font-serif font-bold mb-8">Admin Panel</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Import Academic Disciplines
            </CardTitle>
            <CardDescription>
              Upload the CSV file containing academic disciplines data. The file should have columns: L1, L2, L3, L4, L5, L6.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Language Tabs */}
            <Tabs value={selectedLocale} onValueChange={(v) => setSelectedLocale(v as LocaleKey)}>
              <TabsList className="grid w-full grid-cols-3">
                {(Object.keys(localeConfig) as LocaleKey[]).map((locale) => (
                  <TabsTrigger key={locale} value={locale} className="flex items-center gap-2">
                    {localeConfig[locale].label}
                    <span className="text-xs text-muted-foreground">
                      ({disciplineCounts[locale] ?? '...'})
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Current Status */}
            <div className="p-4 bg-accent/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{localeConfig[selectedLocale].label} Database Status:</span>
                <span className="text-2xl font-bold">
                  {currentCount === null ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  ) : (
                    `${currentCount} disciplines`
                  )}
                </span>
              </div>
            </div>

            {importing && progress.total > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Importing disciplines...</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <label htmlFor="csv-upload" className="flex-1">
                <Button
                  disabled={importing}
                  className="w-full gap-2"
                  asChild
                >
                  <span>
                    {importing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        {currentCount && currentCount > 0 ? `Replace ${localeConfig[selectedLocale].label} Data` : `Upload ${localeConfig[selectedLocale].label} CSV`}
                      </>
                    )}
                  </span>
                </Button>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={importing}
                />
              </label>

              <Button
                variant="destructive"
                onClick={() => handleClearTable(false)}
                disabled={importing || currentCount === 0}
              >
                Clear Table
              </Button>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                CSV Format Requirements
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>First row should be headers: L1,L2,L3,L4,L5,L6</li>
                <li>L1 is required (main domain)</li>
                <li>L2-L6 are optional (sub-categories)</li>
                <li>Empty cells will be stored as NULL</li>
                <li>CSV encoding should be UTF-8</li>
                <li>Expected ~1,727 disciplines from full dataset</li>
                <li><strong>For translations:</strong> Create separate CSV files for each language</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Disciplines Preview Table */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{localeConfig[selectedLocale].label} Disciplines Preview</CardTitle>
            <CardDescription>
              Showing first 100 disciplines. Visit the Explore page to browse all.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDisciplines ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : currentDisciplines.length > 0 ? (
              <div className="border rounded-lg overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Domain (L1)</TableHead>
                      <TableHead className="min-w-[150px]">L2</TableHead>
                      <TableHead className="min-w-[150px]">L3</TableHead>
                      <TableHead className="min-w-[150px]">L4</TableHead>
                      <TableHead className="min-w-[150px]">L5</TableHead>
                      <TableHead className="min-w-[150px]">L6</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentDisciplines.map((discipline) => (
                      <TableRow key={discipline.id}>
                        <TableCell className="font-medium">{discipline.l1}</TableCell>
                        <TableCell className="text-muted-foreground">{discipline.l2 || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{discipline.l3 || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{discipline.l4 || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{discipline.l5 || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{discipline.l6 || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No {localeConfig[selectedLocale].label} disciplines imported yet. Upload a CSV file to get started.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
