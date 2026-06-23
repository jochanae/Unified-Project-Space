import { useNavigate } from 'react-router-dom';
import { LogoCapsule } from '@/components/shared/LogoCapsule';
import { AppFooter } from '@/components/shared/AppFooter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav
        className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-border/20"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 1rem)' }}
      >
        <LogoCapsule size="sm" onClick={() => navigate('/')} className="bg-transparent border-0 shadow-none px-0 py-0 hover:shadow-none" />
        <Button variant="ghost" size="sm" onClick={() => navigate(-1 as any)} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </nav>

      <article className="max-w-2xl mx-auto px-5 sm:px-8 py-10 sm:py-16 prose-styles">
        <h1 className="text-2xl sm:text-3xl font-serif mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: April 14, 2026</p>

        <section className="space-y-6 text-sm leading-relaxed text-foreground/90">
          <div>
            <h2 className="text-lg font-semibold mb-2">Agreement to Terms</h2>
            <p>By accessing or using IntoIQ, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the platform. IntoIQ is operated by <strong>Into Innovations</strong>.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Eligibility</h2>
            <p>You must be at least 18 years old to use IntoIQ. By using the platform, you represent and warrant that you meet this age requirement.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Account Security</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You are responsible for all activity that occurs under your account. Notify us immediately at <a href="mailto:support@intoiq.app" className="text-primary hover:underline">support@intoiq.app</a> if you suspect unauthorized access.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Subscription & Billing</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Subscription billing is handled through <strong>Stripe</strong>.</li>
              <li>Subscriptions are <strong>recurring</strong> and will automatically renew until cancelled.</li>
              <li>You can cancel your subscription at any time through the billing management portal.</li>
              <li>Refunds are handled on a case-by-case basis. Contact support for refund requests.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Your Content</h2>
            <p>You retain ownership of all content you create in IntoIQ, including funnels, landing pages, copy, strategies, brand identity data (vibe descriptions, palettes, typography), Signal Lab outputs, and uploaded assets. Into Innovations does not claim ownership of your content.</p>
            <p className="mt-2">You grant Into Innovations a limited license to host, display, and transmit your content solely to provide the service. This includes processing your brand identity inputs through AI services to generate style recommendations and visual direction.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Platform Ownership</h2>
            <p>Into Innovations owns the IntoIQ platform, including its design, code, AI features (MarQ, Signal Lab, Style Signal, Build Stream), branding, and all intellectual property associated with the service. You may not copy, modify, or redistribute the platform itself.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Acceptable Use</h2>
            <p>You agree <strong>not</strong> to use IntoIQ to:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Send spam, unsolicited messages, or phishing content.</li>
              <li>Create or distribute illegal, harmful, or fraudulent content.</li>
              <li>Harass, threaten, or harm other users or third parties.</li>
              <li>Attempt to gain unauthorized access to the platform or other users' data.</li>
              <li>Use the platform in any way that violates applicable laws or regulations.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Account Termination</h2>
            <p>We reserve the right to suspend or terminate accounts that violate these terms, at our sole discretion. You may delete your account at any time from the Settings page.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Disclaimer of Warranties</h2>
            <p>IntoIQ is provided <strong>"as is"</strong> and <strong>"as available"</strong> without warranties of any kind, either express or implied. We do not guarantee that the service will be uninterrupted, error-free, or secure at all times.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Into Innovations' total liability to you for any claims arising from your use of IntoIQ is limited to the <strong>amount you paid us in the 12 months preceding the claim</strong>. We are not liable for any indirect, incidental, special, or consequential damages.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Governing Law</h2>
            <p>These terms are governed by and construed in accordance with the laws of the <strong>State of Georgia, USA</strong>, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts located in the State of Georgia.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Changes to These Terms</h2>
            <p>We may update these terms from time to time. Continued use of IntoIQ after changes constitutes acceptance of the updated terms.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Contact Us</h2>
            <p>For questions about these terms, contact us at <a href="mailto:support@intoiq.app" className="text-primary hover:underline">support@intoiq.app</a>.</p>
          </div>
        </section>
      </article>

      <AppFooter variant="marketing" />
    </div>
  );
}
