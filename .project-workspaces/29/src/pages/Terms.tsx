import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import intoiqLogo from "@/assets/intoiq-logo.png";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl rounded-b-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] border-b border-border/30">
        <div className="flex h-14 items-center justify-between px-4 max-w-4xl mx-auto">
          <Link to="/" className="flex items-center gap-2 group">
            <ArrowLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">Back</span>
          </Link>
          <Link to="/" className="flex items-center">
            <img 
              src={intoiqLogo} 
              alt="IntoIQ" 
              className="h-10 w-auto rounded-lg"
            />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-6">Last updated: February 4, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Agreement to Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using IntoIQ ("the Service"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our Service. These terms apply to all users, 
              including visitors, registered users, and subscribers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground">
              IntoIQ is a financial education platform that provides:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-3">
              <li>Educational content about trading, investing, and personal finance</li>
              <li>AI-powered learning assistance through Quinn</li>
              <li>Paper trading simulation for practice</li>
              <li>Trade journaling and analytics tools</li>
              <li>Community features for discussion and idea sharing</li>
              <li>Options and trading calculators</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Important Disclaimer</h2>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-muted-foreground">
              <p className="font-semibold text-foreground mb-2">⚠️ Not Financial Advice</p>
              <p>
                IntoIQ is an <strong>educational platform only</strong>. Nothing on this platform constitutes 
                financial, investment, trading, or tax advice. All content, including Quinn AI responses, 
                trade ideas shared by users, and educational materials, are for informational and educational 
                purposes only.
              </p>
              <p className="mt-3">
                <strong>You should always:</strong>
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Consult with qualified financial advisors before making investment decisions</li>
                <li>Conduct your own research and due diligence</li>
                <li>Understand that all trading involves risk of loss</li>
                <li>Never invest money you cannot afford to lose</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. User Accounts</h2>
            <p className="text-muted-foreground mb-3">To use certain features, you must create an account. You agree to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your password and account</li>
              <li>Notify us immediately of any unauthorized use</li>
              <li>Be responsible for all activities under your account</li>
              <li>Be at least 13 years of age (or have parental consent for Youth Mode)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Subscription and Payments</h2>
            <p className="text-muted-foreground mb-3">For paid subscriptions (Pro tier):</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Subscriptions are billed monthly at the stated rate</li>
              <li>You authorize us to charge your payment method on a recurring basis</li>
              <li>You may cancel at any time; access continues until the end of the billing period</li>
              <li>Refunds are handled on a case-by-case basis</li>
              <li>We reserve the right to change pricing with 30 days notice</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Acceptable Use</h2>
            <p className="text-muted-foreground mb-3">You agree NOT to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Use the Service for any illegal purpose or in violation of any laws</li>
              <li>Provide investment advice or hold yourself out as a licensed professional</li>
              <li>Share content that is defamatory, harassing, or harmful to others</li>
              <li>Manipulate or attempt to manipulate other users' trading decisions</li>
              <li>Upload malicious code or attempt to breach security</li>
              <li>Create multiple accounts or share account credentials</li>
              <li>Scrape, copy, or redistribute our content without permission</li>
              <li>Interfere with the proper functioning of the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Community Guidelines</h2>
            <p className="text-muted-foreground mb-3">When participating in community features:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Be respectful and constructive in all interactions</li>
              <li>Do not share trade ideas as guaranteed outcomes</li>
              <li>Clearly label speculation and opinions as such</li>
              <li>Do not engage in pump-and-dump schemes or market manipulation</li>
              <li>Report inappropriate content to moderators</li>
              <li>Understand that other users' trade ideas are not professional advice</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Intellectual Property</h2>
            <p className="text-muted-foreground">
              All content, features, and functionality of IntoIQ (including but not limited to text, graphics, 
              logos, icons, images, audio, video, software, and the compilation thereof) are owned by IntoIQ 
              and are protected by copyright, trademark, and other intellectual property laws.
            </p>
            <p className="text-muted-foreground mt-3">
              You retain ownership of content you create (trade journals, posts, etc.), but grant us a license 
              to use, display, and distribute such content within the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, INTOIQ AND ITS AFFILIATES SHALL NOT BE LIABLE FOR:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-3">
              <li>Any trading losses or financial damages resulting from use of the Service</li>
              <li>Decisions made based on educational content or user-generated trade ideas</li>
              <li>Accuracy, completeness, or reliability of any content</li>
              <li>Service interruptions, data loss, or technical errors</li>
              <li>Actions or content of third-party users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify and hold harmless IntoIQ and its officers, directors, employees, and agents 
              from any claims, damages, losses, liabilities, and expenses (including attorneys' fees) arising 
              from your use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Termination</h2>
            <p className="text-muted-foreground">
              We may terminate or suspend your account immediately, without prior notice, for conduct that we 
              believe violates these Terms or is harmful to other users, us, or third parties. Upon termination, 
              your right to use the Service will cease immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these Terms at any time. We will provide notice of significant 
              changes via email or in-app notification. Your continued use of the Service after changes 
              constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms shall be governed by and construed in accordance with the laws of the United States, 
              without regard to conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">14. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-muted-foreground mt-2">
              <strong>Email:</strong> legal@intoiq.app<br />
              <strong>Website:</strong> https://intoiq.lovable.app
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
