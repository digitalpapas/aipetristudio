import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Users, Target, Zap, ArrowRight } from "lucide-react";

export default function PersonalityUnpackingPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <Brain className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-[hsl(var(--heading))]">
          Распаковка личности
        </h1>
        <p className="text-xl text-[hsl(var(--muted-foreground))] max-w-3xl mx-auto">
          Глубокий анализ вашего внутреннего мира, ценностей и мотиваций для создания 
          аутентичного личного бренда
        </p>
      </div>

      {/* Coming Soon Notice */}
      <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-4">
            <Zap className="h-12 w-12 text-primary animate-pulse" />
          </div>
          <h3 className="text-2xl font-semibold mb-2 text-[hsl(var(--heading))]">
            Скоро запуск!
          </h3>
          <p className="text-lg text-[hsl(var(--muted-foreground))] mb-6">
            Мы работаем над революционным инструментом для анализа личности
          </p>
          <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
            Узнать о запуске
          </Button>
        </CardContent>
      </Card>

      {/* Features Preview */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="group hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <CardTitle className="text-xl">Анализ ценностей</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[hsl(var(--muted-foreground))]">
              Выявление ваших глубинных ценностей и убеждений, которые движут вашими решениями
            </p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-xl">Мотивационный профиль</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[hsl(var(--muted-foreground))]">
              Определение внутренних и внешних факторов, которые вас мотивируют и вдохновляют
            </p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-xl">Стиль коммуникации</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[hsl(var(--muted-foreground))]">
              Анализ вашего уникального способа общения и взаимодействия с аудиторией
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Process Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-center">Как это будет работать</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto">
                <span className="text-white font-bold text-xl">1</span>
              </div>
              <h4 className="font-semibold">Психологическое тестирование</h4>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Комплексная оценка личностных качеств и предпочтений
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto">
                <span className="text-white font-bold text-xl">2</span>
              </div>
              <h4 className="font-semibold">Глубинный анализ</h4>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                ИИ анализирует ваши ответы и выявляет скрытые паттерны
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto">
                <span className="text-white font-bold text-xl">3</span>
              </div>
              <h4 className="font-semibold">Персональный профиль</h4>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Создание детального профиля вашей личности
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mx-auto">
                <span className="text-white font-bold text-xl">4</span>
              </div>
              <h4 className="font-semibold">Рекомендации</h4>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Практические советы для развития личного бренда
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA Section */}
      <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <CardContent className="pt-8 pb-8 text-center">
          <h3 className="text-2xl font-bold mb-4">
            Будьте первыми, кто попробует
          </h3>
          <p className="text-lg mb-6 opacity-90">
            Подпишитесь на уведомления о запуске и получите скидку 50%
          </p>
          <Button 
            variant="secondary" 
            size="lg"
            className="bg-white text-purple-600 hover:bg-gray-100"
          >
            Уведомить о запуске
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}