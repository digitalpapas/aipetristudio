import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Star, Users, BarChart3 } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { status, refresh } = useSubscription();

  useEffect(() => {
    // Обновляем статус пользователя при загрузке страницы
    refresh();
    
    // SEO настройки
    document.title = "Подписка активирована | Нейросети Практика";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Подписка Pro успешно активирована! Получите доступ ко всем функциям платформы.');
    }
  }, [refresh]);

  const proFeatures = [
    {
      icon: <BarChart3 className="w-5 h-5 text-primary" />,
      title: "Расширенная аналитика",
      description: "Глубокий анализ данных и подробные отчеты"
    },
    {
      icon: <Users className="w-5 h-5 text-primary" />,
      title: "Безлимитные исследования",
      description: "Создавайте неограниченное количество проектов"
    },
    {
      icon: <Star className="w-5 h-5 text-primary" />,
      title: "Приоритетная поддержка",
      description: "Быстрая помощь от команды экспертов"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Заголовок с иконкой успеха */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Подписка Pro активирована!
            </h1>
            <p className="text-xl text-muted-foreground">
              Спасибо за оформление подписки. Теперь вам доступны все функции платформы.
            </p>
          </div>

          {/* Карта с функциями Pro */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl text-center">
                Что включено в Pro подписку
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {proFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-4 text-left">
                    <div className="flex-shrink-0 mt-1">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Статус подписки */}
          {status === 'pro' && (
            <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">
                ✅ Ваш статус подписки успешно обновлен до Pro
              </p>
            </div>
          )}

          {/* Кнопка перехода в дашборд */}
          <Button 
            onClick={() => navigate('/dashboard')}
            size="lg"
            className="w-full max-w-md mx-auto text-lg font-semibold py-3"
          >
            Начать работу
          </Button>

          {/* Дополнительная информация */}
          <div className="mt-12 text-center text-sm text-muted-foreground">
            <p>
              Если у вас есть вопросы, свяжитесь с нами:{" "}
              <a 
                href="https://t.me/sibirtsev" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                @sibirtsev
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;