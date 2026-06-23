import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import intoiqLogo from "@/assets/intoiq-logo.png";

export default function Privacy() {
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
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-muted-foreground mb-6">Last updated: February 4, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground">
              Welcome to IntoIQ ("we," "our," or "us"). We are committed to protecting your personal information 
              and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard 
              your information when you use our financial education platform and services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground mb-3">We collect information that you provide directly to us, including:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Account Information:</strong> Name, email address, username, and password when you create an account</li>
              <li><strong>Profile Information:</strong> Avatar, display preferences, and other optional profile details</li>
              <li><strong>Trading Journal Data:</strong> Trade entries, notes, and analysis you choose to record</li>
              <li><strong>Community Content:</strong> Posts, comments, trade ideas, and discussions you share</li>
              <li><strong>Usage Data:</strong> Information about how you interact with our platform, including lesson progress and feature usage</li>
              <li><strong>Device Information:</strong> Browser type, IP address, and device identifiers for security and analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Personalize your learning experience with Quinn AI</li>
              <li>Process transactions and manage your subscription</li>
              <li>Send you notifications, updates, and educational content</li>
              <li>Respond to your comments, questions, and support requests</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, prevent, and address technical issues and security threats</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Information Sharing</h2>
            <p className="text-muted-foreground mb-3">We do not sell your personal information. We may share your information in the following situations:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Community Features:</strong> Content you post publicly (trade ideas, discussions) is visible to other users</li>
              <li><strong>Service Providers:</strong> Third-party vendors who assist in operating our platform (payment processing, hosting, analytics)</li>
              <li><strong>Legal Requirements:</strong> When required by law, court order, or governmental authority</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
            <p className="text-muted-foreground">
              We implement appropriate technical and organizational security measures to protect your personal information. 
              This includes encryption, secure data storage, and regular security assessments. However, no method of 
              transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Your Privacy Rights</h2>
            <p className="text-muted-foreground mb-3">Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data</li>
              <li><strong>Portability:</strong> Request transfer of your data to another service</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              To exercise these rights, please contact us at privacy@intoiq.app
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Cookies and Tracking</h2>
            <p className="text-muted-foreground">
              We use cookies and similar tracking technologies to enhance your experience, analyze usage patterns, 
              and remember your preferences. You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Children's Privacy</h2>
            <p className="text-muted-foreground">
              Our Youth Mode feature is designed for educational purposes under parental supervision. We do not 
              knowingly collect personal information from children under 13 without parental consent. If you 
              believe we have collected such information, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
              the new policy on this page and updating the "Last updated" date. Your continued use of the service 
              after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy or our privacy practices, please contact us at:
            </p>
            <p className="text-muted-foreground mt-2">
              <strong>Email:</strong> privacy@intoiq.app<br />
              <strong>Website:</strong> https://intoiq.lovable.app
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
