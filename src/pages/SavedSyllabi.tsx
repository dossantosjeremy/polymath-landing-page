import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, ExternalLink, BookOpen, Calendar } from "lucide-react";
import { ScheduleConfigurator } from "@/components/ScheduleConfigurator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SavedSyllabus {
  id: string;
  discipline: string;
  discipline_path: string | null;
  modules: any;
  source: string;
  source_url: string | null;
  raw_sources: any;
  created_at: string;
}

const SavedSyllabi = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syllabi, setSyllabi] = useState<SavedSyllabus[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [schedulingSyllabusId, setSchedulingSyllabusId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      fetchSavedSyllabi();
    }
  }, [user, authLoading, navigate]);

  const fetchSavedSyllabi = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_syllabi')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSyllabi(data || []);
    } catch (error) {
      console.error('Error fetching saved syllabi:', error);
      toast({
        title: t('common.error'),
        description: t('errors.generic'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteSyllabus = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_syllabi')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSyllabi(syllabi.filter(s => s.id !== id));
      toast({
        title: t('toasts.deleted'),
        description: t('toasts.syllabusDeleted'),
      });
    } catch (error) {
      console.error('Error deleting syllabus:', error);
      toast({
        title: t('common.error'),
        description: t('errors.generic'),
        variant: "destructive"
      });
    } finally {
      setDeleteId(null);
    }
  };

  const viewSyllabus = (syllabus: SavedSyllabus) => {
    navigate(`/syllabus?savedId=${syllabus.id}`);
  };

  // Convert JSONB to array for display
  const getModulesArray = (modules: any): any[] => {
    return Array.isArray(modules) ? modules : [];
  };

  const getRawSourcesArray = (rawSources: any): any[] => {
    return Array.isArray(rawSources) ? rawSources : [];
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-serif font-bold mb-2">{t('saved.title')}</h1>
            <p className="text-lg text-muted-foreground">
              {t('saved.subtitle')}
            </p>
          </div>

          {syllabi.length === 0 ? (
            <Card className="p-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">{t('saved.noSyllabi')}</h3>
              <p className="text-muted-foreground mb-6">
                {t('saved.noSyllabiDesc')}
              </p>
              <Button onClick={() => navigate('/explore')}>
                {t('saved.exploreDisciplines')}
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {syllabi.map((syllabus) => (
                <Card key={syllabus.id} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{syllabus.discipline}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {syllabus.source}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{getModulesArray(syllabus.modules).length} {t('saved.modules')}</span>
                        {getRawSourcesArray(syllabus.raw_sources).length > 0 && (
                          <span>{getRawSourcesArray(syllabus.raw_sources).length} {t('saved.source')}(s)</span>
                        )}
                        <span>
                          {new Date(syllabus.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {syllabus.source_url && (
                        <a
                          href={syllabus.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-2"
                        >
                          {t('saved.source')}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        onClick={() => viewSyllabus(syllabus)}
                        variant="outline"
                      >
                        {t('common.view')}
                      </Button>
                      <Button
                        onClick={() => setSchedulingSyllabusId(syllabus.id)}
                        variant="outline"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        {t('nav.schedule')}
                      </Button>
                      <Button
                        onClick={() => setDeleteId(syllabus.id)}
                        variant="outline"
                        size="icon"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('saved.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('saved.deleteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteSyllabus(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {schedulingSyllabusId && (
        <ScheduleConfigurator
          scheduleId={null}
          syllabusId={schedulingSyllabusId}
          onClose={() => setSchedulingSyllabusId(null)}
          onComplete={() => {
            setSchedulingSyllabusId(null);
            toast({
              title: t('toasts.profileUpdated'),
              description: t('schedule.title'),
            });
          }}
        />
      )}
    </div>
  );
};

export default SavedSyllabi;
