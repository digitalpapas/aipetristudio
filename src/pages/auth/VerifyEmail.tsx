import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function VerifyEmail() {
  const { resendEmail } = useAuth();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Подтвердите email | AiPetri Studio";
    setEmail(localStorage.getItem("pendingEmail"));
  }, []);

  const onResend = async () => {
    if (!email) return toast("Email не найден");
    const { error } = await resendEmail(email);
    if (error) return toast(error.message || "Не удалось отправить повторно");
    toast("Письмо отправлено повторно");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-elevated">
        <CardContent className="pt-6 text-center space-y-4">
          <h1 className="text-2xl font-semibold">Письмо отправлено</h1>
          <p className="text-muted-foreground">Мы отправили ссылку на подтверждение на {email || "ваш email"}. Проверьте почту.</p>
          <Button variant="hero" onClick={onResend}>Отправить повторно</Button>
        </CardContent>
      </Card>
    </div>
  );
}
