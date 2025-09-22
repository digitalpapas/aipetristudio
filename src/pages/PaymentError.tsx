import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, RefreshCw, MessageCircle } from "lucide-react";

const PaymentError = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // SEO настройки
    document.title = "Ошибка оплаты | Нейросети Практика";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Произошла ошибка при оплате. Попробуйте еще раз или свяжитесь с поддержкой.');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-destructive/5">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Заголовок с иконкой ошибки */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Ошибка при оплате
            </h1>
            <p className="text-xl text-muted-foreground">
              К сожалению, оплата не прошла. Попробуйте еще раз или свяжитесь с поддержкой.
            </p>
          </div>

          {/* Карта с возможными причинами */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl text-center">
                Возможные причины ошибки
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-left space-y-3 text-muted-foreground">
                <p>• Недостаточно средств на карте</p>
                <p>• Временные технические проблемы банка</p>
                <p>• Карта заблокирована для интернет-платежей</p>
                <p>• Превышен лимит по операциям</p>
                <p>• Неверно указаны данные карты</p>
              </div>
            </CardContent>
          </Card>

          {/* Действия */}
          <div className="space-y-4">
            <Button 
              onClick={() => navigate('/pricing')}
              size="lg"
              className="w-full max-w-md mx-auto text-lg font-semibold py-3"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Попробовать снова
            </Button>

            <div className="text-center">
              <p className="text-muted-foreground mb-3">
                Не получается оплатить? Мы поможем!
              </p>
              <a
                href="https://t.me/sibirtsev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
              >
                <MessageCircle className="w-4 h-4" />
                Связаться с поддержкой
              </a>
            </div>
          </div>

          {/* Альтернативные способы оплаты */}
          <Card className="mt-12">
            <CardHeader>
              <CardTitle className="text-lg">
                Альтернативные способы оплаты
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground space-y-2">
                <p>📱 СБП (Система быстрых платежей)</p>
                <p>💳 Другая банковская карта</p>
                <p>🏦 Банковский перевод</p>
                <p className="text-sm mt-4">
                  Напишите в поддержку для получения реквизитов
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Контактная информация */}
          <div className="mt-12 text-center text-sm text-muted-foreground">
            <p>
              Поддержка работает круглосуточно:{" "}
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

export default PaymentError;