import { Factory } from "lucide-react";

const ContentFactory = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <Factory className="w-12 h-12 text-primary" />
            </div>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Контент завод
          </h2>
          
          <p className="text-xl text-muted-foreground mb-8">
            Автоматическое создание контента на основе исследования аудитории
          </p>
          
          <div className="bg-card border-2 border-dashed border-border rounded-xl p-12">
            <div className="text-6xl mb-4">🏭</div>
            <p className="text-lg text-muted-foreground">
              Скоро здесь появится мощный инструмент для создания контента
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContentFactory;