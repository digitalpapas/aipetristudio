import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, CreditCard, User, AlertCircle, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface Payment {
  id: string;
  amount: number;
  plan: string;
  status: string;
  created_at: string;
  payment_type: string;
  prodamus_order_id: string;
}

const SubscriptionPage = () => {
  const { user } = useAuth();
  const { status, daysLeft, hasActiveSubscription, subscriptionId } = useSubscription();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionExpiry, setSubscriptionExpiry] = useState<Date | null>(null);
  const navigate = useNavigate();

  const SUBSCRIPTION_URL = 'https://neurosetipraktika.payform.ru/subscription/2510594';

  useEffect(() => {
    document.title = "Управление подпиской | Нейросети Практика";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Управляйте своей подпиской, просматривайте историю платежей и обновляйте тариф.');
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchSubscriptionData();
      fetchPaymentHistory();
    }
  }, [user]);

  const fetchSubscriptionData = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_expires_at')
        .eq('user_id', user.id)
        .single();

      if (profile?.subscription_expires_at) {
        setSubscriptionExpiry(new Date(profile.subscription_expires_at));
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    }
  };

  const fetchPaymentHistory = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
      } else {
        setPayments(data || []);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = () => {
    // Открываем email клиент для отправки запроса на отмену
    const subject = 'Запрос на отмену подписки';
    const body = `Здравствуйте!

Прошу отменить мою подписку Pro.

ID подписки: ${subscriptionId}
Email: ${user?.email}

Спасибо.`;
    
    const mailtoUrl = `mailto:neuroseti.praktika@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'pro':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Pro</Badge>;
      case 'enterprise':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Enterprise</Badge>;
      default:
        return <Badge variant="secondary">Demo</Badge>;
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">

      {/* Текущий статус */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Текущий тариф
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Статус:</span>
              {getStatusBadge()}
            </div>

            {status === 'pro' && subscriptionExpiry && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Следующий платёж:</span>
                  <span className="font-medium">
                    {format(subscriptionExpiry, 'dd MMMM yyyy', { locale: ru })}
                  </span>
                </div>
                {daysLeft !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Осталось дней:</span>
                    <span className={`font-medium ${daysLeft <= 3 ? 'text-destructive' : 'text-foreground'}`}>
                      {daysLeft > 0 ? `${daysLeft} дн.` : 'Истекла'}
                    </span>
                  </div>
                )}
              </>
            )}

            {subscriptionId && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">ID подписки:</span>
                <span className="font-mono text-sm">{subscriptionId}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Управление подпиской */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Управление
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status === 'pro' ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium">
                  Автоматическое продление: 2,900₽/месяц
                </p>
                <p className="text-green-700 text-sm mt-1">
                  Подписка будет автоматически продлена в дату следующего платежа
                </p>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full sm:w-auto">
                    Отменить подписку
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-destructive" />
                      Отмена подписки
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>Для отмены подписки напишите на:</p>
                      <p className="font-semibold">neuroseti.praktika@gmail.com</p>
                      <p>Мы откроем почтовый клиент с готовым письмом.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelSubscription}>
                      Написать письмо
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 font-medium mb-2">
                  Лимиты Demo тарифа:
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• 1 исследование</li>
                  <li>• 1 сегмент на исследование</li>
                  <li>• Базовый анализ (10 из 50 пунктов)</li>
                </ul>
              </div>
              
              <Button 
                onClick={() => navigate('/pricing')}
                className="w-full sm:w-auto"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Обновить до Pro за 2,900₽
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* История платежей */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            История платежей
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Загрузка истории платежей...
            </div>
          ) : payments.length > 0 ? (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{payment.plan}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(payment.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ID: {payment.prodamus_order_id}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatPrice(payment.amount)}</div>
                    <Badge 
                      variant={payment.status === 'completed' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {payment.status === 'completed' ? 'Оплачено' : 'В обработке'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              История платежей пуста
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionPage;