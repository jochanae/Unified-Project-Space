import { BookOpen, Heart, ShieldCheck } from "lucide-react";

const PROMISES = [
  {
    icon: ShieldCheck,
    title: "No ads. Ever.",
    body: "SanctumIQ will never carry advertising. The Word deserves better than that.",
  },
  {
    icon: Heart,
    title: "Free stays free.",
    body: "The Sanctuary tier is permanently free. Ministry Partners fund access for everyone else.",
  },
  {
    icon: BookOpen,
    title: "Your data is yours.",
    body: "Notes, highlights, and ledger entries belong to you. We never sell or share them.",
  },
];

export function SanctuaryStats() {
  return (
    <section className="hairline-t">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="text-center mb-14">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-3">The commitment</p>
          <h2 className="font-display text-3xl md:text-4xl text-foreground">
            Built on trust, not traffic.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PROMISES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="hairline rounded-xl bg-obsidian-elevated/30 p-7 flex flex-col gap-4"
            >
              <div
                className="h-10 w-10 rounded-lg border border-gold/20 flex items-center justify-center"
                style={{ background: "oklch(0.74 0.115 85 / 0.08)" }}
              >
                <Icon className="h-5 w-5 text-gold" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-xl text-gold-soft">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
