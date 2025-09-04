import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
const Header = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all ${
        scrolled ? "backdrop-blur-md bg-background/70 border-b" : ""
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="#" className="font-extrabold text-lg tracking-tight">
          <span className="text-gradient-primary">AIPetri Studio</span>
        </a>

        <ul className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <li><a href="#features" className="hover:text-foreground transition-colors">Возможности</a></li>
          <li><a href="#how" className="hover:text-foreground transition-colors">Как работает</a></li>
          <li><Link to="/pricing" className="hover:text-foreground transition-colors">Тарифы</Link></li>
        </ul>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline" className="hidden sm:inline-flex">
            <Link to="/login">Войти</Link>
          </Button>
          <Button asChild variant="hero" className="rounded-xl">
            <Link to="/register">Начать бесплатно</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
};

export default Header;
