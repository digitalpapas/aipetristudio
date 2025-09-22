import { NavLink, useNavigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, useSidebar } from "@/components/ui/sidebar";
import { LineChart, User, ShoppingCart, LogOut, MoreHorizontal, Brain, MessageCircle, Map, Wrench, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { title: "Профиль", url: "/dashboard/profile", icon: User },
  { title: "Тарифы", url: "/pricing", icon: ShoppingCart },
  { title: "AIPetri-чат", url: "/dashboard/chat", icon: MessageCircle },
];

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { state } = useSidebar();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || "");
  const initials = user?.user_metadata?.full_name?.[0]?.toUpperCase?.() || user?.email?.[0]?.toUpperCase?.() || "A";

  // Update avatar URL when user changes
  useEffect(() => {
    if (user?.user_metadata?.avatar_url) {
      setAvatarUrl(user.user_metadata.avatar_url);
    }
  }, [user?.user_metadata?.avatar_url]);

  // Слушатель изменений auth для синхронизации аватарки
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'USER_UPDATED' && session?.user) {
          const newAvatarUrl = session.user.user_metadata?.avatar_url;
          if (newAvatarUrl && newAvatarUrl !== avatarUrl) {
            setAvatarUrl(newAvatarUrl);
          }
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, [avatarUrl]);

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary-foreground))] font-medium"
      : "hover:bg-[hsl(var(--sidebar-accent))]/60";

  return (
    <Sidebar collapsible="icon" className="dark bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] font-work text-[14.5px]">
      <div className="h-16 flex items-center px-4 text-lg font-semibold gap-2 bg-[hsl(var(--sidebar-accent))] border-b border-[hsl(var(--sidebar-border))]">
        <img src="/lovable-uploads/0abc375b-b8e3-44bf-ab8e-5051b4c118d9.png" alt="Логотип" className="h-6 w-6" />
        {state !== "collapsed" && <span>AiPetri Studio</span>}
      </div>
      <SidebarContent>
        <SidebarGroup>
          {state !== "collapsed" && <SidebarGroupLabel>Навигация</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}


            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {state !== "collapsed" && <SidebarGroupLabel>только по подписке</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/dashboard/roadmap" end className={getNavCls}>
                    <Map className="mr-2 h-4 w-4" />
                    {state !== "collapsed" && <span>Дорожная карта</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/dashboard/personality-unpacking" end className={getNavCls}>
                    <Brain className="mr-2 h-4 w-4" />
                    {state !== "collapsed" && <span>Распаковка личности</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/dashboard" end className={getNavCls}>
                    <LineChart className="mr-2 h-4 w-4" />
                    {state !== "collapsed" && <span>Исследование ЦА</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/dashboard/prompt-generator" className={getNavCls}>
                    <Wrench className="mr-2 h-4 w-4" />
                    {state !== "collapsed" && <span>Инструменты</span>}
                  </NavLink>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <NavLink to="/dashboard/prompt-generator" end className={getNavCls}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        {state !== "collapsed" && <span>Промпт генератор</span>}
                      </NavLink>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>
      
      <SidebarFooter className="border-t border-[hsl(var(--sidebar-border))]">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-1 py-1.5 ml-1">
              <Avatar className="h-8 w-8 rounded-lg shrink-0">
                <AvatarImage src={avatarUrl} alt="avatar" key={avatarUrl} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              {state !== "collapsed" && (
                <>
                  <div className="grid flex-1 text-left text-sm leading-tight min-w-0 max-w-[100px]">
                    <span className="truncate font-semibold text-[hsl(var(--sidebar-foreground))] text-sm">
                      {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                    </span>
                    <span className="truncate text-xs text-[hsl(var(--sidebar-muted-foreground))]">
                      {user?.email}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 data-[state=open]:bg-[hsl(var(--sidebar-accent))]"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-48 rounded-lg bg-background"
                      side="top"
                      align="end"
                      sideOffset={8}
                    >
                      <DropdownMenuItem onClick={() => navigate("/dashboard/profile")}>
                        <User className="mr-2 h-4 w-4" />
                        Профиль
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/account/subscription")}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Подписка
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={async () => { await signOut(); navigate("/login"); }}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Выход
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
