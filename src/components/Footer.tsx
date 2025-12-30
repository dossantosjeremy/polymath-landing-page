import { useTranslation } from "react-i18next";

export const Footer = () => {
  const { t } = useTranslation();

  const links = [
    { key: "aboutUs", label: t('footer.aboutUs') },
    { key: "contact", label: t('footer.contact') },
    { key: "terms", label: t('footer.terms') },
    { key: "privacy", label: t('footer.privacy') },
  ];

  return (
    <footer className="border-t border-border mt-20">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <span className="h-px w-16 bg-border"></span>
          <span className="text-lg">◆</span>
          <span className="h-px w-16 bg-border"></span>
        </div>
        
        <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          {links.map((link) => (
            <a
              key={link.key}
              href="#"
              className="hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
        
        <p className="text-center text-sm text-muted-foreground">
          {t('footer.tagline')}
        </p>
      </div>
    </footer>
  );
};
