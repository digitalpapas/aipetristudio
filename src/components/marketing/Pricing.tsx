import { Button } from "@/components/ui/button";
import { Check, Bookmark } from "lucide-react";

const Pricing = () => {
  const tiers = [
    {
      name: "Starter",
      price: "Бесплатно",
      features: ["1 проект", "Ограниченный отчёт", "Email поддержка"],
      cta: "Попробовать",
      highlighted: false,
    },
    {
      name: "Pro",
      price: "2,900₽/мес",
      features: ["Неограниченно проектов", "Полный отчёт (50+ параметров)", "Экспорт PDF", "Приоритетная поддержка"],
      cta: "Оформить",
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "Запрос",
      features: ["SLA и SSO", "Доступ к API", "Обучение команды"],
      cta: "Связаться",
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-24">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Тарифы</h2>

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((t) => (
            t.highlighted ? (
              <div key={t.name} className="p-[2px] rounded-3xl bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-purple))] hover-lift">
                <div className="h-full bg-card rounded-3xl p-8">
                  <h3 className="text-xl font-bold mb-2">{t.name}</h3>
                  <div className="text-3xl font-extrabold mb-4">{t.price}</div>
                  <ol className="space-y-3 mb-6 list-decimal list-inside">
                    {t.features.map((f, index) => (
                      <li key={f} className="group relative flex items-start gap-2 text-sm text-foreground hover:bg-accent/50 rounded-lg p-2 -m-2 transition-colors cursor-pointer">
                        <span className="font-medium text-[hsl(var(--brand-blue))] min-w-[1.5rem]">{index + 1}.</span>
                        <span className="flex-1">{f}</span>
                        <Bookmark className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </li>
                    ))}
                  </ol>
                  <Button variant="hero" className="w-full rounded-xl">{t.cta}</Button>
                </div>
              </div>
            ) : (
              <div key={t.name} className="rounded-3xl border bg-card p-8 hover-lift">
                <h3 className="text-xl font-bold mb-2">{t.name}</h3>
                <div className="text-3xl font-extrabold mb-4">{t.price}</div>
                <ol className="space-y-3 mb-6 list-decimal list-inside">
                  {t.features.map((f, index) => (
                    <li key={f} className="group relative flex items-start gap-2 text-sm text-foreground hover:bg-accent/50 rounded-lg p-2 -m-2 transition-colors cursor-pointer">
                      <span className="font-medium text-[hsl(var(--brand-blue))] min-w-[1.5rem]">{index + 1}.</span>
                      <span className="flex-1">{f}</span>
                      <Bookmark className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </li>
                  ))}
                </ol>
                <Button variant="outline" className="w-full rounded-xl">{t.cta}</Button>
              </div>
            )
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
