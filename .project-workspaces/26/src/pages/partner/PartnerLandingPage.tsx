import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  CheckCircle,
  ArrowRight,
  Target,
  PiggyBank,
  TrendingUp,
  CreditCard,
  BarChart3,
  Shield,
  ExternalLink,
  Mail,
  Phone,
  MapPin
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface Partner {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string | null;
  tagline: string | null;
  contact_info: string | null;
  highlights_text: string | null;
  external_website_url: string | null;
  is_active: boolean;
  // New structured fields
  office_name: string | null;
  phone: string | null;
  address: string | null;
  contact_logo_url: string | null;
  design_theme: 'gradient' | 'glass_morphism' | 'professional' | null;
  branding_level: 'full' | 'minimal' | null;
}

export default function PartnerLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPartnerData = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const { data: partnerData, error } = await supabase
          .from("partners_public")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();

        if (error || !partnerData) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setPartner(partnerData as Partner);
      } catch (error) {
        console.error("Error fetching partner:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPartnerData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (notFound || !partner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <Sparkles className="h-16 w-16 text-emerald-500 mb-6" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Partner Not Found</h1>
        <p className="text-slate-600 mb-6">This partner page doesn't exist or is no longer active.</p>
        <Link to="/">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            Go to CoinsBloom
          </Button>
        </Link>
      </div>
    );
  }

  const primaryColor = partner.primary_color || "#10B981";
  const secondaryColor = partner.secondary_color;
  const designTheme = partner.design_theme || 'gradient';

  // Generate header styles based on design theme
  const getHeaderStyle = () => {
    switch (designTheme) {
      case 'glass_morphism':
        return {
          background: `linear-gradient(135deg, ${primaryColor}dd, ${secondaryColor || primaryColor}aa)`,
          backdropFilter: 'blur(20px)',
        };
      case 'professional':
        return {
          backgroundColor: primaryColor,
        };
      case 'gradient':
      default:
        return secondaryColor && secondaryColor !== primaryColor
          ? { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }
          : { backgroundColor: primaryColor };
    }
  };

  const headerStyle = getHeaderStyle();

  // Check if we have structured contact info
  const hasStructuredContact = partner.office_name || partner.phone || partner.address;
  const hasAnyContact = hasStructuredContact || partner.contact_info;

  const features = [
    { icon: PiggyBank, title: "Smart Budgeting", desc: "Create and track budgets with intelligent insights" },
    { icon: Target, title: "Goal Setting", desc: "Set and track your financial goals" },
    { icon: TrendingUp, title: "Spending Analytics", desc: "Understand where your money goes" },
    { icon: CreditCard, title: "Bill Tracking", desc: "Auto-detect recurring bills with smart notifications" },
    { icon: BarChart3, title: "Net Worth Tracking", desc: "See your full financial picture" },
    { icon: Shield, title: "Secure & Private", desc: "Bank-level security protection" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{partner.name} | Financial Wellness Platform</title>
        <meta name="description" content={partner.tagline || `${partner.name} financial wellness platform powered by CoinsBloom`} />
      </Helmet>

      {/* Hero Section */}
      <header 
        className={`relative ${designTheme === 'glass_morphism' ? 'overflow-hidden' : ''}`} 
        style={headerStyle}
      >
        {/* Glass morphism decorative elements */}
        {designTheme === 'glass_morphism' && (
          <>
            <div 
              className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-30 blur-3xl"
              style={{ backgroundColor: secondaryColor || primaryColor }}
            />
            <div 
              className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full opacity-20 blur-3xl"
              style={{ backgroundColor: primaryColor }}
            />
          </>
        )}

        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16 relative z-10">
          {/* Partner Branding */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              {partner.logo_url ? (
                <img src={partner.logo_url} alt={partner.name} className="h-12 md:h-14 object-contain" />
              ) : (
                <div 
                  className={`w-14 h-14 rounded-lg flex items-center justify-center ${
                    designTheme === 'glass_morphism' ? 'bg-white/20 backdrop-blur-sm' : 'bg-white/20'
                  }`}
                >
                  <span className="text-white text-2xl font-bold">{partner.name.charAt(0)}</span>
                </div>
              )}
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">{partner.name}</h1>
                <Badge className={`${designTheme === 'glass_morphism' ? 'bg-white/10 backdrop-blur-sm' : 'bg-white/20'} text-white border-0 text-xs`}>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified Partner
                </Badge>
              </div>
            </div>
            {partner.external_website_url && (
              <a
                href={partner.external_website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center gap-1 text-white/90 hover:text-white text-sm transition-colors"
              >
                Visit Website
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>

          {/* Hero Content */}
          <div className="max-w-2xl">
            <Badge className={`mb-4 ${designTheme === 'glass_morphism' ? 'bg-white/10 backdrop-blur-sm' : 'bg-white/20'} text-white border-0`}>
              <Sparkles className="h-3 w-3 mr-1" />
              Powered by CoinsBloom
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              We've Partnered with CoinsBloom to Bring You
            </h2>
            <p className="text-xl md:text-2xl font-semibold text-white/95 mb-4">
              A Powerful, All-in-One Financial Platform — Free
            </p>
            {partner.tagline && (
              <p className="text-lg text-white/90 mb-4">
                {partner.tagline}
              </p>
            )}
            <p className="text-white/80 mb-8">
              Organize your finances, connect with our professionals, and stay informed about exclusive offerings from {partner.name}.
            </p>
            <Link to={`/auth?partner=${partner.slug}`}>
              <Button 
                size="lg" 
                className={`font-semibold shadow-lg transition-all ${
                  designTheme === 'glass_morphism' 
                    ? 'bg-white/90 hover:bg-white backdrop-blur-sm' 
                    : 'bg-white hover:bg-white/95'
                }`}
                style={{ color: primaryColor }}
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Partner Highlights Section */}
      {partner.highlights_text && (
        <section className="py-12 md:py-16 bg-white border-b border-slate-100">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex flex-col md:flex-row items-start gap-8 md:gap-12">
              <div className="flex-shrink-0">
                <div 
                  className="w-20 h-20 rounded-xl flex items-center justify-center"
                  style={headerStyle}
                >
                  {partner.logo_url ? (
                    <img src={partner.logo_url} alt={partner.name} className="h-12 object-contain" />
                  ) : (
                    <span className="text-3xl font-bold text-white">{partner.name.charAt(0)}</span>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-4">
                  About {partner.name}
                </h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {partner.highlights_text}
                </p>
                {partner.external_website_url && (
                  <a
                    href={partner.external_website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-4 font-medium transition-colors"
                    style={{ color: primaryColor }}
                  >
                    Learn more about us
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              <span className="text-emerald-600 font-medium">CoinsBloom Platform</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
              Smart Financial Tools at Your Fingertips
            </h3>
            <p className="text-slate-600 max-w-xl mx-auto">
              Everything you need to manage your money, track your goals, and build wealth — all in one place
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <Card key={feature.title} className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-emerald-100"
                  >
                    <feature.icon className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">{feature.title}</h4>
                  <p className="text-slate-600 text-sm">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section - Shows if any contact info exists */}
      {hasAnyContact && (
        <section className="py-12 bg-white border-t border-slate-100">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">
                Contact {partner.office_name || partner.name}
              </h3>
            </div>
            
            <div className="max-w-lg mx-auto">
              {/* Structured Contact Card */}
              {hasStructuredContact && (
                <Card className="bg-slate-50 border-slate-200 mb-4">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {partner.contact_logo_url && (
                        <img 
                          src={partner.contact_logo_url} 
                          alt={partner.office_name || partner.name} 
                          className="w-16 h-16 object-contain rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="space-y-3 flex-1">
                        {partner.office_name && (
                          <h4 className="font-semibold text-slate-900">{partner.office_name}</h4>
                        )}
                        {partner.phone && (
                          <a 
                            href={`tel:${partner.phone}`}
                            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                          >
                            <Phone className="h-4 w-4" style={{ color: primaryColor }} />
                            {partner.phone}
                          </a>
                        )}
                        {partner.address && (
                          <div className="flex items-start gap-2 text-slate-600">
                            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: primaryColor }} />
                            <span className="whitespace-pre-line">{partner.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Simple Contact Info Text */}
              {partner.contact_info && (
                <div className="bg-slate-50 rounded-lg p-6">
                  <p className="text-slate-600 whitespace-pre-line text-center">
                    {partner.contact_info}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
            Ready to Take Control of Your Finances?
          </h3>
          <p className="text-slate-600 mb-4 max-w-xl mx-auto">
            Join thousands using CoinsBloom to manage their money smarter.
          </p>
          <p className="text-emerald-600 font-medium mb-8">
            Free access through {partner.name} • No credit card required
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={`/auth?partner=${partner.slug}`}>
              <Button 
                size="lg" 
                className="font-semibold shadow-lg text-white w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
              >
                Create Your Free Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            {partner.external_website_url && (
              <a
                href={partner.external_website_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Learn About {partner.name}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 px-4 bg-white">
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-500" />
          <span className="text-slate-500 text-sm">Powered by</span>
          <Link to="/" className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors">
            CoinsBloom
          </Link>
        </div>
      </footer>
    </div>
  );
}
