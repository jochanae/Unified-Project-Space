import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

/**
 * iOS Safe-Area Visual Test
 *
 * Confirms sticky/fixed headers never overlap the status bar across iPhone
 * notch/Dynamic Island sizes. Open this page on-device (or in Safari Responsive
 * Design Mode) and verify:
 *  1. The red "STATUS BAR ZONE" strip sits flush behind the iOS status bar
 *     and is fully visible (not hidden by app chrome).
 *  2. The gold sticky header's first line of text is fully readable —
 *     never clipped by the notch / Dynamic Island.
 *  3. Numeric readouts at the bottom show non-zero `safe-area-inset-top`
 *     when launched as an installed PWA on a notched device.
 *
 * Route: /__dev/ios-safe-area  (dev-only, not linked from production nav)
 */
export const Route = createFileRoute("/__dev/ios-safe-area")({
  component: IosSafeAreaTest,
  head: () => ({
    meta: [{ title: "iOS Safe Area Test — SanctumIQ" }],
  }),
});

function IosSafeAreaTest() {
  const [insets, setInsets] = useState({ top: "—", bottom: "—", left: "—", right: "—" });
  const [meta, setMeta] = useState({
    standalone: false,
    iosStandalone: false,
    ua: "",
    viewport: "",
    dpr: 1,
  });

  useEffect(() => {
    const read = () => {
      const probe = document.getElementById("safe-area-probe");
      if (!probe) return;
      const cs = getComputedStyle(probe);
      setInsets({
        top: cs.paddingTop,
        bottom: cs.paddingBottom,
        left: cs.paddingLeft,
        right: cs.paddingRight,
      });
      setMeta({
        standalone: window.matchMedia("(display-mode: standalone)").matches,
        iosStandalone:
          (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
        ua: window.navigator.userAgent,
        viewport: `${window.innerWidth}×${window.innerHeight}`,
        dpr: window.devicePixelRatio,
      });
    };
    read();
    window.addEventListener("resize", read);
    window.addEventListener("orientationchange", read);
    return () => {
      window.removeEventListener("resize", read);
      window.removeEventListener("orientationchange", read);
    };
  }, []);

  return (
    <div className="min-h-screen bg-obsidian text-gold-soft">
      {/* Hidden probe element that captures env(safe-area-inset-*) values */}
      <div
        id="safe-area-probe"
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
          pointerEvents: "none",
          visibility: "hidden",
        }}
      />

      {/* RED STATUS BAR ZONE — should be fully visible above all chrome */}
      <div
        className="fixed inset-x-0 top-0 z-[200] flex items-end justify-center bg-red-600/80 text-[10px] font-mono uppercase tracking-widest text-white"
        style={{ height: "env(safe-area-inset-top, 0px)" }}
      >
        <span className="pb-0.5">status bar zone</span>
      </div>

      {/* STICKY HEADER under test — must clear the red zone */}
      <header
        className="fixed inset-x-0 top-0 z-[100] border-b border-gold/30 bg-obsidian/90 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <span className="font-display text-lg text-gold">Header Title</span>
          <span className="text-xs text-gold-soft/70">should clear notch ↑</span>
        </div>
      </header>

      {/* CONTENT — offset by header (56px) + safe-area-inset-top */}
      <main
        className="mx-auto max-w-4xl px-6 pb-32"
        style={{ paddingTop: "calc(56px + env(safe-area-inset-top) + 24px)" }}
      >
        <h1 className="font-display text-3xl text-gold">iOS Safe Area Test</h1>
        <p className="mt-2 text-sm text-gold-soft/80">
          Visual probe for status-bar overlap across iPhone models. Add this page to your home
          screen on iOS to test in standalone PWA mode where notch insets actually apply.
        </p>

        <Checklist />

        <section className="mt-8 rounded-lg border border-gold/20 bg-obsidian-elevated p-5">
          <h2 className="font-display text-xl text-gold">Live readout</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-xs">
            <Row k="safe-area-inset-top" v={insets.top} />
            <Row k="safe-area-inset-bottom" v={insets.bottom} />
            <Row k="safe-area-inset-left" v={insets.left} />
            <Row k="safe-area-inset-right" v={insets.right} />
            <Row k="display-mode: standalone" v={String(meta.standalone)} />
            <Row k="navigator.standalone (iOS)" v={String(meta.iosStandalone)} />
            <Row k="viewport" v={meta.viewport} />
            <Row k="devicePixelRatio" v={String(meta.dpr)} />
          </dl>
          <p className="mt-3 text-[11px] text-gold-soft/60 break-all">UA: {meta.ua}</p>
        </section>

        <section className="mt-8 rounded-lg border border-gold/20 bg-obsidian-elevated p-5">
          <h2 className="font-display text-xl text-gold">Expected values (PWA, portrait)</h2>
          <ul className="mt-3 space-y-1 text-xs text-gold-soft/80">
            <li>• iPhone SE / 8 / non-notch: top ≈ 20px</li>
            <li>• iPhone X / XS / 11 Pro / 12 / 13 / 14 (notch): top ≈ 44–47px</li>
            <li>• iPhone 14 Pro / 15 / 15 Pro (Dynamic Island): top ≈ 59px</li>
            <li>• iPhone 16 Pro / 16 Pro Max: top ≈ 59–62px</li>
            <li>• Bottom (home indicator): ≈ 34px on all notched models</li>
          </ul>
        </section>

        <Link
          to="/"
          className="mt-10 inline-flex items-center gap-2 rounded-md border border-gold/30 px-4 py-2 text-sm text-gold hover:bg-gold/10"
        >
          ← Back to landing
        </Link>
      </main>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-gold-soft/60">{k}</dt>
      <dd className="text-gold">{v}</dd>
    </>
  );
}

function Checklist() {
  const items = [
    "Red 'STATUS BAR ZONE' strip is fully visible at the top",
    "Gold header title is not clipped by the notch / Dynamic Island",
    "Header bottom border sits below the status bar, not behind it",
    "Rotating to landscape moves insets to left/right, top shrinks to 0",
    "In standalone (installed) PWA, top inset is non-zero on notched devices",
  ];
  return (
    <ul className="mt-6 space-y-2 text-sm">
      {items.map((it) => (
        <li key={it} className="flex items-start gap-2">
          <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-gold" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
