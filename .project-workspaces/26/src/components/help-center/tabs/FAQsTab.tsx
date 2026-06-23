import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Sparkles, Terminal } from "lucide-react";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

const workstationFaqs = [
  {
    question: "How does the 14-day Liquidity Timeline work?",
    answer: "The Liquidity Workstation opens with a 14-day horizon strip — each cell is a single day, color-coded by your projected end-of-day cash position (emerald = surplus, amber = tight, rose = shortfall). It blends your current account balances with scheduled bills and expected income so you can see runway at a glance. Tap any day to drill into the bills and inflows driving that balance. The strip auto-fits your screen, so all 14 days stay visible without scrolling sideways."
  },
  {
    question: "What do the Bill Deferral buttons in the Workbench do?",
    answer: "Each bill row in the Workbench has interactive controls — Defer (push the due date by 1, 3, or 7 days), Split (break a payment into two halves), or Confirm (lock it in as paid). These actions instantly recalculate the timeline above so you can see exactly how moving a bill reshapes your runway. Nothing is sent to your bank; deferrals update Bloom's plan, and you stay in control of the actual payment."
  },
  {
    question: "What do the color-coded source badges mean?",
    answer: "Wherever Bloom cites a number, you'll see a small inline badge showing where that data came from. This is our transparency layer — every figure is traceable. Badges: 🟢 Accounts (your linked or manual balances), 🟡 Bills (scheduled obligations), 🟢 Income (expected paychecks/deposits), 🔴 Debts (loan and credit balances), 🟣 Budgets (your category limits), 🔵 Plaid (live bank-synced data), ⚪ Manual (entries you typed in). If a badge is missing, treat the figure as Bloom's estimate, not a sourced fact."
  },
  {
    question: "How do I trigger Bloom's Architect Mode?",
    answer: "Architect Mode is Bloom's deep-reasoning posture — full cross-tier audit of your accounts, debts, bills, and goals before answering. Activate it by asking for any of: 'Run a Liquidity Audit', 'Build me a Strategic Roadmap', 'Give me an Architect's Review', or 'Stress-test my next 90 days.' Bloom will pause, scan every layer of your Strategic Memory, and return a structured Blueprint Card you can save or export as a PDF. Use it before big decisions — debt consolidation, a major purchase, or quarterly planning."
  },
];

const faqs = [
  {
    question: "Is CoinsBloom free to use?",
    answer: "Yes! CoinsBloom offers a free plan that includes essential budgeting features like unlimited transactions, up to 5 goals, up to 5 budgets, and up to 3 accounts. For advanced features like bank connection, AI insights, and family sharing, you can upgrade to Premium for $9.99/month."
  },
  {
    question: "What's the difference between Free and Premium plans?",
    answer: "The Free plan gives you access to core budgeting features with some limits. Premium unlocks unlimited goals, budgets, and accounts, plus advanced features like automatic bank sync via Plaid, unlimited Bloom access, shared goals with family or friends, detailed reports with export options, and priority customer support."
  },
  {
    question: "How do I connect my bank accounts?",
    answer: "Premium users can connect bank accounts using Plaid, a secure service trusted by thousands of financial apps. Go to Accounts, click 'Add Account', select 'Connect Bank', and follow the prompts to securely link your institution. Your bank credentials are never stored by CoinsBloom."
  },
  {
    question: "Is my financial data secure?",
    answer: "Absolutely. We use bank-level 256-bit SSL encryption to protect your data. We never sell your information. All data is stored on secure, redundant cloud servers with SOC 2 Type II compliance. You can export or delete your data at any time."
  },
  {
    question: "Can I share goals with my family?",
    answer: "Yes! Premium users can create shared goals and invite family members or friends to collaborate. Each contributor can add funds toward the goal, and everyone can track progress together. Perfect for saving for vacations, gifts, or household purchases."
  },
  {
    question: "How do I track my credit score?",
    answer: "Go to the Credit page to manually enter your credit score. You can log scores from any bureau (Experian, TransUnion, Equifax) and track how it changes over time. Set a credit score goal and get tips on improving your score."
  },
  {
    question: "What happens to my data if I cancel Premium?",
    answer: "Your data is always yours. If you downgrade from Premium to Free, your data remains intact. However, you'll be limited to the Free plan constraints (5 goals, 5 budgets, 3 accounts). Data exceeding these limits won't be deleted but won't be accessible until you upgrade again."
  },
  {
    question: "Can I export my financial data?",
    answer: "Premium users can export transactions, budgets, and reports as CSV or PDF files. Go to Settings > Data Export or use the export options in Reports. This is useful for tax preparation or personal record keeping."
  },
  {
    question: "How do bill reminders work?",
    answer: "When you add a bill, you can enable reminders. CoinsBloom will notify you before the due date (you choose how many days in advance). If you have notifications enabled on your device, you'll receive push notifications. You can also see upcoming bills on your Dashboard."
  },
  {
    question: "What is the Vision Board?",
    answer: "The Vision Board is a visual goal-setting feature where you can add images representing your financial dreams—a new car, vacation, home, etc. It helps keep you motivated by visualizing what you're saving for. Drag and arrange items to create your personal financial vision."
  },
  {
    question: "Can I use CoinsBloom offline?",
    answer: "Yes! CoinsBloom is a Progressive Web App (PWA), which means you can install it on your phone and access it offline. Your data syncs when you're back online. To install, visit the app in your browser and look for the 'Install' or 'Add to Home Screen' option."
  },
  {
    question: "How do I delete my account?",
    answer: "You can delete your account from Settings > Account > Delete Account. This will permanently remove all your data from our servers within 30 days. Please export any data you want to keep before deletion."
  },
  {
    question: "What is Bloom, and how does she remember my data?",
    answer: "Bloom is your persistent Financial Architect. Unlike standard AI chatbots that reset every session, Bloom is powered by a Strategic Memory system (the Blueprint Ledger). She builds a continuous, 5-layer understanding of your identity, finances, active projects, detected insights, and long-term legacy — across the Workstation, Brain, Vault, and her specialized Modes (Coach, Strategist, Private, Mental Shredder). Every interaction compounds, meaning Bloom gets smarter and more context-aware the more you build together. Free users get 3 messages per day; Premium unlocks unlimited access, exports, and the full Mode suite."
  },
  {
    question: "Why does the Bloom Workstation have a dark, obsidian look?",
    answer: "We designed Bloom's workspace as an Inner Sanctum. This Luxury Obsidian theme is a deliberate choice to separate 'managing tasks' from 'architecting wealth.' It provides a high-focus, high-privacy environment where your data — accented in gold and emerald — takes center stage without distraction. The rest of CoinsBloom stays lighter and utility-focused; the Workstation is intentionally the room you go to for deep financial work."
  },
  {
    question: "What are the 'Specialized Tools' in Bloom's menu?",
    answer: "These are your Strategic Labs. While Bloom handles the reasoning and dialogue, these tools — like the Debt Execution Matrix, the What-If Simulator, and the Scenario Lab — provide the raw mathematical power to stress-test your plans. They are the heavy machinery Bloom uses to generate your actionable Blueprint Cards, which can then be saved to your Strategic Memory or exported as PDFs."
  },
  {
    question: "What is KidsBloom?",
    answer: "KidsBloom is our family finance feature for teaching kids about money. Parents can set up profiles for children, assign chores with rewards, manage allowances, and help kids set savings goals. Kids learn financial literacy through interactive games and lessons."
  },
  {
    question: "How do live streams work?",
    answer: "When a live stream is available, you'll see a '🔴 LIVE' indicator on your Dashboard in the Live & Learn section. Click to watch live financial education content from our team or guest experts. Featured videos are also available when no live stream is active."
  },
  {
    question: "What are Dashboard Highlights?",
    answer: "Dashboard Highlights are personalized announcements and tips that appear on your dashboard. They may include new feature announcements, financial tips, seasonal reminders, or partner offers. These help keep you informed and engaged with your financial journey."
  }
];

interface FAQsTabProps {
  searchQuery?: string;
}

export const FAQsTab = ({ searchQuery = "" }: FAQsTabProps) => {
  const { isFeatureEnabled } = useFeatureFlags();
  
  const filteredFaqs = faqs.filter(faq => {
    // Hide kids FAQ when kids feature is disabled
    if (faq.question.includes('KidsBloom') && !isFeatureEnabled('kids')) return false;
    
    return !searchQuery || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredWorkstation = workstationFaqs.filter(faq =>
    !searchQuery ||
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <Card className="bg-gradient-to-br from-primary/5 via-card to-accent/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/20">
              <HelpCircle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Frequently Asked Questions</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Quick answers to common questions
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Bloom Workstation — Luxury Obsidian section */}
      {filteredWorkstation.length > 0 && (
        <Card className="relative overflow-hidden border border-amber-400/20 bg-gradient-to-br from-[#0a0a0f] via-[#0f1014] to-[#0a0a0f] shadow-[0_8px_40px_-12px_rgba(201,168,76,0.25)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,168,76,0.08),transparent_60%)]" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20">
                <Sparkles className="w-5 h-5 text-amber-300" strokeWidth={1.75} />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight text-amber-100/95">
                  Using the Workstation
                </CardTitle>
                <p className="text-[13px] mt-0.5 text-amber-100/50">
                  Timeline, deferrals, source badges & Architect Mode
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative pt-0">
            <Accordion type="single" collapsible className="w-full">
              {filteredWorkstation.map((faq, index) => (
                <AccordionItem
                  key={`ws-${index}`}
                  value={`ws-item-${index}`}
                  className="border-amber-400/10"
                >
                  <AccordionTrigger className="text-left text-[15px] font-medium text-amber-50/90 hover:no-underline hover:text-amber-200">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-[13.5px] leading-relaxed text-amber-100/65">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Pro Tips — Blueprint Commands */}
      {filteredWorkstation.length > 0 && (
        <Card className="relative overflow-hidden border border-amber-400/20 bg-gradient-to-br from-[#0a0a0f] via-[#0f1014] to-[#0a0a0f] shadow-[0_8px_40px_-12px_rgba(201,168,76,0.2)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(201,168,76,0.06),transparent_60%)]" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20">
                <Terminal className="w-5 h-5 text-amber-300" strokeWidth={1.75} />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight text-amber-100/95">
                  Pro Tips — Blueprint Commands
                </CardTitle>
                <p className="text-[13px] mt-0.5 text-amber-100/50">
                  Copy-ready prompts that unlock Bloom's Architect posture
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative pt-0 space-y-3">
            {[
              {
                label: "Weekend Pulse",
                prompt: "Bloom, give me a 3-day weekend buffer check — what's my safety margin before Monday?",
              },
              {
                label: "Payday Bridge",
                prompt: "Show me the liquidity gap only until my May 7th deposit hits.",
              },
              {
                label: "Active Modeling",
                prompt: "Blueprint my next 14 days if I delay two bills and prioritize groceries + gas first.",
              },
            ].map((tip) => (
              <div
                key={tip.label}
                className="rounded-lg border border-amber-400/10 bg-amber-400/[0.03] p-3"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-300" />
                  <span className="text-[12px] uppercase tracking-[0.12em] font-semibold text-amber-300/90">
                    {tip.label}
                  </span>
                </div>
                <p className="text-[13.5px] leading-relaxed text-amber-50/80 font-mono">
                  "{tip.prompt}"
                </p>
              </div>
            ))}

            <div className="mt-4 pt-4 border-t border-amber-400/10">
              <p className="text-[13px] leading-relaxed italic text-amber-100/70">
                <span className="text-amber-300/90 font-medium not-italic">Remember: </span>
                Bloom is an Architect — don't just ask her what happened; ask her what we should build next.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FAQ Accordion */}
      <Card className="bg-card border-border/50">
        <CardContent className="pt-6">
          {filteredFaqs.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {filteredFaqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left text-base font-medium">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No FAQs match "{searchQuery}"</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card className="bg-muted/50 border-border/50">
        <CardContent className="py-6 text-center">
          <p className="text-muted-foreground mb-2">
            Can't find what you're looking for?
          </p>
          <a 
            href="mailto:support@coinsbloom.com" 
            className="text-primary font-medium hover:underline"
          >
            Contact our support team
          </a>
        </CardContent>
      </Card>
    </div>
  );
};
