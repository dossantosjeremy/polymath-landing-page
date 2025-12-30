import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { signIn, signUp } from "@/lib/auth";
import { z } from "zod";

const Auth = () => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  // Get return URL from query params (default to home)
  const returnUrl = searchParams.get('returnUrl') || '/';

  // Create schema with translated messages
  const authSchema = z.object({
    email: z.string().email(t('errors.validationError')),
    password: z.string().min(6, t('errors.validationError')),
    fullName: z.string().min(2, t('errors.validationError')).optional()
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate inputs
      const validation = authSchema.safeParse({
        email,
        password,
        fullName: isLogin ? undefined : fullName
      });

      if (!validation.success) {
        toast({
          variant: "destructive",
          title: t('errors.validationError'),
          description: validation.error.issues[0].message
        });
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { error } = await signIn(email, password);
        
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              variant: "destructive",
              title: t('errors.loginFailed'),
              description: t('errors.invalidCredentials')
            });
          } else {
            toast({
              variant: "destructive",
              title: t('errors.loginFailed'),
              description: error.message
            });
          }
        } else {
          toast({
            title: t('toasts.welcomeBack'),
            description: t('toasts.loggedInDesc')
          });
          navigate(returnUrl);
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              variant: "destructive",
              title: t('errors.signupFailed'),
              description: t('errors.emailExists')
            });
          } else {
            toast({
              variant: "destructive",
              title: t('errors.signupFailed'),
              description: error.message
            });
          }
        } else {
          toast({
            title: t('toasts.accountCreated'),
            description: t('toasts.accountCreatedDesc')
          });
          navigate(returnUrl);
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('errors.generic')
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-2xl font-semibold">{t('nav.appName')}</span>
          </div>
          <h1 className="text-3xl font-serif font-bold mb-2">
            {isLogin ? t('auth.welcomeBack') : t('auth.joinPolymath')}
          </h1>
          <p className="text-muted-foreground">
            {isLogin
              ? t('auth.signInSubtitle')
              : t('auth.signUpSubtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="fullName">{t('auth.fullName')}</Label>
              <Input
                id="fullName"
                type="text"
                placeholder={t('auth.fullNamePlaceholder')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={!isLogin}
                disabled={loading}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            className="w-full rounded-full h-12 font-medium"
            disabled={loading}
          >
            {loading
              ? (isLogin ? t('auth.signingIn') : t('auth.creatingAccount'))
              : (isLogin ? t('auth.signIn') : t('auth.createAccount'))}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            disabled={loading}
          >
            {isLogin
              ? `${t('auth.noAccount')} ${t('auth.signUpLink')}`
              : `${t('auth.hasAccount')} ${t('auth.signInLink')}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
