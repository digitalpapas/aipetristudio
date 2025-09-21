import { MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";

const PromptGenerator = () => {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Промпт генератор"
        subtitle="Автоматическое создание промптов для контент-маркетинга"
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="p-6 bg-primary/10 rounded-full">
                <MessageCircle className="w-16 h-16 text-primary" />
              </div>
            </div>
            
            <div className="bg-card border-2 border-dashed border-border rounded-xl p-12">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-2xl font-semibold text-foreground mb-4">
                Скоро здесь появится промпт генератор
              </h3>
              <p className="text-lg text-muted-foreground">
                Автоматическое создание промптов для эффективного контент-маркетинга
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptGenerator;