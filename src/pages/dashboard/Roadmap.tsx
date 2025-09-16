import { useNavigate } from "react-router-dom";
import { Brain, Users, Factory, Trophy, MapPin } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import treasureMapImage from "@/assets/treasure-map.png";

const roadmapSteps = [
  {
    id: 1,
    title: "Распаковка личности",
    description: "Глубокий анализ вашей личности и уникальных качеств",
    icon: Brain,
    route: "/dashboard/personality-unpacking",
    status: "available",
    position: { top: "28%", left: "10%" } // Слева от домика на дереве
  },
  {
    id: 2,
    title: "Исследование ЦА",
    description: "Детальное изучение целевой аудитории", 
    icon: Users,
    route: "/dashboard",
    status: "available",
    position: { top: "55%", left: "22%" } // Слева от черепа
  },
  {
    id: 3,
    title: "Контент завод",
    description: "Автоматизированное создание контента",
    icon: Factory,
    route: "#",
    status: "coming-soon",
    position: { top: "35%", left: "60%" } // Центральная правая область
  },
  {
    id: 4,
    title: "Первые заявки и лиды",
    description: "Получение результатов и конверсий",
    icon: Trophy,
    route: "#",
    status: "treasure",
    position: { top: "50%", left: "78%" } // Сундук с сокровищами
  }
];

export default function Roadmap() {
  const navigate = useNavigate();

  const handleStepClick = (step: typeof roadmapSteps[0]) => {
    if (step.status === "available" && step.route !== "#") {
      navigate(step.route);
    }
  };

  return (
    <TooltipProvider>
      <div className="relative min-h-screen bg-gradient-to-br from-background via-amber-50/30 to-orange-50/20 dark:from-background dark:via-amber-950/10 dark:to-orange-950/5 p-6 overflow-hidden">
        {/* Header */}
        <div className="relative z-10 text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <MapPin className="h-8 w-8 text-amber-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Карта сокровищ успеха
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Отправьтесь в увлекательное путешествие к своим целям
          </p>
        </div>

        {/* Treasure Map Container */}
        <div className="relative max-w-5xl mx-auto">
          {/* Map Image */}
          <div className="relative bg-white rounded-2xl shadow-2xl border-8 border-amber-800 overflow-hidden">
            <img 
              src={treasureMapImage} 
              alt="Treasure Map" 
              className="w-full h-auto max-h-[600px] object-contain"
            />
            
            {/* Interactive Areas */}
            {roadmapSteps.map((step) => (
              <Tooltip key={step.id}>
                <TooltipTrigger asChild>
                  <div
                    className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group"
                    style={{ 
                      top: step.position.top, 
                      left: step.position.left,
                      zIndex: 10
                    }}
                    onClick={() => handleStepClick(step)}
                  >
                    {/* Interactive hotspot */}
                    <div className={`
                      w-12 h-12 rounded-full border-4 
                      ${step.status === "available" 
                        ? "border-blue-500 bg-blue-100 hover:bg-blue-200 shadow-lg shadow-blue-500/50" 
                        : step.status === "treasure"
                        ? "border-yellow-500 bg-yellow-100 hover:bg-yellow-200 shadow-lg shadow-yellow-500/50"
                        : "border-gray-400 bg-gray-100 opacity-70"
                      }
                      transition-all duration-300 group-hover:scale-125 flex items-center justify-center
                    `}>
                      <span className="text-lg font-bold">
                        {step.status === "treasure" ? "🏆" : step.id}
                      </span>
                    </div>
                    
                    {/* Pulse effect for available steps */}
                    {step.status === "available" && (
                      <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping opacity-75"></div>
                    )}
                  </div>
                </TooltipTrigger>
                
                <TooltipContent side="top" className="max-w-xs p-4 bg-white border-2 border-amber-200 shadow-xl">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-600 font-bold">Этап {step.id}</span>
                      {step.status === "available" && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                          Доступно
                        </span>
                      )}
                      {step.status === "coming-soon" && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                          Скоро
                        </span>
                      )}
                      {step.status === "treasure" && (
                        <span className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs rounded-full font-medium">
                          🏆 Сокровище
                        </span>
                      )}
                    </div>
                    
                    <h3 className="font-bold text-lg text-gray-800">{step.title}</h3>
                    
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {step.description}
                    </p>
                    
                    {step.status === "available" && step.route !== "#" && (
                      <div className="pt-2">
                        <span className="text-xs text-blue-600 font-medium">
                          🗂️ Нажмите, чтобы перейти
                        </span>
                      </div>
                    )}
                    
                    {step.status === "treasure" && (
                      <div className="text-center pt-2">
                        <span className="text-xs text-amber-600 font-medium">
                          🎯 Финальная награда за прохождение пути!
                        </span>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          
          {/* Legend */}
          <div className="mt-6 flex justify-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-amber-200 shadow-lg">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-500"></div>
                  <span className="text-gray-700">Доступно</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-gray-100 border-2 border-gray-400"></div>
                  <span className="text-gray-700">Скоро</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-100 border-2 border-yellow-500"></div>
                  <span className="text-gray-700">Сокровище</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}