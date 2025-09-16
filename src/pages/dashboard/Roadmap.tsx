import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Brain, Users, Factory, Trophy, MapPin, Plus, Minus, RotateCcw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import treasureMapImage from "@/assets/treasure-map-new.png";

const roadmapSteps = [
  {
    id: 1,
    title: "Распаковка личности",
    description: "Глубокий анализ вашей личности и уникальных качеств",
    icon: Brain,
    route: "/dashboard/personality-unpacking",
    status: "available",
    position: { top: "30%", left: "18%" } // На черной точке пунктирной линии
  },
  {
    id: 2,
    title: "Исследование ЦА",
    description: "Детальное изучение целевой аудитории", 
    icon: Users,
    route: "/dashboard",
    status: "available",
    position: { top: "55%", left: "22%" } // На пунктирной линии слева
  },
  {
    id: 3,
    title: "Контент завод",
    description: "Автоматизированное создание контента",
    icon: Factory,
    route: "#",
    status: "coming-soon",
    position: { top: "75%", left: "45%" } // На пунктирной линии снизу
  },
  {
    id: 4,
    title: "Первые заявки и лиды",
    description: "Получение результатов и конверсий",
    icon: Trophy,
    route: "#",
    status: "treasure",
    position: { top: "55%", left: "68%" } // На пунктирной линии справа
  }
];

export default function Roadmap() {
  const navigate = useNavigate();
  const storageKey = "roadmap_positions_v1";
  const characterSettingsKey = "roadmap_character_settings_v1";
  const didDragRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const characterOffsetRef = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 });
  const [stepPositions, setStepPositions] = useState(() => {
    const base = roadmapSteps.reduce((acc, step) => {
      acc[step.id] = step.position;
      return acc;
    }, {} as Record<number, { top: string; left: string }>);
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return { ...base, ...JSON.parse(raw) };
    } catch {}
    return base;
  });
  const [draggedStep, setDraggedStep] = useState<number | null>(null);
  
  // Character controls
  const [characterSize, setCharacterSize] = useState(100); // percentage
  const [characterPosition, setCharacterPosition] = useState({ top: '20px', left: '20px' });
  const [isDraggingCharacter, setIsDraggingCharacter] = useState(false);
  const [blendMode, setBlendMode] = useState<'normal' | 'screen' | 'multiply'>(() => {
    try {
      const saved = localStorage.getItem(characterSettingsKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const bm = parsed?.blendMode;
        if (bm === 'normal' || bm === 'screen' || bm === 'multiply') return bm;
      }
    } catch {}
    return 'screen';
  });

  const handleStepClick = (step: typeof roadmapSteps[0]) => {
    if (step.status === "available" && step.route !== "#") {
      navigate(step.route);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, stepId: number) => {
    e.preventDefault();
    setDraggedStep(stepId);
    didDragRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCharacter) {
      handleCharacterMouseMove(e);
    }
    if (draggedStep === null) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const start = startPosRef.current;
    if (start) {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.hypot(dx, dy) > 3) didDragRef.current = true;
    }
    
    setStepPositions(prev => ({
      ...prev,
      [draggedStep]: {
        left: `${Math.max(0, Math.min(100, x))}%`,
        top: `${Math.max(0, Math.min(100, y))}%`
      }
    }));
  };

  const handleMouseUp = () => {
    if (draggedStep !== null) {
      console.log('Final positions:', stepPositions);
      try { localStorage.setItem(storageKey, JSON.stringify(stepPositions)); } catch {}
    }
    setDraggedStep(null);
    startPosRef.current = null;
    if (isDraggingCharacter) {
      setIsDraggingCharacter(false);
    }
  };

  // Load saved positions on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as Record<number, { top: string; left: string }>;
        setStepPositions(prev => ({ ...prev, ...saved }));
      }
    } catch {}
  }, []);

  const handleCharacterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingCharacter(true);
    const container = containerRef.current;
    const target = e.currentTarget as HTMLElement;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const elRect = target.getBoundingClientRect();
      characterOffsetRef.current = {
        offsetX: e.clientX - elRect.left,
        offsetY: e.clientY - elRect.top,
      };
    }
  };

  const handleCharacterMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCharacter) return;
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const { offsetX, offsetY } = characterOffsetRef.current;
    const width = characterSize;
    const height = characterSize;

    let left = e.clientX - containerRect.left - offsetX;
    let top = e.clientY - containerRect.top - offsetY;

    // Clamp within container bounds
    left = Math.max(0, Math.min(containerRect.width - width, left));
    top = Math.max(0, Math.min(containerRect.height - height, top));

    setCharacterPosition({
      left: `${left}px`,
      top: `${top}px`,
    });
  };

  const handleCharacterMouseUp = () => {
    setIsDraggingCharacter(false);
  };

  const resetCharacterPosition = () => {
    setCharacterPosition({ top: '20px', left: '20px' });
    setCharacterSize(100);
  };

  useEffect(() => {
    try {
      const prevRaw = localStorage.getItem(characterSettingsKey);
      const prev = prevRaw ? JSON.parse(prevRaw) : {};
      localStorage.setItem(characterSettingsKey, JSON.stringify({ ...prev, blendMode }));
    } catch {}
  }, [blendMode]);

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
          <div ref={containerRef} className="relative overflow-hidden"
               onMouseMove={handleMouseMove}
               onMouseUp={handleMouseUp}
               onMouseLeave={handleMouseUp}>
            <img 
              src={treasureMapImage} 
              alt="Treasure Map" 
              className="w-full h-auto max-h-[600px] object-contain"
            />
            
            {/* Animated Character in bottom right corner */}
            <div 
              className="absolute z-30 cursor-move"
              style={{ 
                top: characterPosition.top, 
                left: characterPosition.left,
                transform: isDraggingCharacter ? 'scale(1.1)' : 'scale(1)',
                transition: isDraggingCharacter ? 'none' : 'transform 0.2s ease'
              }}
              onMouseDown={handleCharacterMouseDown}
              onMouseMove={handleCharacterMouseMove}
              onMouseUp={handleCharacterMouseUp}
              onMouseLeave={handleCharacterMouseUp}
            >
              <video 
                autoPlay 
                loop 
                muted 
                playsInline
                className="object-contain pointer-events-none"
                style={{ 
                  width: `${characterSize}px`,
                  height: `${characterSize}px`,
                  backgroundColor: 'transparent',
                  mixBlendMode: blendMode === 'normal' ? undefined : blendMode
                }}
              >
                <source src="/assets/animated-character.webm?v=20250916-1" type="video/webm" />
              </video>
            </div>
            {/* Interactive Areas */}
            {roadmapSteps.map((step) => (
              <Tooltip key={step.id}>
                <TooltipTrigger asChild>
                  <div
                    className="absolute cursor-move transform -translate-x-1/2 -translate-y-1/2 group select-none"
                    style={{ 
                      top: stepPositions[step.id].top, 
                      left: stepPositions[step.id].left,
                      zIndex: draggedStep === step.id ? 20 : 10
                    }}
                    onMouseDown={(e) => handleMouseDown(e, step.id)}
                    onClick={(e) => {
                      if (didDragRef.current) { e.preventDefault(); return }
                      handleStepClick(step)
                    }}
                  >
                    {/* Interactive hotspot */}
                    <div className={`
                      w-8 h-8 md:w-12 md:h-12 rounded-full border-2 md:border-4
                      ${draggedStep === step.id 
                        ? "border-red-500 bg-red-100 shadow-lg shadow-red-500/50"
                        : step.status === "available" 
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
          
          {/* Character Controls */}
          <div className="mt-4 flex justify-center">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 border border-gray-200 shadow-md">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-700 font-medium">Настройка персонажа:</span>
                
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Размер:</span>
                  <button 
                    onClick={() => setCharacterSize(prev => Math.max(50, prev - 10))}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-xs">{characterSize}px</span>
                  <button 
                    onClick={() => setCharacterSize(prev => Math.min(400, prev + 10))}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Наложение:</span>
                  <select
                    value={blendMode}
                    onChange={(e) => setBlendMode(e.target.value as 'normal' | 'screen' | 'multiply')}
                    className="border border-gray-200 rounded px-2 py-1 text-xs bg-white"
                  >
                    <option value="normal">Нет</option>
                    <option value="screen">Screen (убирает черный)</option>
                    <option value="multiply">Multiply (убирает белый)</option>
                  </select>
                </div>
                
                <button 
                  onClick={resetCharacterPosition}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="text-xs">Сброс</span>
                </button>
                
                <span className="text-xs text-gray-500">Перетащите персонажа для изменения позиции</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}