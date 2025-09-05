import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { EnterpriseContactModal } from "@/components/ui/enterprise-contact-modal";

const PricingPage = () => {
  const [isEnterpriseModalOpen, setIsEnterpriseModalOpen] = useState(false);

  // SEO: title, description, canonical, structured data
  useEffect(() => {
    document.title = "Выберите подходящий тариф | AiPetri Studio";

    const desc =
      "Попробуйте демо или получите полный доступ: профессиональный тариф для AI исследования целевой аудитории.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.href);
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: [
      {
        "@type": "Product",
        name: "Тариф Демо",
        description:
          "Демо-доступ к платформе AI исследования целевой аудитории. 1 тестовое исследование.",
        offers: {
          "@type": "Offer",
          price: 0,
          priceCurrency: "RUB",
          availability: "https://schema.org/InStock",
        },
      },
      {
        "@type": "Product",
        name: "Тариф Профессионал",
        description:
          "Полный доступ к платформе с неограниченными исследованиями и расширенной аналитикой.",
        offers: {
          "@type": "Offer",
          price: 2900,
          priceCurrency: "RUB",
          priceValidUntil: new Date(new Date().getFullYear(), 11, 31).toISOString(),
          availability: "https://schema.org/InStock",
        },
      },
      {
        "@type": "Product",
        name: "Тариф Enterprise",
        description:
          "Корпоративное решение для крупных команд и агентств с персональной поддержкой.",
        offers: {
          "@type": "Offer",
          price: 29900,
          priceCurrency: "RUB",
          availability: "https://schema.org/InStock",
        },
      },
    ],
  };

  const demoFeatures = [
    "1 тестовое исследование",
    "1 сегмент аудитории",
    "Базовый анализ (10 из 50 пунктов)",
    "Предпросмотр блоков анализа",
    "Демонстрация возможностей"
  ];

  const proFeatures = [
    "Неограниченные исследования",
    "До 10 сегментов на исследование", 
    "Полный анализ 50 пунктов",
    "BDF-анализ",
    "БСПВ-анализ",
    "5 User Personas",
    "JTBD анализ",
    "250+ тем для контента",
    "Стратегии по сегментам",
    "Сценарии продаж",
    "Экспорт PDF, CSV",
    "История на 90 дней",
    "Приоритетная поддержка"
  ];

  const enterpriseFeatures = [
    "Безлимитные сегменты",
    "API доступ", 
    "Мультикомандные пространства",
    "Персональный менеджер",
    "Обучение команды",
    "SLA 99.9%",
    "Приоритетная AI обработка",
    "Кастомные AI-ассистенты",
    "Белый лейбл"
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main>
        <section className="pt-8 sm:pt-10 md:pt-8 lg:pt-6 py-4 md:py-6">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <header className="sr-only">
              <h1>Тарифы</h1>
            </header>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
              {/* DEMO plan */}
              <div className="flex flex-col bg-card border border-border rounded-xl p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-semibold text-foreground">Демо</h3>
                <div className="mt-2 mb-4">
                  <span className="text-2xl md:text-3xl font-bold text-foreground">Бесплатно</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4 md:mb-6 min-h-[3rem]">
                  Попробуйте платформу и оцените возможности AI-анализа целевой аудитории
                </p>
                <Button asChild className="w-full py-2.5 px-4 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium">
                  <Link to="/demo">Попробовать демо</Link>
                </Button>
                <hr className="my-4 md:my-6 border-border" />
                <div className="space-y-2">
                  {demoFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-xs md:text-sm text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* PRO plan */}
              <div className="flex flex-col bg-card border border-border border-t-4 border-t-primary rounded-xl p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-semibold text-foreground">Pro</h3>
                <div className="mt-2 mb-4">
                  <span className="text-2xl md:text-3xl font-bold text-foreground">2,900₽</span>
                  <span className="text-muted-foreground">/мес</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4 md:mb-6 min-h-[3rem]">
                  Полный доступ с расширенной аналитикой для маркетологов
                </p>
                <Button asChild className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                  <Link to="/register">Начать за 2,900₽</Link>
                </Button>
                <hr className="my-4 md:my-6 border-border" />
                <div className="space-y-2">
                  {proFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-xs md:text-sm text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ENTERPRISE plan */}
              <div className="flex flex-col bg-card border border-border rounded-xl p-4 md:p-6 md:col-span-2 xl:col-span-1">
                <h3 className="text-lg md:text-xl font-semibold text-foreground">Enterprise</h3>
                <div className="mt-2 mb-4">
                  <span className="text-2xl md:text-3xl font-bold text-foreground">29,900₽</span>
                  <span className="text-muted-foreground">/мес</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4 md:mb-6 min-h-[3rem]">
                  Корпоративное решение для команд с персональной поддержкой и API
                </p>
                <Button 
                  className="w-full py-2.5 px-4 rounded-lg bg-background border-2 border-primary text-primary hover:bg-accent font-medium"
                  onClick={() => setIsEnterpriseModalOpen(true)}
                >
                  Связаться с нами
                </Button>
                <hr className="my-4 md:my-6 border-border" />
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground">Всё из Pro, плюс:</p>
                </div>
                <div className="space-y-2">
                  {enterpriseFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-xs md:text-sm text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="mt-6 md:mt-8 text-center">
              <div className="bg-muted/50 rounded-lg p-6 md:p-8">
                <h2 className="text-lg md:text-xl font-semibold text-foreground mb-4">Вопросы о тарифах?</h2>
                <p className="text-muted-foreground text-sm md:text-base">
                  Не уверены, какой план подходит именно вам? Напишите нам на{" "}
                  <a 
                    href="mailto:support@deepscope.ai" 
                    className="text-primary hover:text-primary/80 font-medium underline"
                  >
                    support@deepscope.ai
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>

        <EnterpriseContactModal 
          open={isEnterpriseModalOpen} 
          onOpenChange={setIsEnterpriseModalOpen} 
        />
      </main>
    </>
  );
};

export default PricingPage;