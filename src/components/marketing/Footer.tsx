import { Github, Linkedin, Twitter } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-12 border-t">
      <div className="max-w-7xl mx-auto px-6 md:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-sm text-muted-foreground">© {new Date().getFullYear()} AIPetri Studio. Все права защищены.</div>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground">Документы</a>
          <a href="#" className="hover:text-foreground">Политика</a>
          <a href="#" className="hover:text-foreground">Контакты</a>
        </nav>
        <div className="flex items-center gap-4">
          <a aria-label="Twitter" href="#" className="hover:text-foreground"><Twitter /></a>
          <a aria-label="LinkedIn" href="#" className="hover:text-foreground"><Linkedin /></a>
          <a aria-label="GitHub" href="#" className="hover:text-foreground"><Github /></a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
