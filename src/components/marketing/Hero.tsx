import { Button } from "@/components/ui/button";
import { Play, Rocket } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
const CountUp = ({ end, duration = 1200 }: { end: number; duration?: number }) => {
  const [value, setValue] = useState(0);
  const start = useRef<number>();

  useEffect(() => {
    const step = (timestamp: number) => {
      if (!start.current) start.current = timestamp;
      const progress = Math.min((timestamp - start.current) / duration, 1);
      setValue(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);

  return <span>{value.toLocaleString('ru-RU')}</span>;
};

const Hero = () => {
  return (
    <section className="min-h-[90vh] flex items-center bg-gradient-to-b from-background to-[hsl(var(--background-alt))]">
      <div className="max-w-7xl mx-auto px-6 md:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 bg-[hsl(var(--brand-blue)/0.08)] text-[hsl(var(--brand-blue))]">
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--brand-blue))] pulse" />
            <span className="text-sm font-medium">Powered by GPT-4</span>
          </div>

          <h1 className="text-5xl lg:text-7xl font-extrabold leading-tight mb-6">
            <span className="block">AI исследует</span>
            <span className="text-gradient-primary">вашу аудиторию</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-xl">
            Глубокий анализ целевой аудитории за 3 минуты. 50+ параметров, методология ведущих маркетологов.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild variant="hero" size="lg" className="rounded-xl">
              <Link to="/register">Начать бесплатно <Rocket className="ml-1" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl">
              <a href="#how"><Play className="mr-2" /> Смотреть демо</a>
            </Button>
          </div>

          <div className="flex gap-8 mt-12">
            <div>
              <div className="text-3xl font-bold text-foreground"><CountUp end={12847} /></div>
              <div className="text-sm text-muted-foreground">Исследований</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground">97%</div>
              <div className="text-sm text-muted-foreground">Точность</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground">3 мин</div>
              <div className="text-sm text-muted-foreground">Скорость</div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="relative w-full h-[520px] md:h-[600px]">
            <div className="absolute top-1/4 right-1/4 w-56 md:w-72 h-56 md:h-72 rounded-full blur-3xl opacity-20 animate-pulse bg-[hsl(var(--brand-blue))]"></div>
            <div className="absolute bottom-1/4 left-1/4 w-56 md:w-72 h-56 md:h-72 rounded-full blur-3xl opacity-20 animate-pulse bg-[hsl(var(--brand-purple))]"></div>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-72 md:w-96 h-72 md:h-96 rounded-full border border-[hsl(var(--border))] flex items-center justify-center animate-spin-slow">
                <div className="w-56 md:w-72 h-56 md:h-72 rounded-full border border-[hsl(var(--border))] flex items-center justify-center">
                  <div className="w-36 md:w-48 h-36 md:h-48 rounded-full bg-gradient-to-br from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-purple))] opacity-10"></div>
                </div>
              </div>
            </div>

            <div className="absolute top-20 left-10 w-3 h-3 rounded-full animate-float bg-[hsl(var(--brand-blue))]"></div>
            <div className="absolute bottom-20 right-10 w-3 h-3 rounded-full animate-float" style={{ animationDelay: "500ms", backgroundColor: "hsl(var(--brand-purple))" }}></div>
            <div className="absolute top-40 right-20 w-3 h-3 rounded-full animate-float" style={{ animationDelay: "1000ms", backgroundColor: "hsl(var(--brand-blue))" }}></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
