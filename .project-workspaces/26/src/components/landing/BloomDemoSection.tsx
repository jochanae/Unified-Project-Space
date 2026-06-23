import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";

const DEMO_CONVERSATIONS = [
  {
    topic: "Budgeting",
    question: "I make $4,200/month but I can never seem to save. Where does my money go?",
    answer:
      "Great question! Let's break it down. Based on the 50/30/20 rule, here's a starting framework:\n\n• **Needs (50%):** $2,100 — rent, utilities, groceries, insurance\n• **Wants (30%):** $1,260 — dining out, subscriptions, entertainment\n• **Savings (20%):** $840 — emergency fund, goals, investments\n\nStart by tracking every expense for 2 weeks. Most people find $200–$400 in 'invisible spending' — small purchases that add up. I can help you set up a budget right now!",
  },
  {
    topic: "Saving",
    question: "I want to save $5,000 for a vacation in 8 months. Is that realistic?",
    answer:
      "Absolutely! Here's the math:\n\n**$5,000 ÷ 8 months = $625/month**\n\nThat's about $144/week. Here are 3 ways to get there:\n\n1. **Automate it** — Set up a weekly $144 transfer to a dedicated savings goal\n2. **Cut one thing** — Cancel unused subscriptions (avg person wastes $30–$50/mo)\n3. **Boost income** — Even $100/mo extra from a side gig closes the gap\n\nWant me to create a savings goal so you can track your progress with a visual countdown?",
  },
  {
    topic: "Debt",
    question: "I have 3 credit cards totaling $8,500. What's the fastest way to pay them off?",
    answer:
      "Let's use the **Avalanche Method** — it saves you the most in interest:\n\n1. List your cards by interest rate (highest first)\n2. Pay minimums on all cards\n3. Put every extra dollar toward the highest-rate card\n\nIf you can put $400/month toward debt, you could be debt-free in about **24 months** and save ~$1,200 in interest vs. minimums only.\n\nI can set up a Debt Payoff Plan in your dashboard and track every payment automatically!",
  },
  {
    topic: "Kids & Money",
    question: "My 10-year-old wants to learn about saving. Any tips?",
    answer:
      "Love this! Here's what works at that age:\n\n🎯 **The 3-Jar System:** Split allowance into Save, Spend, and Share\n📊 **Visual goals:** Let them pick something they want and track progress\n🎮 **Make it fun:** KidsBloom mode turns saving into a game with stars and streaks\n\nKids who learn money habits before age 12 are **3x more likely** to be financially confident adults. Want me to set up a KidsBloom profile for them?",
  },
  {
    topic: "Smart Import",
    question: "I just attached a screenshot of my bills. Can you pull the data from it?",
    answer:
      "Absolutely! I've scanned your screenshot and here's what I found:\n\n📄 **3 bills detected:**\n• Electric — $142.50, due Feb 28\n• Internet — $79.99, due Mar 1\n• Car Insurance — $215.00, due Mar 5\n\nI've pre-filled everything for you. Just confirm and they'll be added to your Bills tracker instantly.\n\n💡 **Pro tip:** You can also attach bank statements, receipts, or liability documents — I'll extract and organize all the data automatically. I also noticed your savings goals are on track — great progress! 🎉",
  },
];

function TypewriterText({ text, onComplete }: { text: string; onComplete?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed("");
    indexRef.current = 0;
    const interval = setInterval(() => {
      indexRef.current++;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 12);
    return () => clearInterval(interval);
  }, [text, onComplete]);

  return <span>{displayed}</span>;
}

/**
 * Parse Bloom's answer into Blueprint Card structure:
 *  - intro: leading paragraph(s) before the first list/heading → callout
 *  - sections: groups of bullets / numbered items, optionally led by a **bold heading**
 *  - outro: trailing paragraph(s) after the last list
 */
type BlueprintSection = { heading?: string; items: string[]; ordered: boolean };

function parseBlueprint(text: string): {
  callout: string;
  sections: BlueprintSection[];
  outro: string;
} {
  const lines = text.split("\n").map((l) => l.trim());
  const sections: BlueprintSection[] = [];
  const calloutLines: string[] = [];
  const outroLines: string[] = [];
  let current: BlueprintSection | null = null;
  let sawList = false;

  const isBullet = (l: string) => /^[•\-*]\s+/.test(l);
  const isNumbered = (l: string) => /^\d+\.\s+/.test(l);
  const stripBullet = (l: string) => l.replace(/^[•\-*]\s+/, "").replace(/^\d+\.\s+/, "");
  // A line is a section heading if it's bold-wrapped (**Heading:** or **Heading**)
  const headingMatch = (l: string) => {
    const m = l.match(/^\*\*(.+?)\*\*:?\s*$/);
    return m ? m[1] : null;
  };

  for (const raw of lines) {
    if (!raw) {
      if (current) {
        sections.push(current);
        current = null;
      }
      continue;
    }

    const heading = headingMatch(raw);
    if (heading && !isBullet(raw) && !isNumbered(raw)) {
      if (current) sections.push(current);
      current = { heading, items: [], ordered: false };
      sawList = true;
      continue;
    }

    if (isBullet(raw) || isNumbered(raw)) {
      if (!current) current = { heading: undefined, items: [], ordered: isNumbered(raw) };
      current.ordered = current.ordered || isNumbered(raw);
      current.items.push(stripBullet(raw));
      sawList = true;
      continue;
    }

    // Plain prose
    if (!sawList) {
      calloutLines.push(raw);
    } else {
      // Belongs to current section if it has items, otherwise outro
      if (current && current.items.length > 0) {
        current.items.push(raw);
      } else {
        outroLines.push(raw);
      }
    }
  }
  if (current) sections.push(current);

  return {
    callout: calloutLines.join(" ").trim(),
    sections,
    outro: outroLines.join(" ").trim(),
  };
}

/** Render inline **bold** within a string */
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    const m = p.match(/^\*\*(.+)\*\*$/);
    if (m) {
      return (
        <strong key={i} className="font-semibold" style={{ color: "hsl(40 65% 78%)" }}>
          {m[1]}
        </strong>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

function BlueprintCard({ text, topic }: { text: string; topic: string }) {
  const parsed = parseBlueprint(text);
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, hsl(160 22% 9% / 0.96) 0%, hsl(160 24% 7% / 0.96) 100%)",
        border: "1px solid hsl(158 35% 28% / 0.55)",
        boxShadow:
          "0 8px 28px -10px hsl(158 80% 4% / 0.6), inset 0 1px 0 hsl(40 55% 68% / 0.08)",
      }}
    >
      {/* Card header strip */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{
          borderBottom: "1px solid hsl(158 30% 22% / 0.5)",
          background:
            "linear-gradient(180deg, hsl(160 24% 11% / 0.9), hsl(160 22% 8% / 0.6))",
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-semibold tracking-[0.14em] uppercase"
            style={{ color: "hsl(40 55% 72%)" }}
          >
            Blueprint
          </span>
          <span className="text-[10px]" style={{ color: "hsl(150 10% 55%)" }}>
            ·
          </span>
          <span
            className="text-[10px] font-medium tracking-wide uppercase"
            style={{ color: "hsl(150 18% 78%)" }}
          >
            {topic}
          </span>
        </div>
        <span
          className="text-[10px] font-medium"
          style={{ color: "hsl(158 60% 60%)" }}
        >
          Bloom
        </span>
      </div>

      <div className="px-4 py-4 space-y-3.5 text-[13px] leading-relaxed text-[hsl(150,18%,90%)]">
        {parsed.callout && (
          <p className="text-[13.5px] text-[hsl(150,20%,94%)]">
            {renderInline(parsed.callout)}
          </p>
        )}

        {parsed.sections.map((s, idx) => (
          <div key={idx} className="space-y-1.5">
            {s.heading && (
              <div
                className="text-[10px] font-semibold tracking-[0.12em] uppercase"
                style={{ color: "hsl(40 55% 72%)" }}
              >
                {s.heading}
              </div>
            )}
            <ul className="space-y-1">
              {s.items.map((item, i) => (
                <li key={i} className="flex gap-2.5">
                  <span
                    className="flex-shrink-0 mt-[7px] inline-block"
                    style={
                      s.ordered
                        ? {
                            minWidth: "1.25rem",
                            marginTop: 0,
                            color: "hsl(158 65% 60%)",
                            fontWeight: 600,
                            fontSize: "12px",
                          }
                        : {
                            width: 4,
                            height: 4,
                            borderRadius: 9999,
                            background: "hsl(158 70% 50%)",
                            boxShadow: "0 0 6px hsl(158 70% 50% / 0.6)",
                          }
                    }
                  >
                    {s.ordered ? `${i + 1}.` : null}
                  </span>
                  <span>{renderInline(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {parsed.outro && <p>{renderInline(parsed.outro)}</p>}
      </div>
    </div>
  );
}

export const BloomDemoSection = () => {
  const [activeTopic, setActiveTopic] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "typing-q" | "thinking" | "typing-a" | "done">("idle");

  const startDemo = (idx: number) => {
    setActiveTopic(idx);
    setPhase("typing-q");
    trackEvent("demo_topic_selected", { topic: DEMO_CONVERSATIONS[idx]?.topic });
  };

  const handleQuestionDone = () => {
    setPhase("thinking");
    setTimeout(() => setPhase("typing-a"), 1200);
  };

  const handleAnswerDone = () => setPhase("done");

  const resetDemo = () => {
    setActiveTopic(null);
    setPhase("idle");
  };

  const conv = activeTopic !== null ? DEMO_CONVERSATIONS[activeTopic] : null;

  return (
    <section className="quinn-obsidian relative py-20 md:py-28 overflow-hidden">
      {/* Obsidian ambient backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 20% 10%, hsl(158 60% 18% / 0.35) 0%, transparent 55%), radial-gradient(ellipse at 80% 90%, hsl(40 55% 50% / 0.18) 0%, transparent 55%), linear-gradient(180deg, hsl(160 22% 5%) 0%, hsl(160 24% 3%) 100%)",
        }}
      />
      {/* Subtle grain */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.05] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(hsl(40 55% 80%) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}
      />

      <div className="container mx-auto px-4 max-w-3xl relative">
        {/* Bloom Persona Intro */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div
            className="mx-auto mb-5 w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, hsl(158 70% 42%) 0%, hsl(165 75% 38%) 100%)",
              boxShadow:
                "0 0 32px -4px hsl(158 70% 48% / 0.55), inset 0 1px 0 hsl(40 55% 68% / 0.25)",
            }}
          >
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-[hsl(150,25%,98%)]">
            Meet{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, hsl(158 70% 55%) 0%, hsl(40 65% 72%) 100%)",
              }}
            >
              Bloom
            </span>
          </h2>
          <p className="max-w-md mx-auto text-base leading-relaxed mb-4 text-[hsl(150,12%,78%)]">
            Your Financial Architect. Bloom doesn't just answer questions — it builds a living financial intelligence layer around your goals, debts, and decisions, then engineers the next move with you.
          </p>
          <p className="text-sm italic mb-4 text-[hsl(150,8%,62%)]">
            Think it through with Bloom. Turn insights into a{" "}
            <span
              className="font-semibold not-italic"
              style={{ color: "hsl(40 65% 72%)" }}
            >
              Living Money Plan
            </span>
            .
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs font-medium">
            {[
              "Budget Coaching",
              "Debt Strategy",
              "Smart Bill Import",
              "Kids & Family",
            ].map((label) => (
              <span
                key={label}
                className="px-3 py-1.5 rounded-full backdrop-blur-md"
                style={{
                  background: "hsl(160 24% 10% / 0.7)",
                  border: "1px solid hsl(158 40% 42% / 0.35)",
                  color: "hsl(40 55% 80%)",
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Demo Header */}
        <div className="text-center mb-8">
          <p className="text-sm font-medium text-[hsl(150,12%,72%)]">
            <Sparkles
              className="w-3.5 h-3.5 inline mr-1"
              style={{ color: "hsl(158 70% 55%)" }}
            />
            See Bloom in action — pick a topic below
          </p>
        </div>

        {/* Topic pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {DEMO_CONVERSATIONS.map((c, i) => {
            const isActive = activeTopic === i;
            return (
              <button
                key={c.topic}
                onClick={() => startDemo(i)}
                disabled={phase !== "idle" && phase !== "done"}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all backdrop-blur-md disabled:opacity-50"
                style={
                  isActive
                    ? {
                        background:
                          "linear-gradient(135deg, hsl(158 70% 42%) 0%, hsl(165 75% 38%) 100%)",
                        color: "hsl(160 30% 6%)",
                        border: "1px solid hsl(158 70% 55% / 0.6)",
                        boxShadow:
                          "0 0 20px -4px hsl(158 70% 48% / 0.55)",
                      }
                    : {
                        background: "hsl(160 24% 10% / 0.7)",
                        border: "1px solid hsl(158 40% 42% / 0.32)",
                        color: "hsl(150 20% 92%)",
                      }
                }
              >
                {c.topic}
              </button>
            );
          })}
        </div>

        {/* Chat window — Obsidian glass with gold→emerald hairline border */}
        <div
          className="rounded-[18px] p-[1px]"
          style={{
            background:
              "linear-gradient(135deg, hsl(40 65% 72% / 0.85) 0%, hsl(40 55% 60% / 0.4) 22%, hsl(158 50% 35% / 0.35) 55%, hsl(158 70% 50% / 0.85) 100%)",
            boxShadow:
              "0 28px 70px -22px hsl(158 80% 4% / 0.75), 0 0 0 1px hsl(160 22% 5% / 0.4)",
          }}
        >
          <div
            className="rounded-[17px] overflow-hidden min-h-[320px] backdrop-blur-2xl"
            style={{
              background:
                "linear-gradient(180deg, hsl(160 24% 7% / 0.92) 0%, hsl(160 22% 5% / 0.94) 100%)",
              boxShadow:
                "inset 0 1px 0 hsl(40 55% 68% / 0.1), inset 0 -1px 0 hsl(158 70% 50% / 0.06)",
            }}
          >
          {/* Chat header */}
          <div
            className="flex items-center gap-3 px-5 py-3"
            style={{
              borderBottom: "1px solid hsl(158 30% 18% / 0.6)",
              background:
                "linear-gradient(180deg, hsl(160 22% 9% / 0.9), hsl(160 22% 7% / 0.6))",
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, hsl(158 70% 42%) 0%, hsl(165 75% 38%) 100%)",
                boxShadow: "0 0 16px -2px hsl(158 70% 48% / 0.5)",
              }}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[hsl(150,20%,96%)]">
                Bloom
              </p>
              <p className="text-xs" style={{ color: "hsl(40 55% 72%)" }}>
                Financial Architect
              </p>
            </div>
            <span
              className="ml-auto flex items-center gap-1.5 text-xs"
              style={{ color: "hsl(158 70% 60%)" }}
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{
                  background: "hsl(158 70% 55%)",
                  boxShadow: "0 0 8px hsl(158 70% 55%)",
                }}
              />
              Online
            </span>
          </div>

          {/* Chat body */}
          <div className="p-5 space-y-4 min-h-[250px]">
            <AnimatePresence mode="wait">
              {phase === "idle" && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-[250px] text-center"
                >
                  <Sparkles
                    className="w-12 h-12 mb-3"
                    style={{ color: "hsl(158 70% 48% / 0.45)" }}
                  />
                  <p className="text-sm text-[hsl(150,10%,68%)]">
                    Tap a topic above to start the demo
                  </p>
                </motion.div>
              )}

              {conv && phase !== "idle" && (
                <motion.div
                  key={activeTopic}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* User message */}
                  <div className="flex gap-3 justify-end">
                    <div
                      className="rounded-2xl rounded-br-md px-4 py-3 max-w-[85%] text-sm"
                      style={{
                        background:
                          "linear-gradient(135deg, hsl(158 70% 42%) 0%, hsl(165 75% 38%) 100%)",
                        color: "hsl(160 30% 6%)",
                        boxShadow:
                          "0 4px 16px -4px hsl(158 70% 48% / 0.45)",
                      }}
                    >
                      {phase === "typing-q" ? (
                        <TypewriterText text={conv.question} onComplete={handleQuestionDone} />
                      ) : (
                        conv.question
                      )}
                    </div>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                      style={{
                        background: "hsl(160 18% 14%)",
                        border: "1px solid hsl(158 30% 22%)",
                      }}
                    >
                      <User className="w-3.5 h-3.5" style={{ color: "hsl(40 40% 70%)" }} />
                    </div>
                  </div>

                  {/* Thinking dots */}
                  {phase === "thinking" && (
                    <div className="flex gap-3">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background:
                            "linear-gradient(135deg, hsl(158 70% 42%) 0%, hsl(165 75% 38%) 100%)",
                        }}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div
                        className="rounded-2xl rounded-bl-md px-4 py-3"
                        style={{
                          background: "hsl(160 18% 12% / 0.9)",
                          border: "1px solid hsl(158 30% 20% / 0.6)",
                        }}
                      >
                        <div className="flex gap-1">
                          <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:0ms]" style={{ background: "hsl(158 60% 55% / 0.7)" }} />
                          <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:150ms]" style={{ background: "hsl(158 60% 55% / 0.7)" }} />
                          <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:300ms]" style={{ background: "hsl(158 60% 55% / 0.7)" }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI response — typewriter while streaming, Blueprint Card when done */}
                  {(phase === "typing-a" || phase === "done") && (
                    <div className="flex gap-3">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                        style={{
                          background:
                            "linear-gradient(135deg, hsl(158 70% 42%) 0%, hsl(165 75% 38%) 100%)",
                          boxShadow: "0 0 12px -2px hsl(158 70% 48% / 0.5)",
                        }}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0 max-w-[92%]">
                        {phase === "typing-a" ? (
                          <div
                            className="rounded-2xl rounded-bl-md px-4 py-3 text-sm whitespace-pre-line text-[hsl(150,18%,92%)]"
                            style={{
                              background: "hsl(160 18% 12% / 0.9)",
                              border: "1px solid hsl(158 30% 20% / 0.6)",
                            }}
                          >
                            <TypewriterText text={conv.answer} onComplete={handleAnswerDone} />
                          </div>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.99 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.35, ease: "easeOut" }}
                          >
                            <BlueprintCard text={conv.answer} topic={conv.topic} />
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CTA after done */}
                  {phase === "done" && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex flex-col sm:flex-row items-center gap-3 pt-4 justify-center"
                    >
                      <Button
                        asChild
                        size="lg"
                        className="border-0"
                        style={{
                          background:
                            "linear-gradient(135deg, hsl(158 70% 42%) 0%, hsl(165 75% 38%) 100%)",
                          color: "hsl(160 30% 6%)",
                          boxShadow:
                            "0 8px 24px -6px hsl(158 70% 48% / 0.55)",
                        }}
                      >
                        <Link to="/auth?mode=signup" onClick={() => trackEvent("demo_cta_signup", { topic: conv?.topic })}>
                          Try Bloom Free <ArrowRight className="ml-2 w-4 h-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetDemo}
                        className="hover:bg-transparent"
                        style={{ color: "hsl(40 55% 75%)" }}
                      >
                        Try another topic
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
};
