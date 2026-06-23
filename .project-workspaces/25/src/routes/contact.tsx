import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — SanctumIQ" },
      {
        name: "description",
        content: "Reach Into Innovations, LLC — the team behind SanctumIQ. We respond personally.",
      },
      { property: "og:title", content: "Contact — SanctumIQ" },
      {
        property: "og:description",
        content: "Reach the team behind SanctumIQ.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="min-h-screen bg-obsidian text-foreground">
      <header
        className="hairline-b bg-obsidian/85 backdrop-blur-md rounded-b-2xl overflow-hidden"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/sanctum-seal.svg"
              alt=""
              aria-hidden="true"
              className="h-6 w-6 opacity-90"
              style={{ filter: "drop-shadow(0 0 4px rgba(201,168,76,0.25))" }}
            />
            <span className="font-display text-2xl tracking-wide text-gold-soft">
              Sanctum<span className="text-gold">IQ</span>
            </span>
          </Link>
          <Link
            to="/"
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-gold-soft transition-colors"
          >
            ← Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-20 md:py-28 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold mb-4">A Quiet Door</p>
        <h1 className="font-display text-4xl md:text-5xl text-foreground mb-6">Contact</h1>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-10">
          SanctumIQ is built and stewarded by{" "}
          <span className="text-gold-soft">Into Innovations, LLC</span> in Georgia, USA. We read
          every message personally.
        </p>

        <a
          href="mailto:connect@jochanae.com"
          className="inline-flex items-center gap-3 rounded-md border border-gold/40 bg-obsidian/40 px-6 py-4 text-base text-gold-soft hover:bg-gold/10 transition-colors"
        >
          <Mail className="h-5 w-5" strokeWidth={1.5} />
          connect@jochanae.com
        </a>

        <div className="mt-16 hairline-t pt-10 text-sm text-muted-foreground space-y-2">
          <p className="font-display text-lg text-foreground">Into Innovations, LLC</p>
          <p>State of Georgia, United States</p>
        </div>

        <div className="mt-12 flex items-center justify-center gap-6 text-xs uppercase tracking-[0.2em]">
          <Link
            to="/privacy"
            className="text-muted-foreground hover:text-gold-soft transition-colors"
          >
            Privacy
          </Link>
          <span className="text-foreground/15">·</span>
          <Link
            to="/terms"
            className="text-muted-foreground hover:text-gold-soft transition-colors"
          >
            Terms
          </Link>
        </div>
      </main>
    </div>
  );
}
