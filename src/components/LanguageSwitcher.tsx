import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supportedLanguages, languageNames, type SupportedLanguage } from '@/lib/i18n';
import { Globe } from 'lucide-react';

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (lang: SupportedLanguage) => {
    i18n.changeLanguage(lang);
    // Update HTML lang attribute for SEO
    document.documentElement.lang = lang;
  };

  return (
    <Select value={i18n.language as SupportedLanguage} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-auto gap-2 border-none bg-transparent hover:bg-accent/50 focus:ring-0 px-2">
        <Globe className="h-4 w-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {supportedLanguages.map((lang) => (
          <SelectItem key={lang} value={lang}>
            {languageNames[lang]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
