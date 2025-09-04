// Component for displaying file conversion progress
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { ConversionProgress } from "@/lib/file-conversion";

interface FileConversionProgressProps {
  progress: ConversionProgress[];
  onCancel?: () => void;
}

export function FileConversionProgress({ progress, onCancel }: FileConversionProgressProps) {
  const getStatusIcon = (status: ConversionProgress['status']) => {
    switch (status) {
      case 'pending':
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case 'converting':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: ConversionProgress['status']) => {
    switch (status) {
      case 'pending':
        return 'Ожидание';
      case 'converting':
        return 'Конвертация';
      case 'completed':
        return 'Завершено';
      case 'error':
        return 'Ошибка';
      default:
        return 'Неизвестно';
    }
  };

  const getStatusVariant = (status: ConversionProgress['status']) => {
    switch (status) {
      case 'pending':
        return 'secondary' as const;
      case 'converting':
        return 'default' as const;
      case 'completed':
        return 'default' as const; // Using default instead of success
      case 'error':
        return 'destructive' as const;
      default:
        return 'secondary' as const;
    }
  };

  const completedCount = progress.filter(p => p.status === 'completed').length;
  const errorCount = progress.filter(p => p.status === 'error').length;
  const totalProgress = progress.length > 0 
    ? Math.round(progress.reduce((sum, p) => sum + p.progress, 0) / progress.length)
    : 0;

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            Конвертация файлов ({completedCount}/{progress.length})
          </h3>
          <span className="text-sm text-muted-foreground">{totalProgress}%</span>
        </div>
        <Progress value={totalProgress} className="w-full" />
        
        {errorCount > 0 && (
          <p className="text-sm text-destructive">
            {errorCount} файл(ов) не удалось конвертировать
          </p>
        )}
      </div>

      {/* Individual File Progress */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {progress.map((item, index) => (
          <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
            <div className="flex-shrink-0">
              {getStatusIcon(item.status)}
            </div>
            
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium truncate" title={item.filename}>
                  {item.filename}
                </p>
                <Badge variant={getStatusVariant(item.status)}>
                  {getStatusText(item.status)}
                </Badge>
              </div>
              
              {item.status === 'converting' && (
                <Progress value={item.progress} className="w-full h-2" />
              )}
              
              {item.error && (
                <p className="text-xs text-destructive">{item.error}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Cancel Button */}
      {onCancel && (
        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Отменить
          </button>
        </div>
      )}
    </div>
  );
}