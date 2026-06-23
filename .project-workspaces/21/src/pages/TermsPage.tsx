import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';


export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-transparent">
      <nav className="flex h-14 items-center justify-between px-4 max-w-3xl mx-auto">
        <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-primary">
              <MessageCircle className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">Comp<span className="text-primary">a</span>ni</span>
          </div>
        </button>
        
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Terms of Service</h1>
        <p className="text-xs text-muted-foreground">Last updated: February 15, 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/90">
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">By accessing or using Compani ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-foreground">2. Description of Service</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">Compani provides AI-powered companion interactions, community features, and related services. The Service includes free and premium subscription tiers.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-foreground">3. User Accounts</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">You must create an account to use certain features. You are responsible for maintaining the confidentiality of your credentials and all activities under your account. You must be at least 13 years old to use the Service.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-foreground">4. Acceptable Use</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">You agree not to: (a) use the Service for illegal purposes; (b) harass, abuse, or harm other users; (c) attempt to circumvent security measures; (d) upload malicious content; (e) impersonate others; (f) use the Service for commercial spam.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-foreground">5. AI Companion Disclaimer</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">Compani's AI companions are not real people. They are AI-generated entities designed for companionship and emotional support. They are not substitutes for professional medical, psychological, or therapeutic advice. In case of emergency, please contact local emergency services.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-foreground">6. Subscriptions & Billing</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">Premium subscriptions are billed monthly or annually through Stripe. You may cancel anytime. Refunds are handled per our refund policy. Prices may change with 30 days' notice.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-foreground">7. Intellectual Property</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">All content and software provided by Compani is owned by us or our licensors. You retain rights to content you create, but grant us a license to use it within the Service.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-foreground">8. Limitation of Liability</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">The Service is provided "as is" without warranties. We are not liable for indirect, incidental, or consequential damages. Our total liability is limited to the amount you paid in the 12 months preceding the claim.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-foreground">9. Termination</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">We may suspend or terminate your account for violations. You may delete your account at any time through Settings. Upon termination, your data will be deleted per our Privacy Policy.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-foreground">10. Changes to Terms</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">We may update these Terms at any time. Continued use after changes constitutes acceptance. Material changes will be communicated via email or in-app notification.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-foreground">11. Contact</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">For questions about these Terms, contact us at support@compani.app.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
