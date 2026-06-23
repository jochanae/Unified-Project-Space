import { useNavigate } from 'react-router-dom';
import { LogoCapsule } from '@/components/shared/LogoCapsule';
import { AppFooter } from '@/components/shared/AppFooter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
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
        <h1 className="text-2xl sm:text-3xl font-serif mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: April 14, 2026</p>

        <section className="space-y-6 text-sm leading-relaxed text-foreground/90">
          <div>
            <h2 className="text-lg font-semibold mb-2">Who We Are</h2>
            <p>IntoIQ is operated by <strong>Into Innovations</strong>. This privacy policy explains how we collect, use, and protect your personal information when you use our platform.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Account information:</strong> Email address, display name, and avatar when you create an account.</li>
              <li><strong>Project data:</strong> Funnel content, landing pages, strategies, and other project materials you create within the service.</li>
              <li><strong>Brand identity data:</strong> Vibe descriptions, color palettes, typography preferences, mood keywords, and visual direction generated through Signal Lab and Style Signal. This data is stored as project context and used to personalize AI-generated content.</li>
              <li><strong>Lead submissions:</strong> Contact information submitted through your published funnels (name, email, phone, etc.).</li>
              <li><strong>Usage data:</strong> Page views, feature usage, and interaction data to improve the service.</li>
              <li><strong>Local storage:</strong> We store UI preferences and session data in your browser's local storage.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Third-Party Services</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Payment processing:</strong> Handled by <strong>Stripe</strong>. We do not store credit card information. Stripe's privacy policy applies to payment data.</li>
              <li><strong>Email delivery:</strong> Transactional and sequence emails are sent via <strong>Resend</strong>.</li>
              <li><strong>AI features:</strong> MarQ and other AI capabilities use third-party AI services to generate content, strategies, brand identity analysis, and style recommendations. When you use Signal Lab or Style Signal, your vibe descriptions and brand preferences are processed by AI to generate visual identity outputs (palettes, typography, mood). This data is stored within your project and is not shared with third parties beyond the AI processing necessary to generate results.</li>
              <li><strong>Authentication:</strong> We support Google and Apple sign-in. Their respective privacy policies apply to data shared during authentication.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>To provide, maintain, and improve the IntoIQ platform.</li>
              <li>To process your subscription and billing.</li>
              <li>To send transactional emails (account verification, password resets, billing receipts).</li>
              <li>To provide AI-powered features and suggestions.</li>
              <li>To respond to support requests.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Data Sharing</h2>
            <p>We <strong>do not sell</strong> your personal data to third parties. We share data only with the service providers listed above, and only as necessary to operate the platform.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Data Retention & Deletion</h2>
            <p>Your data is retained as long as your account is active. You can delete your account and all associated data from the <strong>Settings</strong> page at any time. Upon deletion, your projects, contacts, funnels, and personal information are permanently removed.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Children's Privacy</h2>
            <p>IntoIQ is not intended for use by anyone under the age of 13. We do not knowingly collect personal information from children under 13. If we learn that we have collected such data, we will delete it promptly.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Changes to This Policy</h2>
            <p>We may update this privacy policy from time to time. We will notify users of significant changes via email or an in-app notice.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Contact Us</h2>
            <p>For questions about this privacy policy or your personal data, contact us at <a href="mailto:support@intoiq.app" className="text-primary hover:underline">support@intoiq.app</a>.</p>
          </div>
        </section>
      </article>

      <AppFooter variant="marketing" />
    </div>
  );
}
