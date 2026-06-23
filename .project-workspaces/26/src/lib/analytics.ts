/**
 * Lightweight analytics wrapper.
 *
 * Currently routes to Plausible (script loaded in index.html).
 * Designed so we can later dual-send to PostHog / Segment without
 * changing call sites — every event in the app should go through
 * trackEvent().
 *
 * Plausible custom events:
 *   window.plausible(eventName, { props: { ... } })
 *
 * Naming convention: snake_case, "<surface>_<action>"
 *   e.g. hero_cta_signup, demo_topic_selected, faq_expand
 */

type EventProps = Record<string, string | number | boolean | undefined | null>;

declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: { props?: EventProps; callback?: () => void }
    ) => void;
  }
}

const isProd = () => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    host === "coinsbloom.com" ||
    host === "www.coinsbloom.com" ||
    host === "coinsbloom.lovable.app"
  );
};

/**
 * Track a custom event.
 * Safe to call before Plausible script has loaded (it queues).
 */
export function trackEvent(name: string, props?: EventProps) {
  if (typeof window === "undefined") return;

  // Strip undefined / null props for cleaner Plausible UI
  let cleanProps: EventProps | undefined;
  if (props) {
    cleanProps = {};
    for (const [k, v] of Object.entries(props)) {
      if (v !== undefined && v !== null) cleanProps[k] = v;
    }
  }

  try {
    if (typeof window.plausible === "function") {
      window.plausible(name, cleanProps ? { props: cleanProps } : undefined);
    }
    // Dev-only echo so we can sanity-check while building
    if (!isProd() && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[analytics]", name, cleanProps ?? {});
    }
  } catch (err) {
    // Never let analytics break the app
    // eslint-disable-next-line no-console
    console.warn("[analytics] failed to track", name, err);
  }
}

/**
 * Track a manual pageview (Plausible auto-tracks SPA navigation when using
 * the default script, but if we ever swap to manual mode this is the hook).
 */
export function trackPageview(path?: string) {
  trackEvent("pageview", path ? { path } : undefined);
}
