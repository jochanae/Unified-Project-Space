import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import coinsbloomLogo from "@/assets/coinsbloom-logo.png";
import { LogOut, User, Building2, Heart, Menu, X, Sparkles, Users, Download } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { trackEvent } from "@/lib/analytics";

const navLinks = [
  { label: "Features", sectionId: "features" },
  { label: "Families", sectionId: "families" },
  { label: "Pricing", sectionId: "pricing" },
  { label: "FAQ", sectionId: "faq" },
];

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-100/80 backdrop-blur-lg dark:bg-slate-900/80 rounded-b-3xl" style={{ boxShadow: '0 20px 25px -5px rgba(30,58,138,0.25)' }}>
      <div className="container flex h-16 items-center justify-between gap-2 pl-4 sm:pl-6 pr-4 sm:pr-6">
        {/* Brand Unit: Menu + Logo grouped tightly together */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Mobile Menu Button - tap target ≥44px, with "Menu" label like dashboard */}
          <Button 
            variant="ghost" 
            className="lg:hidden flex flex-col items-center justify-center gap-0 h-12 w-12 sm:h-12 sm:w-12 px-0 -ml-1"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen 
              ? <X className="h-6 w-6" strokeWidth={2.25} /> 
              : <Menu className="h-6 w-6" strokeWidth={2.25} />}
            <span className="text-[9px] font-medium leading-none mt-0.5 text-muted-foreground">Menu</span>
          </Button>
          <Link to="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
            <img src={coinsbloomLogo} alt="CoinsBloom" className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg" />
            <span className="font-display text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-purple-700 bg-clip-text text-transparent">
              CoinsBloom
            </span>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <button
              key={link.sectionId}
              onClick={() => scrollToSection(link.sectionId)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
            >
              {link.label}
            </button>
          ))}
          <Link
            to="/partner/signup"
            className="px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors rounded-lg hover:bg-primary/10 flex items-center gap-1"
          >
            <Building2 className="h-4 w-4" />
            For Business
          </Link>
        </nav>

        <nav className="flex items-center gap-0.5 sm:gap-2 shrink-0">
          {/* Theme toggle moved into hamburger menu to keep dark as the canonical first impression */}
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/settings" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground max-w-[120px] truncate hidden sm:inline">
                    {user.user_metadata?.first_name || user.email?.split('@')[0]}
                  </span>
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSignOut}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Install App icon — sleek download icon, action-row cluster */}
              <Button
                size="icon"
                variant="ghost"
                aria-label="Install App"
                className="h-9 w-9 rounded-full text-violet-600 hover:text-violet-700 hover:bg-violet-500/10 dark:text-violet-300 dark:hover:text-violet-200 dark:hover:bg-violet-500/15 flex items-center justify-center"
                asChild
              >
                <Link to="/install" onClick={() => trackEvent("header_install_click")}>
                  <Download className="h-[18px] w-[18px]" strokeWidth={2.25} />
                </Link>
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-9 px-4 text-xs sm:text-sm rounded-full border-violet-400/60 bg-violet-500/10 text-violet-700 hover:bg-violet-500/15 hover:text-violet-800 hover:border-violet-500/70 dark:border-violet-400/40 dark:text-violet-200 dark:hover:bg-violet-500/20 dark:hover:text-white dark:hover:border-violet-300/60 backdrop-blur-sm"
                asChild
              >
                <Link to="/signin">Sign In</Link>
              </Button>
            </div>
          )}
        </nav>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-16 left-0 right-0 bg-background/95 backdrop-blur-lg border-b shadow-lg animate-fade-in">
          <div className="container py-4 flex flex-col gap-2">
            {navLinks.map((link) => (
              <button
                key={link.sectionId}
                onClick={() => scrollToSection(link.sectionId)}
                className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg text-left transition-colors"
              >
                {link.label}
              </button>
            ))}
            <div className="border-t pt-2 mt-2 flex flex-col gap-2">
              <Link 
                to="/partner/signup" 
                className="px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg flex items-center gap-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Building2 className="h-4 w-4" />
                Become a Partner
              </Link>
              <Link 
                to="/refer-business" 
                className="px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 rounded-lg flex items-center gap-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Users className="h-4 w-4" />
                Refer a Business
              </Link>
              <Link 
                to="/kidsbloom" 
                className="px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg flex items-center gap-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Sparkles className="h-4 w-4" />
                KidsBloom
              </Link>
              <Link 
                to="/support" 
                className="px-4 py-3 text-sm font-medium text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/30 rounded-lg flex items-center gap-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Heart className="h-4 w-4 fill-current" />
                Support
              </Link>
              <Link 
                to="/credit?tab=products"
                className="px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 rounded-lg flex items-center gap-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Building2 className="h-4 w-4" />
                Banking Partners
              </Link>
              <div className="border-t pt-2 mt-2 flex items-center justify-between px-4 py-2">
                <span className="text-sm font-medium text-muted-foreground">Appearance</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
