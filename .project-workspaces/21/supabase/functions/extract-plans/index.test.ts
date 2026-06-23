import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const BASE_URL = `${SUPABASE_URL}/functions/v1/extract-plans`;

Deno.test("OPTIONS returns CORS headers", async () => {
  const res = await fetch(BASE_URL, { method: "OPTIONS" });
  assertEquals(res.status, 200);
  const origin = res.headers.get("access-control-allow-origin");
  assertEquals(origin, "*");
  await res.text();
});

Deno.test("Returns 401 for request with only anon key (no user JWT)", async () => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      userId: "00000000-0000-0000-0000-000000000000",
      memberId: "test-member",
      companionName: "TestBot",
      recentMessages: [],
    }),
  });
  // The function requires a valid user JWT, anon key should be rejected
  assertEquals(res.status, 401);
  const body = await res.json();
  assertExists(body.error);
});

Deno.test("Returns 401 for request without Authorization header", async () => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: "test",
      memberId: "test",
      recentMessages: [{ role: "user", content: "test" }],
    }),
  });
  assertEquals(res.status, 401);
  await res.text();
});
