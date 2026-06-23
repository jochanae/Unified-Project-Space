import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();
    const results = {
      scheduledPosts: 0,
      discussionPrompts: 0,
      errors: [] as string[],
    };

    // 1. Process scheduled posts
    const { data: pendingPosts, error: postsError } = await supabase
      .from("scheduled_posts")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", now);

    if (postsError) {
      results.errors.push(`Failed to fetch posts: ${postsError.message}`);
    } else if (pendingPosts && pendingPosts.length > 0) {
      for (const post of pendingPosts) {
        try {
          // Publish based on post type
          if (post.post_type === "trade_idea") {
            const { error } = await supabase.from("trade_ideas").insert({
              user_id: post.created_by,
              symbol: post.symbol || "N/A",
              title: post.title || "Trade Idea",
              content: post.content,
              trade_direction: post.trade_direction || "neutral",
              asset_class: post.asset_class || "stocks",
              entry_price: post.entry_price,
              target_price: post.target_price,
              stop_loss: post.stop_loss,
            });
            if (error) throw error;
          } else if (post.post_type === "discussion") {
            const { error } = await supabase.from("discussion_threads").insert({
              user_id: post.created_by,
              title: post.title || "Discussion",
              content: post.content,
              category: post.category || "general",
              tags: post.tags || [],
            });
            if (error) throw error;
          } else if (post.post_type === "chat_message" && post.room_id) {
            const { error } = await supabase.from("chat_messages").insert({
              user_id: post.created_by,
              room_id: post.room_id,
              content: post.content,
            });
            if (error) throw error;
          }

          // Mark as published
          await supabase
            .from("scheduled_posts")
            .update({ status: "published", published_at: now })
            .eq("id", post.id);

          results.scheduledPosts++;
        } catch (err: any) {
          // Mark as failed
          await supabase
            .from("scheduled_posts")
            .update({ status: "failed", error_message: err.message })
            .eq("id", post.id);

          results.errors.push(`Post ${post.id}: ${err.message}`);
        }
      }
    }

    // 2. Process discussion prompts
    const { data: duePrompts, error: promptsError } = await supabase
      .from("discussion_prompts")
      .select("*")
      .eq("is_active", true)
      .or(`next_post_at.is.null,next_post_at.lte.${now}`);

    if (promptsError) {
      results.errors.push(`Failed to fetch prompts: ${promptsError.message}`);
    } else if (duePrompts && duePrompts.length > 0) {
      for (const prompt of duePrompts) {
        try {
          // Check if we should post based on frequency
          const shouldPost = shouldPublishPrompt(prompt, new Date());

          if (shouldPost) {
            // Get a system user or the creator for posting
            const { error } = await supabase.from("discussion_threads").insert({
              user_id: prompt.created_by,
              title: prompt.title,
              content: prompt.content,
              category: prompt.category,
              tags: prompt.tags || [],
            });

            if (error) throw error;

            // Update last posted and calculate next
            const nextPostAt = calculateNextPostAt(prompt);
            await supabase
              .from("discussion_prompts")
              .update({ 
                last_posted_at: now, 
                next_post_at: nextPostAt 
              })
              .eq("id", prompt.id);

            results.discussionPrompts++;
          }
        } catch (err: any) {
          results.errors.push(`Prompt ${prompt.id}: ${err.message}`);
        }
      }
    }

    // 3. Process bot replies for quiet threads
    const { data: botTemplates } = await supabase
      .from("bot_reply_templates")
      .select("*")
      .eq("is_active", true)
      .eq("trigger_type", "quiet_thread");

    if (botTemplates && botTemplates.length > 0) {
      for (const template of botTemplates) {
        const hoursAgo = new Date();
        hoursAgo.setHours(hoursAgo.getHours() - (template.min_hours_quiet || 24));

        // Find quiet threads
        const { data: quietThreads } = await supabase
          .from("discussion_threads")
          .select("id, user_id")
          .lt("last_activity_at", hoursAgo.toISOString())
          .eq("is_locked", false)
          .limit(5);

        if (quietThreads && quietThreads.length > 0) {
          for (const thread of quietThreads) {
            try {
              // Pick a random reply
              const randomReply =
                template.reply_templates[
                  Math.floor(Math.random() * template.reply_templates.length)
                ];

              // Post the reply (using template creator as the bot user)
              const { error } = await supabase.from("discussion_replies").insert({
                thread_id: thread.id,
                user_id: template.created_by,
                content: randomReply,
              });

              if (error) throw error;

              // Update thread activity
              await supabase
                .from("discussion_threads")
                .update({ 
                  last_activity_at: now,
                  replies_count: supabase.rpc("increment", { row_id: thread.id })
                })
                .eq("id", thread.id);
            } catch (err: any) {
              results.errors.push(`Bot reply: ${err.message}`);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        published: results.scheduledPosts,
        prompts: results.discussionPrompts,
        errors: results.errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in publish-scheduled:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

function shouldPublishPrompt(prompt: any, now: Date): boolean {
  // If never posted, should post
  if (!prompt.last_posted_at) return true;

  const lastPosted = new Date(prompt.last_posted_at);
  const hoursDiff = (now.getTime() - lastPosted.getTime()) / (1000 * 60 * 60);

  switch (prompt.frequency) {
    case "daily":
      return hoursDiff >= 24;
    case "weekly":
      if (hoursDiff < 168) return false; // Less than 7 days
      return prompt.day_of_week === now.getDay();
    case "monthly":
      if (hoursDiff < 672) return false; // Less than 28 days
      return prompt.day_of_month === now.getDate();
    default:
      return false;
  }
}

function calculateNextPostAt(prompt: any): string {
  const now = new Date();
  const [hours, minutes] = (prompt.time_of_day || "09:00").split(":");

  switch (prompt.frequency) {
    case "daily": {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return next.toISOString();
    }
    case "weekly": {
      const next = new Date(now);
      const daysUntil = ((prompt.day_of_week || 1) - now.getDay() + 7) % 7 || 7;
      next.setDate(next.getDate() + daysUntil);
      next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return next.toISOString();
    }
    case "monthly": {
      const next = new Date(now);
      next.setMonth(next.getMonth() + 1);
      next.setDate(prompt.day_of_month || 1);
      next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return next.toISOString();
    }
    default:
      return now.toISOString();
  }
}
