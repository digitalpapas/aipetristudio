import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const FinalCTA = () => {
  const { toast } = useToast();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = data.get('email');
    toast({ title: "Готово!", description: `Мы свяжемся: ${email}` });
    e.currentTarget.reset();
  };

  return (
    <section className="py-24">
      <div className="max-w-5xl mx-auto px-6 md:px-8 rounded-3xl bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-purple))] p-[2px]">
        <div className="rounded-3xl bg-card p-10 md:p-14 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Готовы узнать свою аудиторию?</h2>
          <p className="text-muted-foreground mb-8">Подпишитесь на ранний доступ и получите бонус‑гайд по JTBD.</p>
          <form onSubmit={onSubmit} className="mx-auto max-w-xl flex flex-col sm:flex-row gap-3">
            <Input name="email" type="email" required placeholder="Ваш email" className="h-12" />
            <Button type="submit" variant="hero" className="h-12 rounded-xl">Начать бесплатно</Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
