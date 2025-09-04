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
    <div className="space-y-4 mb-6">
      {(backUrl || onBack) && (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onBack ? onBack() : navigate(backUrl!)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Button>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}