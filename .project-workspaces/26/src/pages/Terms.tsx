import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Terms of Service | CoinsBloom</title>
        <meta name="description" content="CoinsBloom Terms of Service - The terms and conditions governing your use of our platform." />
      </Helmet>

      <Navbar />
      
      <main className="flex-grow container py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using CoinsBloom, you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground">
              CoinsBloom provides personal finance management tools including budgeting, goal tracking, 
              bill management, and family finance features. Our services are provided "as is" and 
              "as available."
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground">
              You are responsible for maintaining the confidentiality of your account credentials 
              and for all activities that occur under your account. You must notify us immediately 
              of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. User Conduct</h2>
            <p className="text-muted-foreground">
              You agree not to use the service for any unlawful purpose, to upload malicious content, 
              to attempt to gain unauthorized access to our systems, or to interfere with other users' 
              enjoyment of the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Payment Terms</h2>
            <p className="text-muted-foreground">
              Paid subscriptions are billed in advance on a monthly or annual basis. You can cancel 
              your subscription at any time, and you will continue to have access until the end of 
              your current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. SMS Transaction Tracking (Optional)</h2>
            <div className="text-muted-foreground space-y-4">
              <p>
                CoinsBloom offers optional SMS transaction tracking. SMS consent is collected separately
                via an explicit opt-in checkbox during phone setup (see{" "}
                <a href="/sms-consent" className="text-primary underline">SMS Consent</a>). You can use
                CoinsBloom without enabling SMS.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Opt-In:</strong> Users opt in by checking the SMS consent box and enabling SMS
                  tracking in their account settings.
                </li>
                <li>
                  <strong>Message Types:</strong> You may receive transaction confirmation messages when you
                  forward transaction texts to our toll-free number (+1 888-411-9298). We do not send
                  marketing or promotional messages.
                </li>
                <li>
                  <strong>Message Frequency:</strong> Message frequency depends on your usage. You will only
                  receive confirmation messages in response to transactions you submit.
                </li>
                <li>
                  <strong>Opt-Out:</strong> Reply STOP to any message to opt-out at any time. You can also
                  disable SMS tracking in your account settings.
                </li>
                <li>
                  <strong>Costs:</strong> Message and data rates may apply. Check with your carrier for
                  details.
                </li>
                <li>
                  <strong>Help:</strong> Reply HELP for assistance, or visit{" "}
                  <a href="/help-center" className="text-primary underline">coinsbloom.com/help</a>.
                </li>
              </ul>
              <p>
                For more information, see our{" "}
                <a href="/privacy" className="text-primary underline">Privacy Policy</a>.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              CoinsBloom provides financial tracking tools for informational purposes only. We are not 
              financial advisors and do not provide financial advice. You are solely responsible for 
              your financial decisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms, please contact us at legal@coinsbloom.com.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}