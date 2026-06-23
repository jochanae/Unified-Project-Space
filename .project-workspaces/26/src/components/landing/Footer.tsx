import { Link } from "react-router-dom";
import coinsbloomLogo from "@/assets/coinsbloom-logo.png";
import { Building2, Users, GraduationCap } from "lucide-react";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { SignInFeedback } from "@/components/auth/SignInFeedback";

export const Footer = () => {
  const { isFeatureEnabled } = useFeatureFlags();
  const showB2B = isFeatureEnabled("b2b_business");

  // Luxury Obsidian footer link styling — subtle gold hover
  const linkClass = "text-muted-foreground hover:text-amber-400 dark:hover:text-amber-300 transition-colors";

  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-12">
        {/* Brand row — sits above the architectural columns */}
        <div className="flex flex-col items-center text-center mb-10 pb-8 border-b border-border/60">
          <div className="flex items-center gap-2 mb-3">
            <img src={coinsbloomLogo} alt="CoinsBloom" className="h-8 w-8 rounded-lg" />
            <span className="font-display text-xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-purple-700 bg-clip-text text-transparent">
              CoinsBloom
            </span>
          </div>
          <p className="text-sm text-muted-foreground max-w-md">
            Smart financial tools for everyone — All Your Finances. One View.
          </p>
        </div>

        {/* 4-Column Architectural Footer */}
        <div className={`grid grid-cols-2 ${showB2B ? "md:grid-cols-5" : "md:grid-cols-4"} gap-8 mb-8`}>
          {/* Column 1: Product */}
          <div>
            <h4 className="font-semibold mb-3 text-foreground">Product</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <Link to="/features" className={linkClass}>Features</Link>
              <Link to="/pricing" className={linkClass}>Pricing</Link>
              <Link to="/blog" className={linkClass}>Blog</Link>
              <Link to="/kidsbloom" className={linkClass}>Kids Zone</Link>
            </nav>
          </div>

          {/* Column 2: Ecosystem */}
          <div>
            <h4 className="font-semibold mb-3 text-foreground">Ecosystem</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <a 
                href="https://mymoneymypower.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className={`${linkClass} flex items-center gap-1`}
              >
                <GraduationCap className="h-3 w-3" />
                Smart Money Mentor
              </a>
              <span className="text-xs text-muted-foreground/60 italic mt-1">Powered by IntoIQ</span>
            </nav>
          </div>

          {/* Column 3: For Business (conditional) */}
          {showB2B && (
            <div>
              <h4 className="font-semibold mb-3 text-foreground">For Business</h4>
              <nav className="flex flex-col gap-2 text-sm">
                <Link to="/partner/signup" className={`${linkClass} flex items-center gap-1`}>
                  <Building2 className="h-3 w-3" />
                  Become a Partner
                </Link>
                <Link to="/refer" className={`${linkClass} flex items-center gap-1`}>
                  <Users className="h-3 w-3" />
                  Refer a Business
                </Link>
                <Link to="/professionals" className={linkClass}>Find Professionals</Link>
              </nav>
            </div>
          )}

          {/* Column 4: Legal & Trust */}
          <div>
            <h4 className="font-semibold mb-3 text-foreground">Legal & Trust</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <Link to="/privacy" className={linkClass}>Privacy</Link>
              <Link to="/terms" className={linkClass}>Terms</Link>
              <Link to="/sms-consent" className={linkClass}>SMS Consent</Link>
            </nav>
          </div>

          {/* Column 5: Company / Support */}
          <div>
            <h4 className="font-semibold mb-3 text-foreground">Company</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <Link to="/contact" className={linkClass}>Contact</Link>
              <Link to="/help-center" className={linkClass}>Help Center</Link>
              <Link to="/support" className={linkClass}>Support</Link>
            </nav>
          </div>
        </div>

        <div className="border-t pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} CoinsBloom. All rights reserved.
          </p>
          <SignInFeedback variant="link" />
        </div>
      </div>
    </footer>
  );
};
