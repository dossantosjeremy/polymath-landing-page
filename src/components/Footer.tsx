export const Footer = () => {
  const links = ["About Us", "Contact", "Terms of Service", "Privacy Policy"];
  
  return (
    <footer className="border-t border-border mt-20">
      <div className="max-w-7xl mx-auto px-6 py-8">
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
      </div>
    </footer>
  );
};
