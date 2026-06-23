import { Heart, GraduationCap, DollarSign, Handshake, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

const storySteps = [
  {
    icon: GraduationCap,
    title: "Tried the apps",
    description: "Downloaded every budgeting app out there — but none of them actually taught us anything.",
    color: "text-destructive bg-destructive/10",
  },
  {
    icon: DollarSign,
    title: "Wasted money",
    description: "Paid for premium tiers that promised insights but delivered spreadsheets with a fresh coat of paint.",
    color: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30",
  },
  {
    icon: Handshake,
    title: "Needed a guide",
    description: "Not another dashboard — just a patient friend to say 'start here' or 'watch out for that.'",
    color: "text-bloom-green bg-green-100 dark:text-green-400 dark:bg-green-900/30",
  },
  {
    icon: Sparkles,
    title: "Built Bloom",
    description: "A financial mentor that actually understands your finances and grows with you — not a product trying to upsell you.",
    color: "text-primary bg-primary/10",
  },
];

export const OurStorySection = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            <Heart className="w-4 h-4" />
            Our Story
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Why we built <span className="text-primary">Bloom</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Because everyone deserves a financial mentor — not another subscription trap.
          </p>
        </div>

        {/* Story steps */}
        <div className="grid gap-4 mb-10">
          {storySteps.map((step) => (
            <Card
              key={step.title}
              className="flex items-center gap-4 p-5 border border-border bg-card"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${step.color}`}>
                <step.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Narrative card */}
        <Card className="p-6 md:p-8 border border-border bg-card">
          <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 space-y-4">
            <p>
              We wanted to take control of our money. Budget smarter. Save for real goals. 
              But we didn't have a mentor — no one to guide us. So we did what a lot of people 
              do: <strong>we tried every app out there.</strong>
            </p>
            <p>
              Premium subscriptions. Fancy dashboards. Notifications about spending we already 
              knew about. But none of them actually <em>helped</em> us make better decisions.
            </p>
            <p>
              We thought: <em className="text-muted-foreground">"If only someone could just talk to me about my money — 
              like a patient friend who actually knows what they're talking about."</em>
            </p>
            <p>
              So we built that friend. <span className="text-primary font-semibold">Bloom</span> isn't 
              trying to sell you a course. You get{" "}
              <strong>3 free conversations every day</strong> — the same quality whether 
              you're free or Premium. And when we tested it ourselves, we learned more in a 
              few minutes than years of guessing.
            </p>
            <p className="text-primary font-medium">
              That's why CoinsBloom exists — because managing your money shouldn't require a 
              finance degree.
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
};
