import { BarChart3, Brain, Fingerprint, Users } from "lucide-react";

const FeaturesBento = () => {
  return (
    <section id="features" className="py-24 bg-[hsl(var(--background-alt))]">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Возможности</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-6 md:grid-rows-4 gap-4">
          {/* Large card */}
          <div className="md:col-span-2 md:row-span-2 p-8 rounded-3xl bg-gradient-to-br from-[hsl(var(--brand-blue)/0.06)] to-[hsl(var(--brand-purple)/0.06)] border">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="text-[hsl(var(--brand-purple))]" />
              <h3 className="text-2xl font-bold">BDF Анализ</h3>
            </div>
            <p className="text-muted-foreground mb-6">Beliefs, Desires, Feelings — полное понимание мотивации</p>
            <div className="h-40 rounded-2xl bg-gradient-to-r from-[hsl(var(--brand-blue)/0.15)] to-[hsl(var(--brand-purple)/0.15)]" />
          </div>

          {/* Medium cards */}
          <div className="md:col-span-2 p-8 rounded-3xl bg-card border">
            <div className="flex items-center gap-3 mb-2">
              <Users className="text-[hsl(var(--brand-blue))]" />
              <h3 className="text-xl font-bold">Персоны аудитории</h3>
            </div>
            <p className="text-muted-foreground">Готовые сегменты с задачами и сценариями</p>
          </div>

          {/* Small cards */}
          <div className="p-6 rounded-3xl bg-card border">
            <h4 className="font-bold mb-2">JTBD</h4>
            <p className="text-muted-foreground">Jobs To Be Done структурирование</p>
          </div>

          <div className="p-6 rounded-3xl bg-card border">
            <h4 className="font-bold mb-2">Карта возражений</h4>
            <p className="text-muted-foreground">Топ‑10 барьеров и ответы</p>
          </div>

          <div className="p-6 rounded-3xl bg-card border">
            <div className="flex items-center gap-2 mb-2"><BarChart3 className="text-[hsl(var(--brand-blue))]" /><h4 className="font-bold">Инсайты</h4></div>
            <p className="text-muted-foreground">Ключевые паттерны поведения</p>
          </div>

          <div className="p-6 rounded-3xl bg-card border">
            <div className="flex items-center gap-2 mb-2"><Fingerprint className="text-[hsl(var(--brand-purple))]" /><h4 className="font-bold">Тональность</h4></div>
            <p className="text-muted-foreground">Язык и контекст вашей аудитории</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesBento;
