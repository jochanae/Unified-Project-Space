/**
 * /__dev/blueprint — admin-only static preview of the Scriptural Blueprint card.
 *
 * Gating: dev mode OR admin role. Non-admin authenticated users hit a 404.
 * No AI, no persistence — sample data only. Once approved, this component
 * becomes a building block for the real blueprint flow.
 */

import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ScripturalBlueprint, SAMPLE_BLUEPRINT } from "@/components/blueprint/ScripturalBlueprint";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";

export const Route = createFileRoute("/__dev/blueprint")({
  beforeLoad: () => {
    // In production builds, only mount when dev OR signed-in admin (checked
    // client-side below). We don't 404 here so admins can preview in prod.
  },
  head: () => ({
    meta: [
      { title: "Blueprint Preview (admin)" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BlueprintPreviewPage,
});

function BlueprintPreviewPage() {
  const { user, isReady } = useAuth();
  const { hasRole, loading: rolesLoading } = useRoles(user?.id);
  const isDev = import.meta.env.DEV;
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isReady || rolesLoading) return;
    if (isDev || hasRole("admin")) setAllowed(true);
    else setAllowed(false);
  }, [isReady, rolesLoading, isDev, hasRole]);

  if (allowed === null) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <LoadingSpinner context="section" />
      </div>
    );
  }
  if (allowed === false) throw notFound();

  return (
    <div className="min-h-screen bg-background">
      {/* Page-level technical grid backdrop — same primitive as the card */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, var(--gold) 0 1px, transparent 1px 48px),
            repeating-linear-gradient(90deg, var(--gold) 0 1px, transparent 1px 48px)
          `,
        }}
      />
      <div className="relative max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        <header className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.25em] text-gold/70">
            Dev Preview · Admin Only
          </p>
          <h1 className="font-display text-3xl text-foreground">Scriptural Blueprint</h1>
          <p className="text-sm text-muted-foreground max-w-prose">
            Static shell for review. Theme-adaptive (toggle Sanctum/Patriarch from the avatar menu).
            Data shape mirrors the planned{" "}
            <code className="text-gold/80">vault_items.item_type = "blueprint"</code> payload.
          </p>
          <div className="pt-1">
            <Link
              to="/"
              className="text-xs text-gold/70 hover:text-gold underline-offset-4 hover:underline"
            >
              ← Back to home
            </Link>
          </div>
        </header>

        <ScripturalBlueprint
          data={SAMPLE_BLUEPRINT}
          onCopy={() => {
            navigator.clipboard?.writeText(
              `${SAMPLE_BLUEPRINT.reference} (${SAMPLE_BLUEPRINT.version})\n\n${SAMPLE_BLUEPRINT.passageText}`,
            );
            toast.success("Passage copied");
          }}
          onShare={() => toast.info("Share — wired in next pass")}
          onDeepDive={(seed) => toast.info(seed ? `Deep Dive: ${seed}` : "Deep Dive on passage")}
        />
      </div>
    </div>
  );
}
