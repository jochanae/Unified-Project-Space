import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { NotificationsProvider } from "@/hooks/useNotifications";
import { useAdminErrorLogger } from "@/hooks/useAdminErrorLogger";
import { IosStandaloneWelcome } from "@/components/IosStandaloneWelcome";
import { UpdatePromptHost } from "@/components/layout/UpdatePromptHost";
import { QuickSearchProvider } from "@/components/QuickSearchProvider";
import { DailyWordProvider } from "@/components/reader/DailyWordProvider";
import { LoginToast } from "@/components/auth/LoginToast";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      // Browser chrome tint (Android Chrome + Safari 15+)
      {
        name: "theme-color",
        content: "#000000",
        media: "(prefers-color-scheme: dark)",
      },
      {
        name: "theme-color",
        content: "#000000",
        media: "(prefers-color-scheme: light)",
      },
      // iOS — install + standalone behavior
      { name: "mobile-web-app-capable", content: "yes" }, // modern (replaces apple-mobile-web-app-capable)
      { name: "apple-mobile-web-app-capable", content: "yes" }, // legacy iOS fallback
      // black-translucent: content draws behind the status bar (matches obsidian bg)
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "SanctumIQ" },
      // Stop iOS from auto-linking phone numbers / dates / addresses
      { name: "format-detection", content: "telephone=no, date=no, address=no, email=no" },
      { title: "SanctumIQ — A Private Sanctuary for Ministry and Study" },
      {
        name: "description",
        content:
          "Read scripture, reflect, and prepare in a quiet space free from ads, noise, and interruption. Built by Into Innovations, LLC.",
      },
      { name: "author", content: "Into Innovations, LLC" },
      { property: "og:title", content: "SanctumIQ — A Private Sanctuary for Ministry and Study" },
      {
        property: "og:description",
        content:
          "Read scripture, reflect, and prepare in a quiet space free from ads, noise, and interruption. Built by Into Innovations, LLC.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@intoinnovations" },
      { name: "twitter:title", content: "SanctumIQ — A Private Sanctuary for Ministry and Study" },
      {
        name: "twitter:description",
        content:
          "Read scripture, reflect, and prepare in a quiet space free from ads, noise, and interruption. Built by Into Innovations, LLC.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f96f6400-a72b-48ca-991d-63ef1e65f4eb/id-preview-2483519f--e78bbb7e-ee53-4e2d-86c8-65009c23f5d3.lovable.app-1776744705889.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f96f6400-a72b-48ca-991d-63ef1e65f4eb/id-preview-2483519f--e78bbb7e-ee53-4e2d-86c8-65009c23f5d3.lovable.app-1776744705889.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/sanctum-seal.svg" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      // Supabase — preconnect shaves ~50-100ms off the first auth/data call
      { rel: "preconnect", href: "https://ovngiqcvbygeyzcmxlqr.supabase.co" },
      { rel: "dns-prefetch", href: "https://ovngiqcvbygeyzcmxlqr.supabase.co" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useAdminErrorLogger({ source: "client-window", route: "app-shell" });

  return (
    <AuthProvider>
      <NotificationsProvider>
        <QuickSearchProvider>
          <DailyWordProvider>
            <Outlet />
            <Toaster />
            <LoginToast />
            <IosStandaloneWelcome />
            <UpdatePromptHost />
          </DailyWordProvider>
        </QuickSearchProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
}
