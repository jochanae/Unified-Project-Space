import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollReveal } from "@/hooks/useScrollAnimation";
import { Heart, GraduationCap, DollarSign, HandHeart, Sparkles } from "lucide-react";

const milestones = [
  {
    icon: GraduationCap,
    label: "Paid for courses",
    detail: "Certifications that said 'pro trader' — but taught nothing practical.",
    color: "text-loss",
    bgColor: "bg-loss/10",
    borderColor: "border-loss/20",
  },
  {
    icon: DollarSign,
    label: "Lost money",
    detail: "Jumped in without real guidance. Emotions took over. Walked away.",
    color: "text-gold",
    bgColor: "bg-gold/10",
    borderColor: "border-gold/20",
  },
  {
    icon: HandHeart,
    label: "Needed a mentor",
    detail: "Not another program — just a patient friend to say 'try this' or 'watch out for that.'",
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
  },
  {
    icon: Sparkles,
    label: "Built Quinn",
    detail: "Learned more in minutes with Quinn than years of expensive classes.",
    color: "text-gain",
    bgColor: "bg-gain/10",
    borderColor: "border-gain/20",
  },
];

export function FounderStorySection() {
  return (
    <section id="our-story" className="py-16 sm:py-24 relative overflow-hidden">
      {/* Subtle background accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />

      <div className="px-4 sm:px-6 lg:px-8 relative">
        <ScrollReveal className="text-center mb-10 sm:mb-14">
          <Badge variant="secondary" className="mb-3 sm:mb-4 bg-loss/10 border-loss/20">
            <Heart className="h-3 w-3 mr-1 text-loss" />
            <span className="text-loss">Our Story</span>
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4">
            Why we built <span className="gradient-text">Quinn</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-lg px-4">
            Because everyone deserves a mentor — not another sales pitch.
          </p>
        </ScrollReveal>

        <div className="max-w-4xl mx-auto">
          {/* The story */}
          <ScrollReveal delay={100}>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm mb-8 sm:mb-12">
              <CardContent className="p-6 sm:p-10">
                <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                  <p className="text-base sm:text-lg leading-relaxed text-foreground/90">
                    I wanted to learn how to invest. Save for retirement. Build something for my future. But I didn't have a mentor — no one to guide me. So I did what a lot of people do:
                    <span className="font-semibold text-foreground"> I paid for classes.</span>
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-foreground/90 mt-4">
                    $700 for one program. $999 for another. Certifications that called me a "professional trader" — but I knew absolutely nothing. No hands-on experience. No real guidance. Just promises that were never delivered.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-foreground/90 mt-4">
                    I jumped in, lost money, and my emotional side kicked in: <span className="italic text-muted-foreground">"I don't have the stomach for this."</span> But if I'd had someone — a friend, a mentor — to hold my hand and say <span className="font-semibold text-primary">"watch out for this"</span> or <span className="font-semibold text-primary">"try this instead,"</span> I would have been so much better off from the start.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-foreground/90 mt-4">
                    So I built that mentor. <span className="font-semibold text-primary">Quinn</span> isn't trying to sell you a program. You get <span className="font-semibold">10 free conversations every month</span> — the same data, the same quality — whether you're free or Pro. And when I tested it myself, I learned more in a few minutes than I did across all those years and all those expensive classes.
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-foreground/90 mt-4 font-medium">
                    That's why IntoIQ exists — because access to financial guidance shouldn't cost you your savings first.
                  </p>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Journey milestones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {milestones.map((milestone, index) => (
              <ScrollReveal key={milestone.label} delay={200 + index * 100}>
                <Card className={`h-full border ${milestone.borderColor} bg-card/50 backdrop-blur-sm`}>
                  <CardContent className="p-4 sm:p-5 text-center">
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${milestone.bgColor} mb-3`}>
                      <milestone.icon className={`h-5 w-5 ${milestone.color}`} />
                    </div>
                    <p className="font-semibold text-sm mb-1">{milestone.label}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{milestone.detail}</p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
