import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";

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

export default function Register() {
  const { user, signUpWithEmail, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    document.title = "Регистрация | AiPetri Studio";
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const onEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) return toast("Нужно согласиться с условиями");
    if (password !== confirm) return toast("Пароли не совпадают");

    const { error } = await signUpWithEmail(email, password, fullName);
    if (error) return toast(error.message || "Ошибка регистрации");

    localStorage.setItem("pendingEmail", email);
    toast("Проверьте почту для подтверждения");
    navigate("/verify-email");
  };

  const onGoogle = async () => {
    const { error } = await signInWithGoogle();
    if (error) toast(error.message || "Ошибка входа через Google");
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="flex items-center justify-center p-6 md:p-10">
        <Card className="w-full max-w-md shadow-elevated">
          <CardContent className="pt-6">
            <div className="mb-6">
              <div className="text-2xl font-bold">AiPetri Studio</div>
              <p className="text-sm text-muted-foreground mt-1">Создайте аккаунт</p>
            </div>

            <Button variant="outline" className="w-full" onClick={onGoogle}>
              <GoogleIcon />
              Зарегистрироваться через Google
            </Button>

            <div className="my-6 flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">или</span>
              <Separator className="flex-1" />
            </div>

            <form onSubmit={onEmailRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Имя</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Подтверждение пароля</Label>
                <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <label className="flex items-start gap-3 text-sm">
                <Checkbox checked={agree} onCheckedChange={(v) => setAgree(Boolean(v))} />
                <span>
                  Я согласен с {" "}
                  <a href="#" className="text-primary underline-offset-4 hover:underline">условиями использования</a> и {" "}
                  <a href="#" className="text-primary underline-offset-4 hover:underline">политикой конфиденциальности</a>
                </span>
              </label>

              <Button type="submit" variant="hero" className="w-full">Создать аккаунт</Button>
            </form>

            <p className="mt-6 text-sm text-center text-muted-foreground">
              Уже есть аккаунт? <a href="/login" className="text-primary underline-offset-4 hover:underline">Войдите</a>
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="hidden md:block bg-gradient-primary" aria-hidden="true" />
    </div>
  );
}
