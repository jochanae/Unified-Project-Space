import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { trackEvent } from "@/lib/analytics";

export const CTASection = () => { 
  const { isFeatureEnabled } = useFeatureFlags();

  const showB2B = isFeatureEnabled("b2b_business");

  return (
    <section className="container py-12 md:py-16 space-y-8 max-w-4xl mx-auto">
      {/* Main CTA */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-8 md:p-10 text-center">
        <div className="absolute top-6 left-6 w-16 h-16 bg-white/10 rounded-full" />
        <div className="absolute bottom-6 right-6 w-20 h-20 bg-white/10 rounded-full" />

        <div className="relative">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-3">
            Ready to Take Control of Your Finances?
          </h2>
          <p className="text-sm md:text-base text-white/80 mb-6 max-w-lg mx-auto">
            Start managing your money smarter — it's free to get started.
          </p>
          <Button
            size="default"
            className="px-6 py-3 bg-white/20 backdrop-blur-sm text-blue-900 hover:bg-white/30 border border-white/30"
            asChild
          >
            <Link to="/signup" onClick={() => trackEvent("bottom_cta_signup")}>
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Business CTA - only shown when b2b_business flag is enabled */}
      {showB2B && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border-2 border-border bg-card p-8 text-center hover:border-primary/50 transition-colors">
            <div className="inline-flex items-center justify-center p-3 rounded-xl bg-primary/10 mb-4">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">For Businesses</h3>
            <p className="text-muted-foreground mb-4">
              Offer your team a branded financial wellness platform
            </p>
            <Button variant="outline" asChild>
              <Link to="/partner/signup" onClick={() => trackEvent("b2b_partner_cta_click")}>
                Become a Partner
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="rounded-2xl border-2 border-border bg-card p-8 text-center hover:border-primary/50 transition-colors">
            <div className="inline-flex items-center justify-center p-3 rounded-xl bg-green-100 dark:bg-green-900/30 mb-4">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Know a Business?</h3>
            <p className="text-muted-foreground mb-4">
              Refer them and earn 10-15% monthly commission for 12 months
            </p>
            <Button variant="outline" asChild>
              <Link to="/refer" onClick={() => trackEvent("b2b_refer_cta_click")}>
                Refer a Business
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};
