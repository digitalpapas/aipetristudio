import { Check, ListOrdered, Sparkles, Timer } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      title: "Опишите нишу",
      desc: "Укажите продукт и сегмент — AI соберёт данные из открытых источников",
      icon: <ListOrdered className="text-[hsl(var(--brand-blue))]" />,
    },
    {
      title: "AI анализирует",
      desc: "GPT‑4 выделит 50+ параметров: мотивы, страхи, JTBD, возражения",
      icon: <Sparkles className="text-[hsl(var(--brand-purple))]" />,
    },
    {
      title: "Получите отчёт",
      desc: "Готовые персоны, инсайты и рекомендации за 3 минуты",
      icon: <Timer className="text-[hsl(var(--brand-blue))]" />,
    },
  ];

  return (
    <section id="how" className="py-24">
      <div className="max-w-7xl mx-auto px-6 md:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Как это работает</h2>
        <p className="text-muted-foreground mb-12">Всего три шага к глубокому пониманию аудитории</p>

        <div className="relative grid md:grid-cols-3 gap-8">
          {/* Connecting line */}
          <div className="hidden md:block absolute inset-x-0 top-20 h-px -z-10 pointer-events-none bg-gradient-to-r from-transparent via-[hsl(var(--brand-blue)/0.25)] to-transparent" />

          {steps.map((s, i) => (
            <div key={i} className="relative z-10 bg-card border rounded-3xl p-8 hover-lift shadow-elevated animate-fade-in">
              <div className="mx-auto w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold mb-6">
                {i + 1}
              </div>
              <div className="flex items-center justify-center gap-3 mb-3">
                {s.icon}
                <h3 className="text-xl font-semibold">{s.title}</h3>
              </div>
              <p className="text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
