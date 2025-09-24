import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/AppSidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { NotificationDropdown } from "@/components/dashboard/NotificationDropdown";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || "");
  const isDashboard = location.pathname === "/dashboard";
  const pageLabel = location.pathname === "/pricing"
    ? "Тарифы"
    : location.pathname === "/account/subscription"
    ? "Управление подпиской"
    : location.pathname === "/dashboard/profile"
    ? "Профиль"
    : location.pathname === "/demo"
    ? "Демо-версия"
    : "Мои исследования";
  const initials = user?.user_metadata?.full_name?.[0]?.toUpperCase?.() || user?.email?.[0]?.toUpperCase?.() || "A";
  
  // Update avatar URL when user changes
  useEffect(() => {
    if (user?.user_metadata?.avatar_url) {
      setAvatarUrl(user.user_metadata.avatar_url);
    }
  }, [user?.user_metadata?.avatar_url]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-lg font-semibold">AIPetri Studio</h1>
            <div className="flex items-center gap-2">
              <NotificationDropdown />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-background pt-16">
            <nav className="p-4 space-y-2">
              <div className="flex items-center gap-4 p-4 border-b">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={avatarUrl} alt="avatar" key={avatarUrl} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user?.user_metadata?.full_name || user?.email}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  navigate("/dashboard");
                  setMobileMenuOpen(false);
                }}
              >
                Исследование ЦА
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  navigate("/dashboard/profile");
                  setMobileMenuOpen(false);
                }}
              >
                Профиль
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  navigate("/account/subscription");
                  setMobileMenuOpen(false);
                }}
              >
                Тарифы
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive"
                onClick={async () => {
                  await signOut();
                  navigate("/login");
                }}
              >
                Выход
              </Button>
            </nav>
          </div>
        )}

        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <AppSidebar />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-[hsl(var(--canvas))] lg:rounded-tl-[2rem] lg:rounded-bl-[2rem] overflow-hidden lg:shadow-elevated lg:border lg:border-border lg:relative lg:-ml-10 lg:z-20">
          {/* Desktop Header */}
          <header className="hidden lg:flex h-16 items-center gap-3 px-4">
            <SidebarTrigger />
            
            {isDashboard ? (
              <>
                {/* Поле поиска с фиксированной шириной */}
                <div className="w-full max-w-xl">
                  <Input placeholder="Поиск по исследованиям" />
                </div>
                {/* Спейсер для выравнивания иконок вправо */}
                <div className="flex-1" />
              </>
            ) : (
              <div className="flex-1">
                <p className="font-work text-[20px] font-semibold text-[hsl(var(--heading))] leading-none">{pageLabel}</p>
              </div>
            )}
            
            {/* Только уведомления прижаты к правому краю */}
            <div className="flex items-center gap-2 ml-auto">
              <NotificationDropdown />
            </div>
          </header>
          
          {/* Main Content with mobile spacing */}
          <main className="flex-1 p-3 md:p-4 pt-20 md:pt-8 lg:pt-3 mobile-safe-area overflow-x-safe">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
