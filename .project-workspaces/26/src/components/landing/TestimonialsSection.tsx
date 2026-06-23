import { Quote } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

import marcusImg from "@/assets/testimonials/marcus.jpg";
import lindaImg from "@/assets/testimonials/linda.jpg";
import jordanImg from "@/assets/testimonials/jordan.jpg";
import carlosImg from "@/assets/testimonials/carlos.jpg";
import tanyaImg from "@/assets/testimonials/tanya.jpg";
import aishaImg from "@/assets/testimonials/aisha.jpg";
import emmaImg from "@/assets/testimonials/emma.jpg";
import priyaImg from "@/assets/testimonials/priya.jpg";

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  image: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "Before Bloom, I had no clue where my paycheck went each month. The budget tracker showed me I was spending $300 on subscriptions I forgot about. Three months in, I've built my first real emergency fund.",
    name: "Marcus T.",
    role: "First-time budgeter, 28",
    image: marcusImg,
  },
  {
    quote:
      "Retirement felt like a puzzle with missing pieces. Bloom helped me map out every dollar of my pension and Social Security so I could stop worrying and actually enjoy this chapter of life.",
    name: "Linda R.",
    role: "Retired teacher, 62",
    image: lindaImg,
  },
  {
    quote:
      "Freelancing means my income is different every single month. Bloom walked me through a variable-income budget strategy that finally makes sense. I sleep better knowing tax season won't catch me off guard.",
    name: "Jordan K.",
    role: "Freelance designer, 34",
    image: jordanImg,
  },
  {
    quote:
      "Running a small business, I used to juggle five apps for personal and business finances. Now everything lives in Bloom — budgets, bills, savings goals. The Pro plan paid for itself the first week.",
    name: "Carlos D.",
    role: "Small business owner, 39",
    image: carlosImg,
  },
  {
    quote:
      "I thought I was being careful with money until Bloom showed me the numbers. Turns out I had $400 in spending leaks every month. Now that money goes straight into my daughter's college fund.",
    name: "Tanya W.",
    role: "Marketing manager, 35",
    image: tanyaImg,
  },
  {
    quote:
      "Getting my kids to understand money was impossible until KidsBloom. My son now tracks every dollar of his allowance and actually gets excited about saving. It turned finances into a family conversation.",
    name: "Aisha B.",
    role: "Parent & nurse, 38",
    image: aishaImg,
  },
  {
    quote:
      "KidsBloom is the best app ever! I earned 50 stars last week for hitting my savings goal. I'm saving up for new art supplies and I can see the progress bar growing every day!",
    name: "Emma L.",
    role: "KidsBloom explorer, 12",
    image: emmaImg,
  },
  {
    quote:
      "Two missed bills in one month was my wake-up call. Bloom's bill tracker caught everything — due dates, autopay reminders, even which bills are tax-deductible. I've been late-fee-free for six months straight.",
    name: "Priya S.",
    role: "Software engineer, 31",
    image: priyaImg,
  },
];

export const TestimonialsSection = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Quote className="w-4 h-4" />
            Real Impact
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            What users are <span className="text-primary">saying</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            From first-time budgeters to retirees — Bloom meets you where you are.
          </p>
        </div>

        {/* Carousel */}
        <div className="px-10">
          <Carousel opts={{ loop: true, align: "center" }} plugins={[Autoplay({ delay: 4000, stopOnInteraction: false })]} className="w-full">
            <CarouselContent>
              {testimonials.map((t) => (
                <CarouselItem key={t.name} className="md:basis-1/2 lg:basis-1/2">
                  <Card className="p-6 md:p-8 border border-border bg-card h-full flex flex-col items-center text-center">
                    <Quote className="w-10 h-10 text-primary/20 mb-4" />
                    <p className="text-foreground/90 text-sm md:text-base leading-relaxed mb-6 flex-1">
                      "{t.quote}"
                    </p>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={t.image} alt={t.name} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {t.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <p className="font-semibold text-foreground text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </div>
    </section>
  );
};
