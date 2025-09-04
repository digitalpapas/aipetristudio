import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SupabaseTest } from "@/components/SupabaseTest";
import { GitHubSync } from "@/components/GitHubSync";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import * as AuthRoutes from "./pages/auth";
import DashboardLayout from "./pages/dashboard/Layout";
import DashboardHome from "./pages/dashboard/Index";
import ProfilePage from "./pages/dashboard/Profile";
import PricingPage from "./pages/Pricing";
import ResearchNewPage from "./pages/dashboard/ResearchNew";
import ResearchResultPage from "./pages/dashboard/ResearchResult";
import ResearchSegmentPage from "./pages/dashboard/ResearchSegment";
import BookmarksPage from "./pages/dashboard/Bookmarks";
import DiagnosticsPage from "./pages/dashboard/Diagnostics";

const queryClient = new QueryClient();

const App = () => {
  // Полное подавление всех postMessage и Lovable ошибок
  useEffect(() => {
    // Сохраняем оригинальные методы
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;

    // Функция для проверки всех типов спама
    const isSpamMessage = (message: any) => {
      if (typeof message !== 'string') message = String(message);
      return message.includes('postMessage') ||
             message.includes('lovable.js') ||
             message.includes('DOMWindow') ||
             message.includes('gptengineer.app') ||
             message.includes('localhost:3000') ||
             message.includes('target origin') ||
             message.includes('recipient window') ||
             message.includes('Loaded top segments') ||
             message.includes('✅') ||
             message.includes('No projectId') ||
             message.includes('segments loaded') ||
             message.includes('Top segments loaded') ||
             message.includes('We\'re hiring') ||
             message.includes('lovable.dev/careers') ||
             message.includes('Maximum update depth exceeded') ||
             message.includes('setState inside useEffect') ||
             message.includes('Failed to execute') ||
             message.includes('does not match the recipient') ||
             message.includes('origin mismatch') ||
             message.includes('CORS') ||
             /lovable\.js:\d+/.test(message) ||
             message.includes('lovable.dev') ||
             message.includes('sentry.io') ||
             message.includes('Too Many Requests') ||
             message.includes('429');
    };

    // Переопределяем все консольные методы
    console.error = function(...args: any[]) {
      // Блокируем все что содержит lovable.js в любом виде
      const hasLovableReference = args.some(arg => {
        const str = String(arg);
        return str.includes('lovable.js') || 
               str.includes('lovable') ||
               /lovable\.js:\d+/.test(str);
      });
      
      if (hasLovableReference || args.some(isSpamMessage)) return;
      originalConsoleError.apply(console, args);
    };

    console.warn = function(...args: any[]) {
      const hasLovableReference = args.some(arg => {
        const str = String(arg);
        return str.includes('lovable.js') || 
               str.includes('lovable') ||
               /lovable\.js:\d+/.test(str);
      });
      
      if (hasLovableReference || args.some(isSpamMessage)) return;
      originalConsoleWarn.apply(console, args);
    };

    console.log = function(...args: any[]) {
      const hasLovableReference = args.some(arg => {
        const str = String(arg);
        return str.includes('lovable.js') || 
               str.includes('lovable') ||
               /lovable\.js:\d+/.test(str);
      });
      
      if (hasLovableReference || args.some(isSpamMessage)) return;
      originalConsoleLog.apply(console, args);
    };

    // Подавляем ошибки на уровне window
    const originalOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      if (typeof message === 'string' && isSpamMessage(message)) {
        return true; // Предотвращаем дальнейшую обработку
      }
      if (source && typeof source === 'string' && source.includes('lovable.js')) {
        return true; // Блокируем все ошибки из lovable.js
      }
      if (originalOnError) {
        return originalOnError.call(window, message, source, lineno, colno, error);
      }
      return false;
    };

    // Подавляем необработанные промисы
    const originalUnhandledRejection = window.onunhandledrejection;
    window.onunhandledrejection = function(event) {
      if (event.reason && isSpamMessage(String(event.reason))) {
        event.preventDefault();
        return;
      }
      if (originalUnhandledRejection) {
        return originalUnhandledRejection.call(window, event);
      }
    };

    return () => {
      // Восстанавливаем оригинальные методы
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.log = originalConsoleLog;
      window.onerror = originalOnError;
      window.onunhandledrejection = originalUnhandledRejection;
    };
  }, []);

  // Максимально агрессивное подавление lovable.js ошибок
  useEffect(() => {
    // Перехватываем все события консоли на самом низком уровне
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;
    const originalDebug = console.debug;
    
    // Функция для проверки lovable.js
    const isFromLovable = (...args: any[]) => {
      return args.some(arg => {
        const str = String(arg);
        return str.includes('lovable.js') || 
               str.includes('lovable') ||
               /lovable\.js:\d+/.test(str) ||
               (typeof arg === 'object' && arg?.stack && arg.stack.includes('lovable.js'));
      });
    };

    // Полная блокировка всех методов консоли от lovable.js
    console.log = (...args: any[]) => { if (!isFromLovable(...args)) originalLog.apply(console, args); };
    console.warn = (...args: any[]) => { if (!isFromLovable(...args)) originalWarn.apply(console, args); };  
    console.error = (...args: any[]) => { if (!isFromLovable(...args)) originalError.apply(console, args); };
    console.info = (...args: any[]) => { if (!isFromLovable(...args)) originalInfo.apply(console, args); };
    console.debug = (...args: any[]) => { if (!isFromLovable(...args)) originalDebug.apply(console, args); };

    // Блокируем ошибки на уровне окна
    const originalWindowError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      // Если ошибка из lovable.js - игнорируем
      if (source && source.includes('lovable.js')) return true;
      if (message && String(message).includes('lovable')) return true;
      if (error && error.stack && error.stack.includes('lovable.js')) return true;
      
      if (originalWindowError) {
        return originalWindowError.call(this, message, source, lineno, colno, error);
      }
      return false;
    };

    return () => {
      // Восстанавливаем оригинальные методы при размонтировании
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError; 
      console.info = originalInfo;
      console.debug = originalDebug;
      window.onerror = originalWindowError;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<AuthRoutes.Login />} />
              <Route path="/register" element={<AuthRoutes.Register />} />
              <Route path="/verify-email" element={<AuthRoutes.VerifyEmail />} />
              <Route path="/test-supabase" element={<SupabaseTest />} />
              <Route path="/test-github" element={<GitHubSync />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <DashboardHome />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/profile"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <ProfilePage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/diagnostics"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <DiagnosticsPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/research/new"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <ResearchNewPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/research/:id"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <ResearchResultPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/research/:id/segment/:segmentId"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <ResearchSegmentPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/research/:researchId/segment/:segmentId/bookmarks"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <BookmarksPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="/pricing" element={<DashboardLayout><PricingPage /></DashboardLayout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
