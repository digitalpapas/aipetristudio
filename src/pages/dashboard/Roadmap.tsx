import { useNavigate } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import { Brain, Users, Factory, Trophy, MapPin } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import treasureMapImage from "@/assets/treasure-map-transparent.png";
import oceanBackground from "@/assets/ocean-background.png";

const roadmapSteps = [
  {
    id: 1,
    title: "Распаковка личности",
    description: "Глубокий анализ вашей личности и уникальных качеств",
    icon: Brain,
    route: "/dashboard/personality-unpacking",
    status: "available",
    position: { top: "28%", left: "13%" }
  },
  {
    id: 2,
    title: "Исследование ЦА",
    description: "Детальное изучение целевой аудитории", 
    icon: Users,
    route: "/dashboard",
    status: "available",
    position: { top: "56%", left: "23%" }
  },
  {
    id: 3,
    title: "Контент завод",
    description: "Автоматизированное создание контента",
    icon: Factory,
    route: "#",
    status: "coming-soon",
    position: { top: "33%", left: "43%" }
  },
  {
    id: 4,
    title: "Первые заявки и лиды",
    description: "Получение результатов и конверсий",
    icon: Trophy,
    route: "#",
    status: "treasure",
    position: { top: "54%", left: "62%" }
  }
];

export default function Roadmap() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  
  // Fixed character settings and responsive anchoring (from your screenshot)
  const fixed = {
    size: 850,
    topPx: -65,
    leftPx: 570.3311767578125,
    blendMode: 'screen' as const,
  };
  const sideCrop = 0.75;
  const bottomCrop = 0.2;

  const [refDims, setRefDims] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (!refDims && rect.width && rect.height) {
        setRefDims({ w: rect.width, h: rect.height }); // lock reference size once
      }
    };
    update();
    const ro = new ResizeObserver(() => {
      update();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [refDims]);

  const leftPercent = refDims ? fixed.leftPx / refDims.w : 0;
  const topPercent = refDims ? fixed.topPx / refDims.h : 0;
  const sizePercentW = refDims ? fixed.size / refDims.w : 0;
  const sizePercentH = refDims ? fixed.size / refDims.h : 0;

  const handleStepClick = (step: typeof roadmapSteps[0]) => {
    if (step.status === "available" && step.route !== "#") {
      navigate(step.route);
    }
  };

  return (
    <TooltipProvider>
      <div 
        className="relative min-h-screen p-6 overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${oceanBackground})` }}
      >
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
        <div className="relative max-w-5xl mx-auto flex justify-center">
          {/* Map Image with absolute positioned elements */}
          <div ref={containerRef} className="relative inline-block">
            <img 
              ref={imgRef}
              onLoad={() => {
                const r = imgRef.current?.getBoundingClientRect();
                if (r && !refDims) setRefDims({ w: r.width, h: r.height });
              }}
              src={treasureMapImage} 
              alt="Treasure Map" 
              className="w-full h-auto max-h-[600px] object-contain block"
            />
            
            {/* Interactive Areas - positioned relative to image */}
            {roadmapSteps.map((step) => (
              <Tooltip key={step.id}>
                <TooltipTrigger asChild>
                  <div
                    className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group select-none"
                    style={{ 
                      top: step.position.top, 
                      left: step.position.left,
                      zIndex: 10
                    }}
                    onClick={() => handleStepClick(step)}
                  >
                    {/* Interactive hotspot */}
                    <div className={`
                      w-8 h-8 md:w-12 md:h-12 rounded-full border-2 md:border-4
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
            
            {/* Animated Character - positioned relative to image */}
            <div 
              className="absolute z-30"
              style={{ 
                top: `${topPercent * 100}%`, 
                left: `${leftPercent * 100}%`,
                width: `${sizePercentW * (1 - sideCrop) * 100}%`,
                height: `${sizePercentH * (1 - bottomCrop) * 100}%`,
                overflow: 'hidden'
              }}
            >
              <video 
                autoPlay 
                loop 
                muted 
                playsInline
                className="object-contain pointer-events-none"
                style={{ 
                   width: `${sizePercentW * 100}%`,
                   height: `${sizePercentH * 100}%`,
                   position: 'relative',
                   left: '0px',
                   backgroundColor: 'transparent',
                   mixBlendMode: fixed.blendMode
                }}
              >
                <source src="/assets/latest-character.webm" type="video/webm" />
              </video>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}