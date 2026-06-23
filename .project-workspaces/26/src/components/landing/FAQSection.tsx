import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { trackEvent } from "@/lib/analytics";

const faqs = [
  {
    question: "What is CoinsBloom?",
    answer: "CoinsBloom is a smart financial platform that helps you track budgets, set savings goals, and build healthy money habits—with tools for everyone, from individuals to families."
  },
  {
    question: "How is Bloom different from ChatGPT or other AI assistants?",
    answer: "Most AI resets every conversation. Bloom builds Strategic Memory — a living model of your income, debts, goals, and decisions that persists across sessions. It's not a chatbot answering questions in isolation; it's a Financial Architect that remembers context, tracks your blueprints, and engineers your next move based on the full picture of your financial world."
  },
  {
    question: "What is the Mental Shredder mode?",
    answer: "The Mental Shredder is Bloom's zero-trace privacy mode. When activated, your conversation is never recorded to your Strategic Memory or Blueprint Ledger — perfect for sensitive scenarios you want to think through without leaving a trail. Think of it as a private whiteboard inside the Inner Sanctum."
  },
  {
    question: "Can I export my financial blueprints as PDFs?",
    answer: "Yes. Premium members can export Strategic Blueprints — full PDF reports of debt payoff plans, savings strategies, and scenario analyses Bloom builds with you. Bring them to a financial advisor, share with a partner, or keep an offline record of your plan."
  },
  {
    question: "Is KidsBloom really free?",
    answer: "Yes! KidsBloom is 100% free forever. We believe every child deserves access to financial education, regardless of their family's subscription status."
  },
  {
    question: "How does the family budgeting work?",
    answer: "Our budgeting tools allow you to create shared family budgets, track spending by category, set allowances for kids, and monitor savings goals together as a family."
  },
  {
    question: "Can I try CoinsBloom before subscribing?",
    answer: "Absolutely! Start with our free tier which includes basic budgeting features and full access to KidsBloom. Upgrade anytime to unlock premium features."
  },
  {
    question: "Is my financial data secure?",
    answer: "Your security is our top priority. We use bank-level encryption and never share your data with third parties. Your financial information stays private and protected."
  }
];

export const FAQSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground">
            Everything you need to know about CoinsBloom
          </p>
        </div>

        <Accordion
          type="single"
          collapsible
          className="w-full space-y-4"
          onValueChange={(value) => {
            if (!value) return;
            const idx = parseInt(value.replace("item-", ""), 10);
            const q = faqs[idx]?.question;
            if (q) trackEvent("faq_expand", { question: q });
          }}
        >
          {faqs.map((faq, index) => {
            // Cycle through colors for variety
            const colors = ["emerald", "purple", "blue", "teal", "pink", "orange"];
            const color = colors[index % colors.length];
            const cardStyle = 
              color === "emerald" ? "bg-gradient-to-br from-white/70 via-emerald-50/30 to-emerald-100/20 border-emerald-200/50 dark:from-slate-800/70 dark:via-emerald-900/15 dark:to-emerald-800/20 dark:border-emerald-700/30" :
              color === "purple" ? "bg-gradient-to-br from-white/70 via-purple-50/30 to-purple-100/20 border-purple-200/50 dark:from-slate-800/70 dark:via-purple-900/15 dark:to-purple-800/20 dark:border-purple-700/30" :
              color === "blue" ? "bg-gradient-to-br from-white/70 via-blue-50/30 to-blue-100/20 border-blue-200/50 dark:from-slate-800/70 dark:via-blue-900/15 dark:to-blue-800/20 dark:border-blue-700/30" :
              color === "teal" ? "bg-gradient-to-br from-white/70 via-teal-50/30 to-teal-100/20 border-teal-200/50 dark:from-slate-800/70 dark:via-teal-900/15 dark:to-teal-800/20 dark:border-teal-700/30" :
              color === "pink" ? "bg-gradient-to-br from-white/70 via-pink-50/30 to-pink-100/20 border-pink-200/50 dark:from-slate-800/70 dark:via-pink-900/15 dark:to-pink-800/20 dark:border-pink-700/30" :
              "bg-gradient-to-br from-white/70 via-orange-50/30 to-orange-100/20 border-orange-200/50 dark:from-slate-800/70 dark:via-orange-900/15 dark:to-orange-800/20 dark:border-orange-700/30";
            
            return (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className={`relative border rounded-lg px-6 backdrop-blur-md shadow-sm overflow-hidden ${cardStyle}`}
              >
                {/* Subtle shimmer overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/15 via-transparent to-white/10 dark:from-white/5 dark:to-white/5 pointer-events-none" />
                <AccordionTrigger className="relative text-left font-medium hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="relative text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </section>
  );
};
