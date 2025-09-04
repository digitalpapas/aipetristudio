import { useToast as useBaseToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, AlertCircle, Info, Trophy, Trash2, Save, Download, Copy, RefreshCw } from "lucide-react";
import { ReactNode } from "react";

type ToastType = "success" | "error" | "warning" | "info" | "achievement" | "delete";

interface CustomToastOptions {
  title: string;
  description?: string | ReactNode;
  type?: ToastType;
  duration?: number;
  icon?: ReactNode;
}

export function useCustomToast() {
  const { toast: baseToast } = useBaseToast();

  const getIcon = (type: ToastType): ReactNode => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-amber-600" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-600" />;
      case "achievement":
        return (
          <div className="relative">
            <Trophy className="h-5 w-5 text-purple-600" />
            <div className="absolute -inset-1 animate-ping">
              <Trophy className="h-5 w-5 text-purple-400 opacity-40" />
            </div>
          </div>
        );
      case "delete":
        return <Trash2 className="h-5 w-5 text-red-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStyles = (type: ToastType): string => {
    switch (type) {
      case "success":
        return "border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-800";
      case "error":
        return "border-red-200 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 dark:border-red-800";
      case "warning":
        return "border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 dark:border-amber-800";
      case "info":
        return "border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-950/20 dark:to-sky-950/20 dark:border-blue-800";
      case "achievement":
        return "border-purple-200 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 dark:border-purple-800";
      case "delete":
        return "border-red-200 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 dark:border-red-800";
      default:
        return "border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20 dark:border-gray-800";
    }
  };

  const toast = ({ title, description, type = "info", duration = 4000, icon }: CustomToastOptions) => {
    const toastIcon = icon || getIcon(type);
    
    // Упрощенные стили БЕЗ градиентов для правильного отображения
    const getSimpleStyles = (type: ToastType): string => {
      switch (type) {
        case "success":
          return "bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-800";
        case "error":
          return "bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800";
        case "warning":
          return "bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800";
        case "info":
          return "bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800";
        case "achievement":
          return "bg-purple-50 border-purple-200 dark:bg-purple-950/50 dark:border-purple-800";
        case "delete":
          return "bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800";
        default:
          return "bg-gray-50 border-gray-200 dark:bg-gray-950/50 dark:border-gray-800";
      }
    };

    const styles = getSimpleStyles(type);

    // Создаем составной заголовок с иконкой
    const titleWithIcon = `${title}`;
    
    baseToast({
      title: titleWithIcon,
      description: (
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 mt-0.5">
            {toastIcon}
          </div>
          <div className="flex-1">
            {description && (
              <div className="text-sm">
                {description}
              </div>
            )}
          </div>
        </div>
      ),
      duration,
      className: styles
    });
  };

  return { toast };
}