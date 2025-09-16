import { useNavigate } from "react-router-dom";
import { Brain, Users, Factory, Trophy, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const roadmapSteps = [
  {
    id: 1,
    title: "Распаковка личности",
    description: "Глубокий анализ вашей личности и уникальных качеств",
    icon: Brain,
    route: "/dashboard/personality-unpacking",
    status: "available",
    position: { top: "50%", left: "15%" }
  },
  {
    id: 2,
    title: "Исследование ЦА",
    description: "Детальное изучение целевой аудитории", 
    icon: Users,
    route: "/dashboard",
    status: "available",
    position: { top: "30%", left: "40%" }
  },
  {
    id: 3,
    title: "Контент завод",
    description: "Автоматизированное создание контента",
    icon: Factory,
    route: "#",
    status: "coming-soon",
    position: { top: "70%", left: "65%" }
  },
  {
    id: 4,
    title: "Первые заявки и лиды",
    description: "Получение результатов и конверсий",
    icon: Trophy,
    route: "#",
    status: "treasure",
    position: { top: "45%", left: "85%" }
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
        return "cursor-pointer hover:scale-105 transition-all duration-300 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg hover:shadow-blue-500/10";
      case "coming-soon":
        return "opacity-70 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20 border-gray-200 dark:border-gray-700";
      case "treasure":
        return "bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-300 dark:border-yellow-700 shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/30 transition-all duration-300";
      default:
        return "";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700">Доступно</Badge>;
      case "coming-soon":
        return <Badge variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400">Скоро</Badge>;
      case "treasure":
        return <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white border-0">🏆 Сокровище</Badge>;
      default:
        return null;
    }
  };

  const getIconStyles = (status: string) => {
    switch (status) {
      case "available":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400";
      case "coming-soon":
        return "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400";
      case "treasure":
        return "bg-gradient-to-br from-yellow-400 to-amber-500 text-white";
      default:
        return "bg-primary/10 text-primary";
    }
  };

  return (
    <TooltipProvider>
      <div className="relative min-h-screen bg-gradient-to-br from-background via-blue-50/30 to-indigo-50/20 dark:from-background dark:via-blue-950/10 dark:to-indigo-950/5 p-6 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "30px 30px"
          }}></div>
        </div>

        {/* Header */}
        <div className="relative z-10 text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <MapPin className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Дорожная карта успеха
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Ваш путь к достижению целей через структурированный подход
          </p>
        </div>

        {/* Roadmap Container */}
        <div className="relative max-w-6xl mx-auto h-[600px]">
          {/* Path connections with dashed lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            <defs>
              <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6"/>
                <stop offset="50%" stopColor="#6366f1" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6"/>
              </linearGradient>
            </defs>
            
            {/* Path from step 1 to step 2 */}
            <path
              d="M 20% 50% Q 30% 35% 40% 30%"
              stroke="url(#pathGradient)"
              strokeWidth="3"
              strokeDasharray="12,8"
              fill="none"
              className="animate-pulse"
            />
            
            {/* Path from step 2 to step 3 */}
            <path
              d="M 40% 30% Q 52% 50% 65% 70%"
              stroke="url(#pathGradient)"
              strokeWidth="3"
              strokeDasharray="12,8"
              fill="none"
              className="animate-pulse"
            />
            
            {/* Path from step 3 to step 4 */}
            <path
              d="M 65% 70% Q 75% 55% 85% 45%"
              stroke="url(#pathGradient)"
              strokeWidth="3"
              strokeDasharray="12,8"
              fill="none"
              className="animate-pulse"
            />
          </svg>

          {/* Roadmap Steps */}
          {roadmapSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Tooltip key={step.id}>
                <TooltipTrigger asChild>
                  <div
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{ 
                      top: step.position.top, 
                      left: step.position.left,
                      zIndex: 10
                    }}
                  >
                    <Card 
                      className={`w-72 ${getStepCardStyles(step.status)} border-2`}
                      onClick={() => handleStepClick(step)}
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${getIconStyles(step.status)}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-semibold text-muted-foreground">
                              Этап {step.id}
                            </span>
                          </div>
                          {getStatusBadge(step.status)}
                        </div>
                        <CardTitle className="text-xl font-bold leading-tight">{step.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <CardDescription className="text-sm mb-4 leading-relaxed">
                          {step.description}
                        </CardDescription>
                        {step.status === "available" && step.route !== "#" && (
                          <Button 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStepClick(step);
                            }}
                          >
                            Перейти
                          </Button>
                        )}
                        {step.status === "coming-soon" && (
                          <Button variant="outline" className="w-full" disabled>
                            Скоро доступно
                          </Button>
                        )}
                        {step.status === "treasure" && (
                          <div className="text-center">
                            <div className="text-3xl mb-3">🏆✨💎</div>
                            <p className="text-sm text-muted-foreground">
                              Награда за прохождение пути
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs p-3">
                  <div className="space-y-2">
                    <p className="font-semibold text-sm">{step.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                    {step.status === "available" && (
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                        ✅ Готов к прохождению
                      </p>
                    )}
                    {step.status === "coming-soon" && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                        ⏳ В разработке
                      </p>
                    )}
                    {step.status === "treasure" && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        🎯 Финальная цель
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Decorative elements */}
          <div className="absolute top-10 right-10 text-3xl opacity-30 animate-bounce">⭐</div>
          <div className="absolute bottom-16 left-10 text-2xl opacity-30 animate-pulse">🗺️</div>
          <div className="absolute top-20 left-1/2 text-xl opacity-20">🧭</div>
          <div className="absolute bottom-20 right-20 text-2xl opacity-25">🏴‍☠️</div>
        </div>
      </div>
    </TooltipProvider>
  );
}