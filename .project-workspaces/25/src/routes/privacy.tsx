// Privacy Policy — template scaffolded for SanctumIQ.
// IMPORTANT: This is a starting template, not legal advice. Have it reviewed
// by counsel before relying on it for an app store submission or production launch.
// Last updated: 2026-04-20

import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useCallback } from "react";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — SanctumIQ" },
      {
        name: "description",
        content:
          "How SanctumIQ handles your data. We do not sell, share, or analyze your private study, notes, or finance entries.",
      },
      { property: "og:title", content: "Privacy Policy — SanctumIQ" },
      {
        property: "og:description",
        content:
          "How SanctumIQ handles your data. Quiet by design — no ads, no tracking, no analysis of private content.",
      },
    ],
  }),
  component: PrivacyPage,
});

const LAST_UPDATED = "April 20, 2026";

function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" eyebrow="Quiet by Design" updated={LAST_UPDATED}>
      <Section title="Our Promise">
        <p>
          SanctumIQ is built as a sanctuary. Your scripture reading, notes, bookmarks, and finance
          entries belong to you. We do not sell your data, share it with advertisers, or use the
          contents of your private study to train AI models.
        </p>
      </Section>

      <Section title="Who We Are">
        <p>
          SanctumIQ is owned and operated by{" "}
          <strong className="text-gold-soft">Into Innovations, LLC</strong> ("we," "us," "our"), a
          company registered in the State of Georgia, United States. For privacy questions, contact{" "}
          <a
            href="mailto:connect@jochanae.com"
            className="text-gold-soft underline underline-offset-4"
          >
            connect@jochanae.com
          </a>
          .
        </p>
      </Section>

      <Section title="What We Collect">
        <ul>
          <li>
            <strong>Account information:</strong> email address and an optional display name, used
            only to authenticate you and personalize the interface.
          </li>
          <li>
            <strong>Your private content:</strong> notes, bookmarks, and finance entries you choose
            to save. Stored encrypted-at-rest in your private account.
          </li>
          <li>
            <strong>Minimal technical data:</strong> standard server logs (IP address, timestamp)
            retained briefly for security and abuse prevention.
          </li>
        </ul>
      </Section>

      <Section title="What We Do Not Do">
        <ul>
          <li>We do not run third-party advertising or ad-tracking pixels.</li>
          <li>We do not sell, rent, or share your personal data with marketers.</li>
          <li>We do not read, analyze, or train AI models on your private notes.</li>
          <li>We do not connect to your bank, brokerage, or any financial institution.</li>
        </ul>
      </Section>

      <Section title="Sanctuary Zones">
        <p>
          Certain areas of SanctumIQ are designated{" "}
          <em className="text-gold-soft">Sanctuary Zones</em>: the Bible Reader, Notes, and the
          Steward Ledger. Content you create in these zones is treated as private journal material.
          It is stored only so that you can retrieve it on your own devices, and is never used to
          inform features, recommendations, or third parties.
        </p>
      </Section>

      <Section title="Steward Ledger (Finance Entries)">
        <p>
          The Steward Ledger lets you privately record contributions such as tithes, offerings, and
          dues. These entries are stored encrypted-at-rest, are visible only to you, are never read
          by us, are never used for AI training, and are never shared with anyone.
        </p>
      </Section>

      <Section title="Selah (Reflection Companion)">
        <p>
          Selah is the in-app reflection companion. When you choose to send text to Selah, that text
          is sent to a third-party AI provider for the sole purpose of generating your response, and
          is not retained by us beyond the immediate request. We do not feed your saved notes or
          finance entries to Selah unless you explicitly choose to include them in a prompt.
        </p>
      </Section>

      <Section title="How We Store Your Data">
        <p>
          Data is stored on secure cloud infrastructure with encryption in transit (TLS) and at
          rest. Access is restricted to your authenticated account.
        </p>
      </Section>

      <Section title="Your Rights">
        <ul>
          <li>You may request a copy of your data at any time.</li>
          <li>You may delete your account and all associated data at any time.</li>
          <li>
            You may contact us at{" "}
            <a
              href="mailto:connect@jochanae.com"
              className="text-gold-soft underline underline-offset-4"
            >
              connect@jochanae.com
            </a>{" "}
            for any privacy-related request.
          </li>
        </ul>
      </Section>

      <Section title="Children">
        <p>
          SanctumIQ is not directed to children under 13. We do not knowingly collect personal
          information from children under 13. If you believe a child has provided us with personal
          information, please contact us so we can remove it.
        </p>
      </Section>

      <Section title="Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes will be reflected by
          updating the "Last updated" date above. Continued use of SanctumIQ after changes
          constitutes acceptance of the updated policy.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Into Innovations, LLC
          <br />
          Georgia, United States
          <br />
          <a
            href="mailto:connect@jochanae.com"
            className="text-gold-soft underline underline-offset-4"
          >
            connect@jochanae.com
          </a>
        </p>
      </Section>

      <FooterNote />
    </LegalShell>
  );
}

/* ───────── Shared legal-page primitives (kept local to legal routes) ───────── */

export function LegalShell({
  title,
  eyebrow,
  updated,
  children,
}: {
  title: string;
  eyebrow: string;
  updated: string;
  children: React.ReactNode;
}) {
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
          <SmartBackLink />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <p className="text-xs uppercase tracking-[0.3em] text-gold mb-4">{eyebrow}</p>
        <h1 className="font-display text-4xl md:text-5xl text-foreground mb-3">{title}</h1>
        <p className="text-sm text-muted-foreground/80 mb-12">Last updated: {updated}</p>
        <div className="space-y-10">{children}</div>
      </main>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl md:text-2xl text-gold-soft mb-3">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground [&_strong]:text-foreground [&_ul]:list-none [&_ul]:space-y-2 [&_li]:pl-4 [&_li]:relative [&_li]:before:content-['·'] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:text-gold/60">
        {children}
      </div>
    </section>
  );
}

function FooterNote() {
  return (
    <p className="text-xs text-muted-foreground/60 italic pt-8 border-t border-foreground/5">
      This document is a template scaffold and not legal advice. Please review with qualified
      counsel before relying on it in production.
    </p>
  );
}

export function SmartBackLink() {
  const navigate = useNavigate();
  const router = useRouter();
  const onClick = useCallback(() => {
    const canGoBack =
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      document.referrer !== "" &&
      !document.referrer.includes(window.location.pathname);
    if (canGoBack) router.history.back();
    else navigate({ to: "/" });
  }, [navigate, router]);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Go back"
      className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-gold-soft transition-colors"
    >
      <ChevronLeft className="h-4 w-4" />
      Back
    </button>
  );
}
