import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PageHeaderProps {
  backUrl?: string;
  backLabel?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onBack?: () => void;
}

export function PageHeader({ 
  backUrl, 
  backLabel = "Назад", 
  title, 
  subtitle,
  actions,
  onBack 
}: PageHeaderProps) {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-4 mb-6 pt-2 sm:pt-3">
      {(backUrl || onBack) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onBack ? onBack() : navigate(backUrl!)}
            className="flex items-center gap-2 self-start"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="whitespace-nowrap">{backLabel}</span>
          </Button>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      
      <div>
        <h1 className="text-xl sm:text-2xl font-bold break-words">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">{subtitle}</p>
        )}
      </div>
    </div>
  );
}