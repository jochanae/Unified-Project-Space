import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Privacy Policy | CoinsBloom</title>
        <meta name="description" content="CoinsBloom Privacy Policy - Learn how we collect, use, and protect your personal information." />
      </Helmet>

      <Navbar />
      
      <main className="flex-grow container py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground">
              We collect information you provide directly to us, such as when you create an account, 
              use our services, or contact us for support. This includes your name, email address, 
              and financial data you choose to enter into the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p className="text-muted-foreground">
              We use the information we collect to provide, maintain, and improve our services, 
              process transactions, send you technical notices and support messages, and respond 
              to your comments and questions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Data Security</h2>
            <p className="text-muted-foreground">
              We implement industry-standard security measures to protect your personal information. 
              Your data is encrypted in transit and at rest. We use secure authentication methods 
              including two-factor authentication for enhanced security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Sharing</h2>
            <p className="text-muted-foreground">
              We do not sell your personal information. We may share your information with third-party 
              service providers who perform services on our behalf, such as payment processing and 
              data analytics, subject to confidentiality obligations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
            <p className="text-muted-foreground">
              You have the right to access, correct, or delete your personal information. You can 
              manage most of your data directly through your account settings. For additional requests, 
              please contact our support team.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy, please contact us at privacy@coinsbloom.com.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}