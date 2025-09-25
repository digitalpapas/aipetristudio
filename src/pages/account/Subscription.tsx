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
  const [isCancelling, setIsCancelling] = useState(false);
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

  const handleCancelSubscription = async () => {
    try {
      setIsCancelling(true);
      
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: {
          subscriptionId: subscriptionId,
          userEmail: user?.email
        }
      });

      if (error) {
        console.error('Error cancelling subscription:', error);
        // Fallback to email method if API fails
        const subject = 'Запрос на отмену автопродления';
        const body = `Здравствуйте!

Прошу отменить автопродление для моей подписки Pro.

ID подписки: ${subscriptionId}
Email: ${user?.email}

Спасибо.`;
        
        const mailtoUrl = `mailto:neuroseti.praktika@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoUrl;
        return;
      }

      if (data?.success) {
        // Force refresh subscription data
        await fetchSubscriptionData();
        console.log('Автопродление отменено успешно');
        // Reload page to reflect changes
        window.location.reload();
      } else {
        // Fallback to email method
        const subject = 'Запрос на отмену автопродления';
        const body = `Здравствуйте!

Прошу отменить автопродление для моей подписки Pro.

ID подписки: ${subscriptionId}
Email: ${user?.email}

Спасибо.`;
        
        const mailtoUrl = `mailto:neuroseti.praktika@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoUrl;
      }
    } catch (error) {
      console.error('Error:', error);
      // Fallback to email method
      const subject = 'Запрос на отмену автопродления';
      const body = `Здравствуйте!

Прошу отменить автопродление для моей подписки Pro.

ID подписки: ${subscriptionId}
Email: ${user?.email}

Спасибо.`;
      
      const mailtoUrl = `mailto:neuroseti.praktika@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoUrl;
    } finally {
      setIsCancelling(false);
    }
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
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Статус:</span>
              {getStatusBadge()}
            </div>

            {status === 'pro' && subscriptionExpiry && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Действует до:</span>
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
                {subscriptionId ? (
                  <>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-800 font-medium">
                        Автопродление: включено (2,900₽/месяц)
                      </p>
                      <p className="text-green-700 text-sm mt-1">
                        Подписка будет автоматически продлена в дату окончания
                      </p>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto border-amber-200 text-amber-700 hover:bg-amber-50">
                          Отменить автопродление
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                            Отмена автопродления
                          </AlertDialogTitle>
                          <AlertDialogDescription className="space-y-2">
                            <p>Вы уверены, что хотите отменить автопродление?</p>
                            <p className="text-sm text-muted-foreground">
                              Ваша текущая подписка останется активной до окончания оплаченного периода.
                              Автоматическое списание будет отключено.
                            </p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction 
                            disabled={isCancelling}
                            onClick={handleCancelSubscription}
                            className="bg-amber-600 hover:bg-amber-700"
                          >
                            {isCancelling ? 'Отменяем...' : 'Отменить автопродление'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-800 font-medium">
                      Автопродление: отключено
                    </p>
                    <p className="text-amber-700 text-sm mt-1">
                      Подписка действует до окончания оплаченного периода. Для продления оформите новую подписку.
                    </p>
                  </div>
                )}
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