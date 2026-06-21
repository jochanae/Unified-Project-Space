import { useState, useEffect, type CSSProperties } from "react";

const smallUiText: CSSProperties = {
  fontFamily: "Inter, sans-serif",
  fontWeight: 300,
  textTransform: "uppercase",
  letterSpacing: "0.15em",
};

export function LandingHeader({ onSignIn }: { onSignIn?: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallEvent(e); };
    window.addEventListener("beforeinstallprompt", handler);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (installEvent) {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === "accepted") { setInstallEvent(null); setInstalled(true); }
    } else {
      window.location.href = "/home";
    }
  };

  return (
    <header
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? "rgba(13,11,9,0.72)" : "transparent",
        backdropFilter: scrolled ? "blur(15px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(212,175,55,0.1)" : "none",
        transition: "background 400ms ease, backdrop-filter 400ms ease, border-color 400ms ease",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "56px", padding: "0 20px",
      }}
      className="lp-header"
    >
      {/* Left: Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }} aria-hidden>
          <defs>
            <linearGradient id="lphgs" x1="18" y1="4" x2="18" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F5D97A" />
              <stop offset="50%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#A07820" />
            </linearGradient>
          </defs>
          <polygon points="18,4 30,32 24,32 18,18 12,32 6,32" fill="url(#lphgs)" />
          <rect x="10" y="22" width="16" height="2.5" rx="1.25" fill="url(#lphgs)" opacity="0.85" />
        </svg>
        <span style={{
          ...smallUiText,
          fontSize: 14, color: "#D4AF37",
        }}>
          AXIOM
        </span>
      </div>

      {/* Center nav intentionally empty. */}
      <nav className="lp-header-nav" style={{ display: "none", gap: 32, alignItems: "center" }} />

      {/* Right — mobile */}
      <div className="lp-header-mobile-right" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={handleInstall} title={installed ? "Already installed" : "Install Axiom"} style={{
          width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(212,175,55,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: installed ? "rgba(212,175,55,0.4)" : "#D4AF37", fontSize: 16,
          background: "transparent", cursor: installed ? "default" : "pointer",
        }}>
          {installed ? "✓" : "↓"}
        </button>
        <button onClick={onSignIn} style={{
          ...smallUiText,
          padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(212,175,55,0.3)",
          color: "#D4AF37", fontSize: 11,
          background: "transparent", cursor: "pointer", transition: "background 200ms", marginLeft: 8,
        }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(212,175,55,0.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          Sign In
        </button>
      </div>

      {/* Right — desktop */}
      <div className="lp-header-desktop-right" style={{ display: "none", alignItems: "center" }}>
        <button onClick={onSignIn} style={{
          ...smallUiText,
          color: "#D4AF37", fontSize: 12,
          background: "transparent", border: "none", cursor: "pointer", transition: "color 200ms",
        }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(212,175,55,0.8)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#D4AF37")}
        >
          Sign In
        </button>
        <button onClick={onSignIn} style={{
          ...smallUiText,
          padding: "8px 20px", borderRadius: 8, background: "#D4AF37", color: "#0D0B09",
          fontSize: 12, border: "none",
          cursor: "pointer", marginLeft: 12, transition: "background 200ms",
        }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(212,175,55,0.9)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#D4AF37")}
        >
          Enter Axiom →
        </button>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .lp-header { height: 64px !important; padding: 0 40px !important; }
          .lp-header-nav { display: flex !important; }
          .lp-header-mobile-right { display: none !important; }
          .lp-header-desktop-right { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
