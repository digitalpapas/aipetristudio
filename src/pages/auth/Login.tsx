import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Github, Bell, Mail, LogIn, Lock, Eye, EyeOff } from "lucide-react";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.78-.07-1.53-.2-2.27H12v4.29h6.48c-.28 1.5-1.12 2.77-2.39 3.62v3h3.87c2.27-2.09 3.53-5.17 3.53-8.64z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.87-3c-1.08.72-2.46 1.16-4.08 1.16-3.14 0-5.8-2.12-6.75-4.98H1.26v3.12A12 12 0 0012 24z"/>
      <path fill="#FBBC05" d="M5.25 14.27A7.2 7.2 0 014.87 12c0-.79.14-1.56.38-2.27V6.61H1.26A12 12 0 000 12c0 1.9.46 3.69 1.26 5.39l3.99-3.12z"/>
      <path fill="#EA4335" d="M12 4.73c1.76 0 3.34.6 4.59 1.78l3.43-3.43C17.93 1.13 15.2 0 12 0 7.29 0 3.23 2.69 1.26 6.61l3.99 3.12C6.2 6.87 8.86 4.73 12 4.73z"/>
    </svg>
  );
}

export default function Login() {
  const { user, signInWithEmail, signInWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = "Вход | AiPetri Studio";
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const onEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast("Введите email и пароль");
    const { error } = await signInWithEmail(email, password);
    if (error) return toast(error.message || "Ошибка входа");
    toast("Добро пожаловать!");
    navigate("/dashboard");
  };

  const onGoogle = async () => {
    const { error } = await signInWithGoogle();
    if (error) toast(error.message || "Ошибка входа через Google");
  };

  const onForgot = async () => {
    if (!email) return toast("Введите email в поле выше и нажмите 'Забыли пароль?'");
    const { error } = await resetPassword(email);
    if (error) return toast(error.message || "Не удалось отправить письмо");
    toast("Письмо для сброса пароля отправлено");
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="flex items-center justify-center p-6 md:p-10">
        <Card className="w-full max-w-md shadow-elevated">
          <CardContent className="pt-6">
            <div className="mb-6">
              <div className="text-2xl font-bold">AiPetri Studio</div>
              <p className="text-sm text-muted-foreground mt-1">Войдите в аккаунт</p>
            </div>

            <Button variant="outline" className="w-full" onClick={onGoogle}>
              <GoogleIcon />
              Войти через Google
            </Button>

            <div className="my-6 flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">или</span>
              <Separator className="flex-1" />
            </div>

            <form onSubmit={onEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword((s) => !s)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <button type="button" className="text-sm text-primary underline-offset-4 hover:underline" onClick={onForgot}>
                  Забыли пароль?
                </button>
              </div>
              <Button type="submit" variant="hero" className="w-full">Войти</Button>
            </form>

            <p className="mt-6 text-sm text-center text-muted-foreground">
              Нет аккаунта? <a href="/register" className="text-primary underline-offset-4 hover:underline">Зарегистрируйтесь</a>
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="hidden md:block bg-gradient-primary" aria-hidden="true" />
    </div>
  );
}
