// Terms of Service — template scaffolded for SanctumIQ.
// IMPORTANT: Template only. Have legal counsel review before production use.
// Last updated: 2026-04-20

import { createFileRoute } from "@tanstack/react-router";
import { LegalShell, Section } from "./privacy";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — SanctumIQ" },
      {
        name: "description",
        content: "The terms governing your use of SanctumIQ, operated by Into Innovations, LLC.",
      },
      { property: "og:title", content: "Terms of Service — SanctumIQ" },
      {
        property: "og:description",
        content: "Terms governing your use of SanctumIQ.",
      },
    ],
  }),
  component: TermsPage,
});

const LAST_UPDATED = "April 20, 2026";

function TermsPage() {
  return (
    <LegalShell title="Terms of Service" eyebrow="The Agreement" updated={LAST_UPDATED}>
      <Section title="1. Who We Are">
        <p>
          SanctumIQ ("the Service," "the App") is owned and operated by{" "}
          <strong className="text-gold-soft">Into Innovations, LLC</strong>, a limited liability
          company registered in the State of Georgia, United States. By creating an account or using
          the Service, you agree to these Terms of Service ("Terms").
        </p>
      </Section>

      <Section title="2. Acceptance of Terms">
        <p>
          By accessing or using SanctumIQ, you confirm that you are at least 13 years old and that
          you accept these Terms and our Privacy Policy. If you do not agree, do not use the
          Service.
        </p>
      </Section>

      <Section title="3. Your Account">
        <ul>
          <li>You are responsible for maintaining the confidentiality of your login.</li>
          <li>You agree to provide accurate information when creating your account.</li>
          <li>You are responsible for all activity that occurs under your account.</li>
        </ul>
      </Section>

      <Section title="4. Acceptable Use">
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful purpose.</li>
          <li>Attempt to access another user's account or private content.</li>
          <li>Reverse-engineer, scrape, or attempt to disrupt the Service.</li>
          <li>Upload material that infringes third-party intellectual property.</li>
        </ul>
      </Section>

      <Section title="5. Your Content">
        <p>
          You retain full ownership of the notes, bookmarks, and finance entries you create in
          SanctumIQ. We claim no rights over your private content and do not use it to train AI
          models. We are granted only the limited technical license necessary to store and display
          your content back to you on the devices where you sign in.
        </p>
      </Section>

      <Section title="6. Steward Ledger Disclaimer">
        <p>
          The Steward Ledger is a private record-keeping tool. It is <strong>not</strong> a
          substitute for accounting software, professional tax advice, or financial planning. You
          are solely responsible for the accuracy of any entries and for compliance with applicable
          tax laws.
        </p>
      </Section>

      <Section title="7. Selah and AI Features">
        <p>
          Reflection prompts, semantic search, and other AI-assisted features are provided as
          conveniences, not as authoritative theological, pastoral, medical, legal, or financial
          advice. Outputs may contain errors. You are responsible for evaluating any AI-generated
          content before relying on it.
        </p>
      </Section>

      <Section title="8. Ministry Partner Subscriptions">
        <p>
          Certain features require a paid Ministry Partner subscription. Subscriptions renew
          automatically at the interval you selected unless cancelled. You may cancel at any time
          through your account; cancellation takes effect at the end of the current billing period
          and is not pro-rated.
        </p>
      </Section>

      <Section title="9. Service Availability">
        <p>
          We aim for high availability but do not guarantee uninterrupted service. We may modify,
          suspend, or discontinue features at any time. We will give reasonable notice before
          discontinuing a paid feature.
        </p>
      </Section>

      <Section title="10. Termination">
        <p>
          You may delete your account and all associated data at any time. We may suspend or
          terminate accounts that violate these Terms. Sections that by their nature should survive
          termination (ownership, disclaimers, limitation of liability, governing law) will survive.
        </p>
      </Section>

      <Section title="11. Disclaimers">
        <p>
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS
          OR IMPLIED, INCLUDING WITHOUT LIMITATION WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
          PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>
      </Section>

      <Section title="12. Limitation of Liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, INTO INNOVATIONS, LLC SHALL NOT BE LIABLE FOR ANY
          INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA,
          PROFITS, OR REVENUE, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
        </p>
      </Section>

      <Section title="13. Governing Law">
        <p>
          These Terms are governed by the laws of the State of Georgia, United States, without
          regard to its conflict-of-laws principles. Any dispute arising under these Terms shall be
          resolved in the state or federal courts located in Georgia, and you consent to personal
          jurisdiction there.
        </p>
      </Section>

      <Section title="14. Changes to These Terms">
        <p>
          We may update these Terms from time to time. Material changes will be reflected by
          updating the "Last updated" date. Continued use of SanctumIQ after changes constitutes
          acceptance of the updated Terms.
        </p>
      </Section>

      <Section title="15. Contact">
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

      <p className="text-xs text-muted-foreground/60 italic pt-8 border-t border-foreground/5">
        This document is a template scaffold and not legal advice. Please review with qualified
        counsel before relying on it in production.
      </p>
    </LegalShell>
  );
}
