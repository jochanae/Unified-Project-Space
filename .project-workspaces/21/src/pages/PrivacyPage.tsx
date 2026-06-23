import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';


export default function PrivacyPage() {
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
        <h1 className="font-display text-3xl font-bold text-foreground">Privacy Policy</h1>
        <p className="text-xs text-muted-foreground">Last updated: February 15, 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/90">
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-foreground">1. Information We Collect</h2>
            <p className="text-sm leading-relaxed text-muted-foreground"><strong className="text-foreground">Account Information:</strong> Email address, display name, username, and authentication data when you create an account.</p>
            <p className="text-sm leading-relaxed text-muted-foreground"><strong className="text-foreground">Profile Data:</strong> Optional information you provide such as bio, vibe, phone number, and uploaded photos.</p>
            <p className="text-sm leading-relaxed text-muted-foreground"><strong className="text-foreground">Conversation Data:</strong> Messages between you and your AI companion are stored to provide continuity and memory features.</p>
            <p className="text-sm leading-relaxed text-muted-foreground"><strong className="text-foreground">Usage Data:</strong> We track message and image generation counts for service management. We do not sell this data.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-foreground">2. How We Use Your Information</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">We use your information to: (a) provide and personalize the Service; (b) maintain your companion's memory; (c) process payments; (d) send service communications; (e) ensure safety and moderation; (f) improve the Service.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-foreground">3. Data Storage & Security</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">Your data is stored securely using industry-standard encryption. Conversation data is stored per-user and protected by row-level security policies. We never share your conversations with other users.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-foreground">4. AI & Machine Learning</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">Your conversations may be processed by AI models to generate responses. We use third-party AI providers (such as Anthropic and Google) to power companion interactions. These providers process data per their own privacy policies but do not retain your data for training.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-foreground">5. Third-Party Services</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">We use the following third-party services: Stripe (payments), ElevenLabs (voice), Twilio (SMS). Each processes only the data necessary for their service.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-foreground">6. Your Rights</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">You can: (a) access your data through Settings; (b) delete your data by resetting your account; (c) export your data by contacting support; (d) opt out of SMS communications at any time.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-foreground">7. Children's Privacy</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">Compani is not intended for users under 13. We do not knowingly collect data from children under 13. If you believe a child has provided us data, please contact us.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-foreground">8. Data Retention</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">We retain your data for as long as your account is active. When you delete your account, all associated data is permanently removed within 30 days.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-foreground">9. Changes to This Policy</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">We may update this Privacy Policy periodically. We will notify you of material changes via email or in-app notification.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-foreground">10. Contact</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">For privacy inquiries, contact us at privacy@compani.app.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
