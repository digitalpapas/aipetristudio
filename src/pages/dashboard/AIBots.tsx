import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, MessageSquare, Zap, Settings, Sparkles, ArrowRight } from "lucide-react";

export default function AIBotsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
            <Bot className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-[hsl(var(--heading))]">
          AI-боты
        </h1>
        <p className="text-xl text-[hsl(var(--muted-foreground))] max-w-3xl mx-auto">
          Создавайте умных AI-ботов для автоматизации работы с вашей аудиторией 
          и персонализированного общения
        </p>
      </div>

      {/* Coming Soon Notice */}
      <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-green-50/50 to-teal-50/50 dark:from-green-950/20 dark:to-teal-950/20">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-4">
            <Sparkles className="h-12 w-12 text-primary animate-pulse" />
          </div>
          <h3 className="text-2xl font-semibold mb-2 text-[hsl(var(--heading))]">
            В разработке!
          </h3>
          <p className="text-lg text-[hsl(var(--muted-foreground))] mb-6">
            Готовим мощную платформу для создания персональных AI-ботов
          </p>
          <Button className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700">
            Получить ранний доступ
          </Button>
        </CardContent>
      </Card>

      {/* Features Preview */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="group hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MessageSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-xl">Умные диалоги</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[hsl(var(--muted-foreground))]">
              Боты, которые понимают контекст и ведут естественные разговоры с вашей аудиторией
            </p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Settings className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <CardTitle className="text-xl">Гибкая настройка</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[hsl(var(--muted-foreground))]">
              Настраивайте личность бота, стиль общения и знания под ваши задачи
            </p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-xl">Интеграции</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[hsl(var(--muted-foreground))]">
              Подключение к популярным платформам: Telegram, Instagram, WhatsApp, сайты
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Use Cases */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-center">Что смогут ваши боты</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto">
                <span className="text-white font-bold text-sm">💬</span>
              </div>
              <h4 className="font-semibold">Консультации</h4>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Отвечать на вопросы клиентов 24/7
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto">
                <span className="text-white font-bold text-sm">🎯</span>
              </div>
              <h4 className="font-semibold">Лидогенерация</h4>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Квалифицировать потенциальных клиентов
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto">
                <span className="text-white font-bold text-sm">📚</span>
              </div>
              <h4 className="font-semibold">Обучение</h4>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Проводить образовательные курсы
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mx-auto">
                <span className="text-white font-bold text-sm">🛒</span>
              </div>
              <h4 className="font-semibold">Продажи</h4>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Помогать с выбором и покупкой
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bot Types */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="group hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-xl">Персональный ассистент</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[hsl(var(--muted-foreground))] mb-4">
              Бот, который знает всё о вас и вашем бизнесе. Отвечает на вопросы от вашего лица.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs">
                Личный бренд
              </span>
              <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs">
                Экспертность
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-xl">Бизнес-консультант</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[hsl(var(--muted-foreground))] mb-4">
              Автоматизирует первичные консультации и помогает клиентам с выбором услуг.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs">
                Продажи
              </span>
              <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs">
                Автоматизация
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CTA Section */}
      <Card className="bg-gradient-to-r from-green-600 to-teal-600 text-white">
        <CardContent className="pt-8 pb-8 text-center">
          <h3 className="text-2xl font-bold mb-4">
            Создайте своего первого AI-бота
          </h3>
          <p className="text-lg mb-6 opacity-90">
            Зарегистрируйтесь в списке ожидания и получите бесплатный доступ на месяц
          </p>
          <Button 
            variant="secondary" 
            size="lg"
            className="bg-white text-green-600 hover:bg-gray-100"
          >
            Присоединиться к ожиданию
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}