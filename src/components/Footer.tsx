export const Footer = () => {
  const links = ["About Us", "Contact", "Terms of Service", "Privacy Policy"];
  
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
              key={link}
              href="#"
              className="hover:text-foreground transition-colors"
            >
              {link}
            </a>
          ))}
        </div>
        
        <p className="text-center text-sm text-muted-foreground">
          Cultivating polymaths since 2024
        </p>
      </div>
    </footer>
  );
};
