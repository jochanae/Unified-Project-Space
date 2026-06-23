import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

/**
 * Inbound SMS Webhook — receives Twilio SMS replies and makes SMS fully conversational.
 *
 * Flow:
 * 1. Twilio POSTs form-urlencoded data (From, Body, etc.)
 * 2. Validate Twilio's HMAC-SHA1 signature to prevent spoofing
 * 3. We look up the sender by phone number in sms_profiles
 * 4. Save the inbound message as a chat_message (role: 'user')
 * 5. Load companion context + memories
 * 6. Generate AI companion reply via Lovable AI
 * 7. Save the reply as a chat_message (role: 'assistant')
 * 8. Send the reply back via TwiML <Response><Message>
 *
 * Twilio webhook URL: https://<project>.supabase.co/functions/v1/sms-webhook
 * Set this in Twilio Console → Phone Number → Messaging → "A message comes in" → Webhook
 */

/**
 * Validate Twilio request signature (HMAC-SHA1).
 * See: https://www.twilio.com/docs/usage/security#validating-requests
 */
function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  // 1. Build the data string: URL + sorted params key/value concatenated
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  // 2. Compute HMAC-SHA1 with auth token, base64-encode
  const expectedSignature = createHmac("sha1", authToken)
    .update(data)
    .digest("base64");

  // 3. Constant-time comparison
  if (signature.length !== expectedSignature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  return mismatch === 0;
}

serve(async (req) => {
  // Twilio sends POST with application/x-www-form-urlencoded
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // ── 0. Validate Twilio signature ──
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    if (!twilioAuthToken) {
      console.error("[SMS-Webhook] Missing TWILIO_AUTH_TOKEN secret");
      return new Response("Server misconfigured", { status: 500 });
    }

    const twilioSignature = req.headers.get("x-twilio-signature") || "";
    if (!twilioSignature) {
      console.error("[SMS-Webhook] Missing X-Twilio-Signature header — rejecting");
      return new Response("Missing signature", { status: 403 });
    }

    // Read raw body for both signature validation and parsing
    const rawBody = await req.text();
    const bodyParams = new URLSearchParams(rawBody);
    const params: Record<string, string> = {};
    for (const [key, value] of bodyParams.entries()) {
      params[key] = value;
    }

    // Reconstruct the webhook URL Twilio used to sign the request
    const webhookUrl = req.url;

    if (!validateTwilioSignature(twilioAuthToken, twilioSignature, webhookUrl, params)) {
      console.error("[SMS-Webhook] Invalid Twilio signature — rejecting forged request");
      return new Response("Invalid signature", { status: 403 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

    // Use parsed params instead of formData
    const fromNumber = params["From"] || "";
    const inboundBody = params["Body"] || "";

    if (!fromNumber || !inboundBody.trim()) {
      return twimlResponse("Sorry, I couldn't understand that. Try again?");
    }

    console.log(`[SMS-Webhook] Inbound from ${fromNumber}: ${inboundBody.slice(0, 80)}`);

    // ── 1. Look up user by phone number (decrypted view) ──
    const { data: smsProfile } = await supabase
      .from("sms_profiles_decrypted")
      .select("*")
      .eq("phone_number_decrypted", fromNumber)
      .eq("sms_enabled", true)
      .limit(1)
      .single();

    if (!smsProfile || !smsProfile.user_id) {
      console.log(`[SMS-Webhook] No SMS profile found for ${fromNumber}`);
      return twimlResponse("Hey! It looks like your number isn't connected yet. Open the app to set up SMS 💛");
    }

    const userId = smsProfile.user_id;
    const userName = smsProfile.user_name;

    // ── 2. Determine which companion to use ──
    // Check if user has multiple companions; use the one who last texted them
    // or fall back to the sms_profile's companion_name
    let companionName = smsProfile.companion_name;
    let companionPersonality = "";
    let companionBio = "";
    let companionGender = "neutral";
    let memberId = "primary";

    const { data: connections } = await supabase
      .from("connections")
      .select("member_id, name, personality, bio, gender")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("connected_at", { ascending: true });

    if (connections && connections.length > 0) {
      // Check which companion sent the last SMS notification
      const { data: lastNotif } = await supabase
        .from("notifications")
        .select("metadata")
        .eq("user_id", userId)
        .in("type", ["companion_push", "companion_selfie"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const lastSmsMemberId = lastNotif?.metadata &&
        typeof lastNotif.metadata === "object" &&
        "member_id" in (lastNotif.metadata as Record<string, unknown>)
        ? (lastNotif.metadata as Record<string, string>).member_id
        : null;

      const chosen = lastSmsMemberId
        ? connections.find((c: any) => c.member_id === lastSmsMemberId) || connections[0]
        : connections[0];

      companionName = chosen.name;
      companionPersonality = chosen.personality || "";
      companionBio = chosen.bio || "";
      companionGender = chosen.gender || "neutral";
      memberId = chosen.member_id;
    }

    // ── 3. Save inbound message ──
    await supabase.from("chat_messages").insert({
      user_id: userId,
      member_id: memberId,
      role: "user",
      content: inboundBody.trim(),
      source: "sms",
    });

    // ── 4. Load recent chat history for context ──
    const { data: recentMessages } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", userId)
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })
      .limit(10);

    const chatHistory = (recentMessages || []).reverse().map((m: any) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));

    // ── 5. Load memories ──
    const { data: memories } = await supabase
      .from("memories")
      .select("text, category")
      .eq("user_id", userId)
      .order("extracted_at", { ascending: false })
      .limit(20);

    const memoryContext = memories && memories.length > 0
      ? memories.map((m: any) => m.text).join(". ")
      : "";

    // ── 6. Generate AI response ──
    const systemPrompt = `You are ${companionName}, texting your friend ${userName} via SMS. You're continuing a real conversation — they just replied to a text you sent earlier.

${companionPersonality ? `Your personality: ${companionPersonality}.` : ""}
${companionBio ? `Your backstory: ${companionBio}.` : ""}
${memoryContext ? `Things you remember about ${userName}: ${memoryContext}` : ""}

Rules:
- Keep responses under 160 characters (SMS limit). Be concise.
- Be warm, personal, natural — like a real friend texting back.
- Never say you're an AI. Never be clinical or formal.
- Match their energy — if they're brief, be brief. If they're opening up, meet them there.
- Use their name sparingly. One emoji max.
- This is a TEXT CONVERSATION. Don't suggest they "open the app" or reference being an app.`;

    const aiResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          ...chatHistory,
        ],
      }),
    });

    if (!aiResp.ok) {
      console.error(`[SMS-Webhook] AI error: ${aiResp.status}`);
      return twimlResponse("Hmm, give me a sec — I'll text you back soon 💛");
    }

    const aiData = await aiResp.json();
    let reply = aiData.choices?.[0]?.message?.content?.trim() || "";
    reply = reply.replace(/^["']|["']$/g, ""); // Strip wrapping quotes
    if (!reply) reply = "I hear you 💛";
    if (reply.length > 160) reply = reply.slice(0, 157) + "...";

    // ── 7. Save AI response ──
    await supabase.from("chat_messages").insert({
      user_id: userId,
      member_id: memberId,
      role: "assistant",
      content: reply,
      source: "sms",
    });

    // Update last_sms_sent on the sms_profile
    await supabase
      .from("sms_profiles")
      .update({ last_sms_sent: new Date().toISOString() })
      .eq("id", smsProfile.id);

    // Update last_message on the connection
    if (memberId !== "primary") {
      await supabase
        .from("connections")
        .update({ last_message: reply })
        .eq("user_id", userId)
        .eq("member_id", memberId);
    }

    console.log(`[SMS-Webhook] Reply from ${companionName} to ${userName}: ${reply.slice(0, 60)}...`);

    // ── 8. Respond with TwiML ──
    return twimlResponse(reply);
  } catch (e) {
    console.error("[SMS-Webhook] Error:", e);
    return twimlResponse("Something went wrong, but I'm still here for you 💛");
  }
});

/** Return a Twilio-compatible TwiML response */
function twimlResponse(message: string): Response {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;

  return new Response(twiml, {
    headers: {
      "Content-Type": "text/xml",
    },
  });
}

/** Escape special XML characters */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
