import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Анна П.",
    role: "CMO в eCom",
    text: "Собрали инсайты за вечер вместо недели. Персоны и JTBD — попадание." ,
  },
  {
    name: "Игорь С.",
    role: "Product Lead",
    text: "Точность отчёта удивила — реально применимо для roadmap и рекламных гипотез.",
  },
  {
    name: "Мария К.",
    role: "Founder",
    text: "Для питча инвесторам — must have. Чётко и по делу.",
  },
];

const Stars = () => (
  <div className="flex gap-1 text-[hsl(var(--brand-purple))]">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className="w-4 h-4 fill-current" />
    ))}
  </div>
);

const Testimonials = () => {
  return (
    <section className="py-24 bg-[hsl(var(--background-alt))]">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Отзывы</h2>
        <Carousel className="relative">
          <CarouselContent>
            {testimonials.map((t, idx) => (
              <CarouselItem key={idx} className="md:basis-1/2 lg:basis-1/3">
                <div className="h-full border bg-card rounded-3xl p-6 hover-lift">
                  <Stars />
                  <p className="mt-4 text-muted-foreground">{t.text}</p>
                  <div className="mt-6 font-semibold">{t.name}</div>
                  <div className="text-sm text-muted-foreground">{t.role}</div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </section>
  );
};

export default Testimonials;
