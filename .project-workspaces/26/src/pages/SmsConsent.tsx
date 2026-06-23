import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Checkbox } from "@/components/ui/checkbox";

export default function SmsConsent() {
  const canonicalUrl = `${window.location.origin}/sms-consent`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>SMS Consent & Disclosure | CoinsBloom</title>
        <meta
          name="description"
          content="CoinsBloom SMS consent and disclosure: optional transaction alerts, message rates, STOP/HELP instructions, and privacy details."
        />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

      <Navbar />

      <main className="flex-grow container py-12 max-w-4xl">
        <header className="space-y-3 mb-8">
          <h1 className="text-4xl font-bold">SMS Consent & Disclosure</h1>
          <p className="text-muted-foreground">
            This page explains our optional SMS feature and shows the exact consent language used in the app.
          </p>
        </header>

        <section className="space-y-6">
          <article className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">How we collect SMS consent (separate from Terms)</h2>
            <p className="text-muted-foreground mb-4">
              SMS is optional. Users can use CoinsBloom without enabling SMS. Consent is collected via an
              explicit checkbox during phone setup.
            </p>

            <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/30">
              <Checkbox id="sms-consent-example" checked={false} disabled className="mt-0.5" />
              <label htmlFor="sms-consent-example" className="text-sm leading-relaxed">
                <strong>(Optional)</strong> I agree to receive SMS notifications from CoinsBloom about my
                account activity and transaction confirmations. Message and data rates may apply. Reply STOP
                to opt out at any time.
              </label>
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              This is a display-only example for review. In the app, users must actively check this box to
              enable SMS features.
            </p>
          </article>

          <article className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">SMS program details</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Message types:</strong> Transaction confirmation and account-related notifications.
                We do not send marketing messages.
              </li>
              <li>
                <strong>Frequency:</strong> Message frequency varies and is primarily user-initiated (e.g.,
                confirmations when you send a transaction).
              </li>
              <li>
                <strong>Opt-out:</strong> Reply <strong>STOP</strong> to opt out at any time.
              </li>
              <li>
                <strong>Help:</strong> Reply <strong>HELP</strong> for assistance.
              </li>
              <li>
                <strong>Costs:</strong> Message and data rates may apply.
              </li>
            </ul>

            <p className="text-sm text-muted-foreground mt-4">
              Legal: see our <a className="underline text-primary" href="/privacy">Privacy Policy</a> and
              <span>{" "}</span>
              <a className="underline text-primary" href="/terms">Terms of Service</a>.
            </p>
          </article>
        </section>
      </main>

      <Footer />
    </div>
  );
}
