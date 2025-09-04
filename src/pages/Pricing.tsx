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
        <section className="py-4 md:py-6">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <header className="sr-only">
              <h1>Тарифы</h1>
            </header>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {/* DEMO plan */}
              <div className="flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Демо</h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">Бесплатно</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 h-12">
                  Попробуйте платформу и оцените возможности AI-анализа целевой аудитории
                </p>
                <Button asChild className="w-full py-2.5 px-4 rounded-lg bg-gray-100 text-gray-900 hover:bg-gray-200 font-medium">
                  <Link to="/demo">Попробовать демо</Link>
                </Button>
                <hr className="my-6 border-gray-200 dark:border-gray-700" />
                <div className="space-y-2">
                  {demoFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-gray-700 dark:text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* PRO plan */}
              <div className="flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 border-t-4 border-t-blue-500 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Pro</h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">2,900₽</span>
                  <span className="text-gray-500">/мес</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 h-12">
                  Полный доступ с расширенной аналитикой для маркетологов
                </p>
                <Button asChild className="w-full py-2.5 px-4 rounded-lg bg-blue-500 text-white hover:bg-blue-600 font-medium">
                  <Link to="/register">Начать за 2,900₽</Link>
                </Button>
                <hr className="my-6 border-gray-200 dark:border-gray-700" />
                <div className="space-y-2">
                  {proFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-gray-700 dark:text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ENTERPRISE plan */}
              <div className="flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Enterprise</h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">29,900₽</span>
                  <span className="text-gray-500">/мес</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 h-12">
                  Корпоративное решение для команд с персональной поддержкой и API
                </p>
                <Button 
                  className="w-full py-2.5 px-4 rounded-lg bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-medium"
                  onClick={() => setIsEnterpriseModalOpen(true)}
                >
                  Связаться с нами
                </Button>
                <hr className="my-6 border-gray-200 dark:border-gray-700" />
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500">Всё из Pro, плюс:</p>
                </div>
                <div className="space-y-2">
                  {enterpriseFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-gray-700 dark:text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="mt-8 text-center">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Вопросы о тарифах?</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Не уверены, какой план подходит именно вам? Напишите нам на{" "}
                  <a 
                    href="mailto:support@deepscope.ai" 
                    className="text-blue-500 hover:text-blue-600 font-medium"
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