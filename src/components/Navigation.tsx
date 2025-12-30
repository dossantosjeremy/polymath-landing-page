import { GraduationCap, LogOut, Bookmark, User, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Navigation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('errors.signOutFailed')
      });
    } else {
      toast({
        title: t('toasts.signedOut'),
        description: t('toasts.signedOutDesc')
      });
      navigate("/");
    }
  };

  return (
    <nav className="border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <button 
          onClick={() => navigate("/")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="text-xl font-semibold">{t('nav.appName')}</span>
        </button>
        
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {user ? (
            <>
              <Button
                variant="ghost"
                className="rounded-full px-4 font-medium gap-2"
                onClick={() => navigate("/saved")}
              >
                <Bookmark className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.saved')}</span>
              </Button>
              <Button
                variant="ghost"
                className="rounded-full px-4 font-medium gap-2"
                onClick={() => navigate("/schedule")}
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.schedule')}</span>
              </Button>
              <Button
                variant="ghost"
                className="rounded-full px-4 font-medium gap-2"
                onClick={() => navigate("/profile")}
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.profile')}</span>
              </Button>
              <span className="text-sm text-muted-foreground hidden md:block">
                {user.email}
              </span>
              <Button 
                variant="ghost" 
                className="rounded-full px-6 font-medium gap-2"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.signOut')}</span>
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="default" 
                className="rounded-full px-6 font-medium"
                onClick={() => navigate("/auth")}
              >
                {t('nav.signUp')}
              </Button>
              <Button 
                variant="ghost" 
                className="rounded-full px-6 font-medium"
                onClick={() => navigate("/auth")}
              >
                {t('nav.logIn')}
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
