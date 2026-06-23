import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Shield, 
  Lock, 
  Database, 
  Eye, 
  UserCheck, 
  ShieldCheck,
  Bell as BellIcon,
  AlertTriangle,
  Info,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrivacyTabProps {
  searchQuery?: string;
}

export const PrivacyTab = ({ searchQuery }: PrivacyTabProps) => {
  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <Card className="bg-gradient-to-br from-primary/5 via-card to-accent/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-bloom-blue/20">
              <Shield className="w-6 h-6 text-bloom-blue" />
            </div>
            <div>
              <CardTitle className="text-xl">Data & Privacy</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Understand what data we collect, why, and how it helps you
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Your Data is Yours */}
      <Card className="bg-card border-border/50">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <Lock className="w-8 h-8 text-muted-foreground shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Your data is yours</h3>
              <p className="text-muted-foreground mt-1">
                We never sell your data. You can export or delete it anytime. All data is encrypted and stored securely.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mental Shredder */}
      <Card className="bg-card border-border/50">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <Shield className="w-8 h-8 text-muted-foreground shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Mental Shredder — zero-trace mode</h3>
              <p className="text-muted-foreground mt-1">
                For absolute discretion, use Bloom's <strong>Mental Shredder</strong> mode for zero-trace sessions that are never recorded to your Strategic Memory. Nothing said in Shredder mode is written to the Blueprint Ledger or used to personalize future sessions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What Data We Collect */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="w-5 h-5 text-bloom-blue" />
            What Data We Collect
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {[
              "Financial transactions (amounts, dates, categories)",
              "Budget limits and spending data",
              "Savings goals and contributions",
              "Account balances and types",
              "Bill due dates and payment history",
              "User preferences and settings",
              "Dashboard highlights and announcements viewed",
              "Live stream and featured video viewing activity",
              "Kids profile data (chores, allowances, balances)",
              "Bloom Strategic Memory entries (Blueprint Ledger — only when you choose to save them)"
            ].map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-foreground">
                <span className="text-muted-foreground">•</span>
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* How We Use Your Data */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="w-5 h-5 text-bloom-green" />
            How We Use Your Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {[
              "Calculate budget progress and spending trends",
              "Send bill reminders and budget alerts",
              "Track goal progress and estimate completion dates",
              "Generate reports and analytics",
              "Power Bloom, your Financial Architect, with personalized Strategic Blueprints (Premium)",
              "Display relevant dashboard highlights and announcements",
              "Curate educational content and live streams",
              "Manage KidsBloom profiles and family finances",
              "Improve app features based on anonymized usage patterns"
            ].map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-foreground">
                <span className="text-muted-foreground">•</span>
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Your Privacy Rights */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCheck className="w-5 h-5 text-primary" />
            Your Privacy Rights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {[
              "Access all your data anytime from Settings",
              "Export your data as CSV or PDF (Premium)",
              "Delete specific transactions or entire account",
              "Control who sees your data with Premium collaboration features",
              "Opt out of notifications and emails",
              "Request data deletion within 30 days"
            ].map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-foreground">
                <span className="text-muted-foreground">•</span>
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Security Measures */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="w-5 h-5 text-destructive" />
            Security Measures
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {[
              "Bank-level 256-bit SSL encryption",
              "Secure cloud storage with redundancy",
              "Regular security audits and penetration testing",
              "Two-factor authentication available",
              "Automatic session timeout after inactivity",
              "SOC 2 Type II compliant infrastructure"
            ].map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-foreground">
                <span className="text-muted-foreground">•</span>
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Data Breach Promise */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Data Breach Promise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground">
            In the unlikely event of a data breach, we commit to notifying all affected users within 72 hours via email. We maintain comprehensive incident response plans and cyber insurance to protect you.
          </p>
        </CardContent>
      </Card>

      {/* Questions About Privacy */}
      <Card className="bg-muted/50 border-border/50">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <Info className="w-6 h-6 text-muted-foreground shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground">Questions about privacy?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Read our full Privacy Policy or contact our privacy team at{" "}
                <a href="mailto:privacy@coinsbloom.com" className="text-primary hover:underline">
                  privacy@coinsbloom.com
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help Center Info */}
      <Card className="bg-bloom-blue/5 border-bloom-blue/20">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <Info className="w-6 h-6 text-bloom-blue shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                💡 Help Center (Learn & Get Support)
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-foreground">
                <li><strong>Getting Started:</strong> Quick tutorials to set up accounts, budgets, and goals</li>
                <li><strong>Features Guide:</strong> Learn what each tool does and how to use it effectively</li>
                <li><strong>Privacy & Security:</strong> Understand how we protect your financial data</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-3">
                Browse tutorials, use the calculators, or explore the What-If Simulator to plan your financial future.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Card */}
      <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
        <CardContent className="py-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/20 mb-3">
            <Send className="w-6 h-6 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Have Feedback?</h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-4">
            Report bugs, request features, or share your thoughts
          </p>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Send className="w-4 h-4" />
            Send Feedback
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
