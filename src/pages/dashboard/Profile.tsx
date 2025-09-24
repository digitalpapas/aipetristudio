import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Send, Check, ExternalLink } from "lucide-react";
import { getOrCreateProfile, updateProfile, uploadAvatar } from "@/lib/profile-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

export default function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || "");
  const [newsletter, setNewsletter] = useState(user?.user_metadata?.newsletter || false);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    document.title = "Профиль | AiPetri Studio";
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    // Background loading without showing loader
    try {
      const { data: profile, error } = await getOrCreateProfile(user.id);
      
      if (error) {
        console.error('Profile load error:', error);
        return; // Silently fail if initial data is available
      }
      
      // Update only if data has changed
      if (profile?.full_name && profile.full_name !== fullName) {
        setFullName(profile.full_name);
      }
      if (profile?.avatar_url && profile.avatar_url !== avatarUrl) {
        setAvatarUrl(profile.avatar_url);
      }
      
      setImageLoading(false);
    } catch (error) {
      // Silently log error, don't show toast if initial data is available
      console.error('Profile load error:', error);
    }
  };

  const onAvatarFile = async (file?: File) => {
    if (!file || !user) return;
    
    // Сохраняем файл для последующей загрузки
    setSelectedFile(file);
    
    // Показываем только превью, НЕ загружаем в Supabase
    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);
    setHasUnsavedChanges(true);
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;
    
    setSaving(true);
    
    try {
      let finalAvatarUrl = avatarUrl;
      
      // Если есть выбранный файл - загружаем его
      if (selectedFile) {
        const { data, error } = await uploadAvatar(user.id, selectedFile);
        
        if (error) throw error;
        
        if (data) {
          // Add timestamp to bypass browser cache
          finalAvatarUrl = `${data.publicUrl}?t=${Date.now()}`;
        }
      } else if (avatarUrl.startsWith('blob:')) {
        // Если показывается превью, но файл не выбран, используем старую аватарку
        finalAvatarUrl = user.user_metadata?.avatar_url || "";
      }
      
      // Update email in auth if changed
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email
        });
        if (emailError) {
          toast(emailError.message || "Не удалось обновить email");
          return;
        }
      }
      
      // Update profile in database
      const { error: profileError } = await updateProfile(user.id, {
        full_name: fullName,
        avatar_url: finalAvatarUrl
      });
      
      if (profileError) {
        toast(profileError.message || "Не удалось сохранить профиль");
        return;
      }
      
      // Update user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { 
          newsletter,
          full_name: fullName,
          avatar_url: finalAvatarUrl
        }
      });
      
      if (metadataError) {
        console.warn('Error updating user metadata:', metadataError);
      }
      
      // Immediately update local state
      setAvatarUrl(finalAvatarUrl);
      setSelectedFile(null);
      setHasUnsavedChanges(false);
      
      // Invalidate React Query cache to trigger re-fetch across components
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      
      // Refresh session to sync with sidebar
      await supabase.auth.refreshSession();
      
      toast("Профиль сохранён");
    } catch (error) {
      console.error('Error saving profile:', error);
      toast("Ошибка сохранения профиля");
      
      // Revert optimistic update on error
      if (selectedFile) {
        setAvatarUrl(user.user_metadata?.avatar_url || "");
        setSelectedFile(null);
        setHasUnsavedChanges(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return toast("Введите новый пароль");
    if (newPassword !== confirmPassword) return toast("Пароли не совпадают");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return toast(error.message || "Не удалось изменить пароль");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast("Пароль обновлён");
  };

  const onSaveContacts = (e: React.FormEvent) => {
    e.preventDefault();
    toast("Контакты сохранены (локально). Интеграцию добавим при необходимости.");
  };

  const onCancel = () => {
    setSelectedFile(null);
    setHasUnsavedChanges(false);
    // Возвращаем оригинальную аватарку
    loadProfile();
  };

  const billingStart = new Date();
  const startStr = billingStart.toLocaleDateString("ru-RU");

  return (
    <main className="space-y-4 max-w-full lg:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <header className="sr-only">
        <h1>Профиль</h1>
      </header>

      <section className="space-y-4">
        <Card className="overflow-hidden">
          <div className="h-28 bg-gradient-primary relative">
            <img
              src="/lovable-uploads/0abc375b-b8e3-44bf-ab8e-5051b4c118d9.png"
              alt="Логотип"
              className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 opacity-70"
              loading="lazy"
            />
          </div>
          <CardContent className="pt-0 p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-5 mb-6">
              <div className="relative">
                <Avatar className="h-20 w-20 border-4 border-background shadow-elevated">
                  <AvatarImage src={avatarUrl} alt="Аватар" key={avatarUrl} />
                  <AvatarFallback>{(fullName || email).slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                {saving && selectedFile && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                  </div>
                )}
              </div>
              <div className="text-center sm:text-left">
                <CardTitle className="text-xl">{fullName || "Пользователь"}</CardTitle>
                <CardDescription>{email}</CardDescription>
              </div>
            </div>

            <form onSubmit={onSave} className="grid gap-5 lg:grid-cols-2">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Ваше имя</Label>
                  <Input 
                    id="fullName" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full" 
                  />
                </div>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="avatarFile">Изображение профиля</Label>
                  <Input 
                    id="avatarFile" 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => onAvatarFile(e.currentTarget.files?.[0])}
                    className="w-full" 
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="news" checked={newsletter} onCheckedChange={(v) => setNewsletter(Boolean(v))} />
                  <Label htmlFor="news" className="text-sm">Согласен получать новости сервиса на почту</Label>
                </div>
                <div className="lg:mt-auto flex gap-2">
                  <Button type="submit" variant="hero" disabled={saving} className="w-full sm:w-auto">
                    {saving ? "Сохранение..." : "Сохранить"}
                  </Button>
                  {hasUnsavedChanges && (
                    <Button type="button" variant="outline" onClick={onCancel} disabled={saving} className="w-full sm:w-auto">
                      Отмена
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Изменение пароля</CardTitle>
              <CardDescription>Установите новый пароль для аккаунта</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onChangePassword} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="oldpass">Старый пароль</Label>
                  <Input 
                    id="oldpass" 
                    type="password" 
                    value={oldPassword} 
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="newpass">Новый пароль</Label>
                  <Input 
                    id="newpass" 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmpass">Подтверждение нового пароля</Label>
                  <Input 
                    id="confirmpass" 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full" 
                  />
                </div>
                <div>
                  <Button type="submit" variant="hero" className="w-full sm:w-auto">Изменить</Button>
                </div>
              </form>
            </CardContent>
          </Card>

        </div>
      </section>

    </main>
  );
}

