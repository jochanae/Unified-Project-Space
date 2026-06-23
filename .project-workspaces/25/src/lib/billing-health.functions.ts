import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const STRIPE_API = "https://api.stripe.com/v1";

const REQUIRED_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
] as const;

export type BillingHealth = {
  endpoint: {
    expectedUrl: string;
    found: boolean;
    enabled: boolean | null;
    listensTo: string[];
    missingEvents: string[];
    livemode: boolean | null;
    error: string | null;
  };
  events7d: {
    total: number;
    processed: number;
    failed: number;
    lastReceivedAt: string | null;
  };
};

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Admin access required");
}

export const getBillingHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BillingHealth> => {
    await assertAdmin(context.userId);

    const supabaseUrl = process.env.SUPABASE_URL ?? "";
    const expectedUrl = `${supabaseUrl}/functions/v1/stripe-webhook`;

    // 1. Stripe endpoint check
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    let endpoint: BillingHealth["endpoint"] = {
      expectedUrl,
      found: false,
      enabled: null,
      listensTo: [],
      missingEvents: [...REQUIRED_EVENTS],
      livemode: null,
      error: null,
    };

    if (!stripeKey) {
      endpoint.error = "STRIPE_SECRET_KEY is not set on the server.";
    } else {
      try {
        const res = await fetch(`${STRIPE_API}/webhook_endpoints?limit=100`, {
          headers: { Authorization: `Bearer ${stripeKey}` },
        });
        if (!res.ok) {
          endpoint.error = `Stripe API error (${res.status}).`;
        } else {
          const json = (await res.json()) as {
            data: Array<{
              url: string;
              status: string;
              enabled_events: string[];
              livemode: boolean;
            }>;
          };
          const match = json.data.find((e) => e.url === expectedUrl);
          if (match) {
            endpoint = {
              expectedUrl,
              found: true,
              enabled: match.status === "enabled",
              listensTo: match.enabled_events,
              missingEvents: REQUIRED_EVENTS.filter(
                (req) => !match.enabled_events.includes(req) && !match.enabled_events.includes("*"),
              ),
              livemode: match.livemode,
              error: null,
            };
          }
        }
      } catch (err) {
        endpoint.error = `Could not reach Stripe: ${(err as Error).message}`;
      }
    }

    // 2. Webhook events in last 7 days
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { data: rows } = await supabaseAdmin
      .from("webhook_events")
      .select("status, received_at")
      .gte("received_at", since)
      .order("received_at", { ascending: false });

    const list = rows ?? [];
    const events7d = {
      total: list.length,
      processed: list.filter((r) => r.status === "processed").length,
      failed: list.filter((r) => r.status === "failed").length,
      lastReceivedAt: list[0]?.received_at ?? null,
    };

    return { endpoint, events7d };
  });
