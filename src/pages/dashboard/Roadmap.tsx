import { useNavigate } from "react-router-dom";
import { Brain, Users, Factory, Trophy, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const roadmapSteps = [
  {
    id: 1,
    title: "Распаковка личности",
    description: "Глубокий анализ вашей личности и уникальных качеств",
    icon: Brain,
    route: "/dashboard/personality-unpacking",
    status: "available",
    position: { top: "10%", left: "20%" }
  },
  {
    id: 2,
    title: "Исследование ЦА",
    description: "Детальное изучение целевой аудитории",
    icon: Users,
    route: "/dashboard",
    status: "available",
    position: { top: "40%", left: "60%" }
  },
  {
    id: 3,
    title: "Контент завод",
    description: "Автоматизированное создание контента",
    icon: Factory,
    route: "#",
    status: "coming-soon",
    position: { top: "70%", left: "30%" }
  },
  {
    id: 4,
    title: "Первые заявки и лиды",
    description: "Получение результатов и конверсий",
    icon: Trophy,
    route: "#",
    status: "treasure",
    position: { top: "85%", left: "70%" }
  }
];

export default function Roadmap() {
  const navigate = useNavigate();

  const handleStepClick = (step: typeof roadmapSteps[0]) => {
    if (step.status === "available" && step.route !== "#") {
      navigate(step.route);
    }
  };

  const getStepCardStyles = (status: string) => {
    switch (status) {
      case "available":
        return "cursor-pointer hover:scale-105 transition-all duration-300 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10";
      case "coming-soon":
        return "opacity-70 bg-gradient-to-br from-muted/50 to-muted/30 border-muted-foreground/20";
      case "treasure":
        return "bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border-yellow-500/30 shadow-lg shadow-yellow-500/10 animate-pulse";
      default:
        return "";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge variant="secondary" className="bg-green-500/20 text-green-700 border-green-500/30">Доступно</Badge>;
      case "coming-soon":
        return <Badge variant="outline" className="border-muted-foreground/30">Скоро</Badge>;
      case "treasure":
        return <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0">🏆 Сокровище</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 p-6 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "20px 20px"
        }}></div>
      </div>

      {/* Header */}
      <div className="relative z-10 text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <MapPin className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Дорожная карта успеха
          </h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Ваш путь к достижению целей через структурированный подход
        </p>
      </div>

      {/* Roadmap Container */}
      <div className="relative max-w-6xl mx-auto h-[800px]">
        {/* Path connections with dashed lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          <defs>
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6"/>
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.3"/>
            </linearGradient>
          </defs>
          
          {/* Path from step 1 to step 2 */}
          <path
            d="M 25% 20% Q 45% 15% 65% 50%"
            stroke="url(#pathGradient)"
            strokeWidth="3"
            strokeDasharray="8,8"
            fill="none"
            className="animate-pulse"
          />
          
          {/* Path from step 2 to step 3 */}
          <path
            d="M 60% 50% Q 45% 60% 35% 80%"
            stroke="url(#pathGradient)"
            strokeWidth="3"
            strokeDasharray="8,8"
            fill="none"
            className="animate-pulse"
          />
          
          {/* Path from step 3 to step 4 */}
          <path
            d="M 35% 80% Q 55% 85% 70% 90%"
            stroke="url(#pathGradient)"
            strokeWidth="3"
            strokeDasharray="8,8"
            fill="none"
            className="animate-pulse"
          />
        </svg>

        {/* Roadmap Steps */}
        {roadmapSteps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{ 
                top: step.position.top, 
                left: step.position.left,
                zIndex: 10
              }}
            >
              <Card 
                className={`w-64 ${getStepCardStyles(step.status)}`}
                onClick={() => handleStepClick(step)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${
                        step.status === "treasure" 
                          ? "bg-gradient-to-br from-yellow-500 to-amber-500 text-white" 
                          : "bg-primary/10 text-primary"
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground">
                        Этап {step.id}
                      </span>
                    </div>
                    {getStatusBadge(step.status)}
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm mb-3">
                    {step.description}
                  </CardDescription>
                  {step.status === "available" && step.route !== "#" && (
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStepClick(step);
                      }}
                    >
                      Перейти
                    </Button>
                  )}
                  {step.status === "coming-soon" && (
                    <Button size="sm" variant="outline" className="w-full" disabled>
                      Скоро доступно
                    </Button>
                  )}
                  {step.status === "treasure" && (
                    <div className="text-center">
                      <div className="text-2xl mb-2">🏆✨💎</div>
                      <p className="text-xs text-muted-foreground">
                        Награда за прохождение пути
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}

        {/* Decorative elements */}
        <div className="absolute top-5 right-5 text-4xl opacity-20 animate-bounce">⭐</div>
        <div className="absolute bottom-10 left-10 text-3xl opacity-20 animate-pulse">🗺️</div>
        <div className="absolute top-1/2 right-10 text-2xl opacity-20">🧭</div>
      </div>
    </div>
  );
}