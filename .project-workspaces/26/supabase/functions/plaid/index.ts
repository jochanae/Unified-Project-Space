import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Determine Plaid environment from secret, with fallback
// Note: development.plaid.com was discontinued by Plaid - use sandbox or production
const PLAID_ENV = (() => {
  const raw = (Deno.env.get("PLAID_ENV") || "production").trim().toLowerCase();
  if (raw === "sandbox" || raw === "production") return raw;
  // Development was deprecated - map to production for real bank access
  if (raw === "development") return "production";
  console.warn(`PLAID_ENV value '${raw.substring(0, 20)}...' is invalid, defaulting to 'production'`);
  return "production";
})();

// Retry wrapper for fetch calls to handle transient DNS/network issues
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (e) {
      if (i === retries - 1) throw e;
      console.warn(`Fetch attempt ${i + 1} failed for ${url}, retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      delay *= 2; // exponential backoff
    }
  }
  throw new Error("Unreachable");
}

// Allowed action types for validation
const ALLOWED_ACTIONS = ["create_link_token", "exchange_token", "sync_accounts", "sync_all_accounts", "sync_transactions", "migrate_tokens"];

// Helper function to get decrypted Plaid token from vault
async function getPlaidToken(supabase: any, plaidItemId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_plaid_token', { p_plaid_item_id: plaidItemId });
  if (error) {
    console.error("Error getting Plaid token from vault:", error);
    return null;
  }
  return data;
}

// Helper function to store Plaid token in vault
async function storePlaidToken(supabase: any, plaidItemId: string, accessToken: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('store_plaid_token', { 
    p_plaid_item_id: plaidItemId,
    p_access_token: accessToken
  });
  if (error) {
    console.error("Error storing Plaid token in vault:", error);
    return null;
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PLAID_CLIENT_ID = Deno.env.get("PLAID_CLIENT_ID");
    const PLAID_SECRET = Deno.env.get("PLAID_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Debug: log credential presence and lengths (not values)
    console.log(`Plaid credentials check: CLIENT_ID length=${PLAID_CLIENT_ID?.length || 0}, SECRET length=${PLAID_SECRET?.length || 0}, ENV=${PLAID_ENV}`);

    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      console.error("Plaid credentials not configured");
      return new Response(
        JSON.stringify({ error: "Plaid is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const plaidBaseUrl = `https://${PLAID_ENV}.plaid.com`;
    console.log(`Plaid environment: ${PLAID_ENV} (${plaidBaseUrl})`);
    
    const body = await req.json();
    const { action, public_token, account_ids } = body;
    
    // Input validation for action
    if (!action || typeof action !== 'string' || !ALLOWED_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle migration of existing tokens to vault (admin only, requires cron secret)
    if (action === "migrate_tokens") {
      const cronSecret = req.headers.get("x-cron-secret");
      if (cronSecret !== Deno.env.get("CRON_SECRET")) {
        console.error("Unauthorized: Invalid or missing cron secret for migrate_tokens");
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log("Starting migration of Plaid tokens to vault");
      const { data: migratedCount, error } = await supabase.rpc('migrate_plaid_tokens_to_vault');
      
      if (error) {
        console.error("Error migrating tokens:", error);
        return new Response(
          JSON.stringify({ error: "Migration failed", details: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log(`Migrated ${migratedCount} tokens to vault`);
      return new Response(
        JSON.stringify({ success: true, tokens_migrated: migratedCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle cron job sync for all users (requires cron secret)
    if (action === "sync_all_accounts") {
      // Authenticate with cron secret
      const cronSecret = req.headers.get("x-cron-secret");
      if (cronSecret !== Deno.env.get("CRON_SECRET")) {
        console.error("Unauthorized: Invalid or missing cron secret for sync_all_accounts");
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log("Starting scheduled sync for all users");
      
      const { data: plaidItems } = await supabase
        .from("plaid_items")
        .select("*")
        .eq("status", "active");

      if (!plaidItems || plaidItems.length === 0) {
        console.log("No active Plaid items to sync");
        return new Response(
          JSON.stringify({ message: "No accounts to sync" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Group items by user to track per-user sync results
      const userResults: Record<string, { synced: number; errors: string[] }> = {};

      for (const item of plaidItems) {
        if (!userResults[item.user_id]) {
          userResults[item.user_id] = { synced: 0, errors: [] };
        }

        try {
          // Get decrypted access token from vault
          const accessToken = await getPlaidToken(supabase, item.id);
          if (!accessToken || accessToken === 'ENCRYPTED_IN_VAULT') {
            console.error(`No valid token for item ${item.id}`);
            userResults[item.user_id].errors.push("Token retrieval failed");
            continue;
          }

          const accountsResponse = await fetchWithRetry(`${plaidBaseUrl}/accounts/get`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client_id: PLAID_CLIENT_ID,
              secret: PLAID_SECRET,
              access_token: accessToken,
            }),
          });

          const accountsData = await accountsResponse.json();

          if (accountsData.error_code) {
            userResults[item.user_id].errors.push(accountsData.error_message || "Plaid API error");
            continue;
          }

          if (accountsData.accounts) {
            for (const acc of accountsData.accounts) {
              const { error } = await supabase
                .from("accounts")
                .update({ balance: Math.abs(acc.balances?.current || 0) })
                .eq("plaid_account_id", acc.account_id)
                .eq("user_id", item.user_id);

              if (!error) userResults[item.user_id].synced++;
            }
          }
        } catch (err) {
          userResults[item.user_id].errors.push(err instanceof Error ? err.message : "Unknown error");
        }
      }

      // Log sync history and send notifications for each user
      let totalSynced = 0;
      for (const [userId, result] of Object.entries(userResults)) {
        totalSynced += result.synced;
        const status = result.errors.length > 0 ? "error" : "success";
        const errorMessage = result.errors.length > 0 ? result.errors.join("; ") : null;

        // Log to sync_history
        await supabase.from("sync_history").insert({
          user_id: userId,
          sync_type: "scheduled",
          accounts_synced: result.synced,
          status: status,
          error_message: errorMessage,
        });

        // Send notification with cron secret
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/sync-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-cron-secret": Deno.env.get("CRON_SECRET") || "",
            },
            body: JSON.stringify({
              user_id: userId,
              sync_type: "scheduled",
              status: status,
              accounts_synced: result.synced,
              error_message: errorMessage,
            }),
          });
        } catch (notifError) {
          console.error("Failed to send sync notification:", notifError);
        }
      }

      console.log(`Scheduled sync completed: ${totalSynced} accounts updated across ${Object.keys(userResults).length} users`);
      return new Response(
        JSON.stringify({ success: true, accounts_synced: totalSynced, users_processed: Object.keys(userResults).length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For other actions, require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Plaid action: ${action} for user: ${user.id}`);

    if (action === "create_link_token") {
      // Create a link token for Plaid Link
      let response: Response;
      try {
        response = await fetchWithRetry(`${plaidBaseUrl}/link/token/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            user: { client_user_id: user.id },
            client_name: "CoinsBloom",
            products: ["transactions"],
            country_codes: ["US"],
            language: "en",
          }),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Plaid network error (create_link_token) [${plaidBaseUrl}]:`, msg);
        return new Response(
          JSON.stringify({ error: `Plaid network error. Please try again. (${PLAID_ENV})` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      
      if (data.error_code) {
        console.error("Plaid error:", data);
        return new Response(
          JSON.stringify({ error: data.error_message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Link token created successfully");
      return new Response(
        JSON.stringify({ link_token: data.link_token }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "exchange_token") {
      // Validate public_token
      if (!public_token || typeof public_token !== 'string') {
        return new Response(
          JSON.stringify({ error: "Invalid public_token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Exchange public token for access token
      let exchangeResponse: Response;
      try {
        exchangeResponse = await fetchWithRetry(`${plaidBaseUrl}/item/public_token/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            public_token,
          }),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Plaid network error (exchange_token) [${plaidBaseUrl}]:`, msg);
        return new Response(
          JSON.stringify({ error: `Plaid network error. Please try again. (${PLAID_ENV})` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const exchangeData = await exchangeResponse.json();
      
      if (exchangeData.error_code) {
        console.error("Plaid exchange error:", exchangeData);
        return new Response(
          JSON.stringify({ error: exchangeData.error_message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const accessToken = exchangeData.access_token;
      const itemId = exchangeData.item_id;

      // Get institution info
      const itemResponse = await fetchWithRetry(`${plaidBaseUrl}/item/get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          access_token: accessToken,
        }),
      });

      const itemData = await itemResponse.json();
      let institutionName = "Unknown Institution";
      let institutionId = null;

      if (itemData.item?.institution_id) {
        institutionId = itemData.item.institution_id;
        const instResponse = await fetchWithRetry(`${plaidBaseUrl}/institutions/get_by_id`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            institution_id: institutionId,
            country_codes: ["US"],
          }),
        });
        const instData = await instResponse.json();
        institutionName = instData.institution?.name || institutionName;
      }

      // Store Plaid item in database (with temporary placeholder for token)
      const { data: insertedItem, error: insertError } = await supabase
        .from("plaid_items")
        .insert({
          user_id: user.id,
          plaid_item_id: itemId,
          plaid_access_token: 'PENDING_VAULT_STORAGE', // Temporary placeholder
          institution_id: institutionId,
          institution_name: institutionName,
        })
        .select('id')
        .single();

      if (insertError || !insertedItem) {
        console.error("Error storing plaid item:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to store Plaid item" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Store the access token securely in vault - NO FALLBACK to plaintext
      const vaultSecretId = await storePlaidToken(supabase, insertedItem.id, accessToken);
      if (!vaultSecretId) {
        console.error("CRITICAL: Failed to store token in vault - cleaning up and aborting");
        // Delete the partially created plaid_item to maintain data integrity
        await supabase
          .from("plaid_items")
          .delete()
          .eq("id", insertedItem.id);
        
        return new Response(
          JSON.stringify({ error: "Failed to securely store credentials. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log(`Access token stored securely in vault with secret ID: ${vaultSecretId}`);

      // Get accounts using the access token
      const accountsResponse = await fetchWithRetry(`${plaidBaseUrl}/accounts/get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          access_token: accessToken,
        }),
      });

      const accountsData = await accountsResponse.json();
      console.log(`Found ${accountsData.accounts?.length || 0} accounts`);

      // Map Plaid account types to our types
      const typeMapping: Record<string, string> = {
        depository: "checking",
        credit: "credit_card",
        loan: "personal_loan",
        investment: "investment",
        mortgage: "mortgage",
      };

      const subtypeMapping: Record<string, string> = {
        checking: "checking",
        savings: "savings",
        "money market": "money_market",
        cd: "cd",
        "credit card": "credit_card",
        "401k": "retirement_401k",
        ira: "retirement_ira",
        roth: "retirement_roth",
        student: "student_loan",
        auto: "auto_loan",
        mortgage: "mortgage",
      };

      // Fetch existing manual accounts for this user to detect duplicates
      const { data: existingAccounts } = await supabase
        .from("accounts")
        .select("id, name, account_type, account_number_masked, plaid_account_id, institution")
        .eq("user_id", user.id);

      const accountsToInsert: any[] = [];
      let upgraded = 0;

      for (const acc of (accountsData.accounts || [])) {
        const subtype = subtypeMapping[acc.subtype?.toLowerCase()] || typeMapping[acc.type] || "other";
        const isLiability = ["credit", "loan", "mortgage"].includes(acc.type);
        const plaidName = (acc.name || acc.official_name || "").toLowerCase().trim();
        const plaidMask = acc.mask ? `••••${acc.mask}` : null;

        // Check if already linked via plaid_account_id (exact match — skip entirely)
        const alreadyLinked = existingAccounts?.find(
          (e) => e.plaid_account_id === acc.account_id
        );
        if (alreadyLinked) {
          // Just update balance on existing linked account
          await supabase.from("accounts")
            .update({ balance: Math.abs(acc.balances?.current || 0) })
            .eq("id", alreadyLinked.id);
          upgraded++;
          continue;
        }

        // Try to match a manual account by: same last-4 digits, or same name + account type
        const manualMatch = existingAccounts?.find((e) => {
          if (e.plaid_account_id && e.plaid_account_id !== "null") return false; // already linked to something else
          // Match by masked account number
          if (plaidMask && e.account_number_masked === plaidMask && e.account_type === subtype) return true;
          // Match by name similarity + type
          const existingName = (e.name || "").toLowerCase().trim();
          if (existingName === plaidName && e.account_type === subtype) return true;
          // Fuzzy: name contains or is contained
          if (existingName && plaidName && (existingName.includes(plaidName) || plaidName.includes(existingName)) && e.account_type === subtype) return true;
          return false;
        });

        if (manualMatch) {
          // Upgrade the existing manual account to Plaid-linked
          console.log(`Upgrading manual account "${manualMatch.name}" (${manualMatch.id}) to Plaid-linked`);
          await supabase.from("accounts")
            .update({
              plaid_account_id: acc.account_id,
              is_manual: false,
              balance: Math.abs(acc.balances?.current || 0),
              institution: institutionName,
              account_number_masked: plaidMask || manualMatch.account_number_masked,
            })
            .eq("id", manualMatch.id);
          upgraded++;
        } else {
          // No match found — insert as new
          accountsToInsert.push({
            user_id: user.id,
            name: acc.name || acc.official_name,
            institution: institutionName,
            account_number_masked: plaidMask,
            account_type: subtype,
            category: isLiability ? "liability" : "asset",
            balance: Math.abs(acc.balances?.current || 0),
            is_manual: false,
            plaid_account_id: acc.account_id,
          });
        }
      }

      if (accountsToInsert.length > 0) {
        const { error: accountsError } = await supabase.from("accounts").insert(accountsToInsert);
        if (accountsError) {
          console.error("Error inserting accounts:", accountsError);
        }
      }

      console.log(`Plaid sync: ${accountsToInsert.length} new, ${upgraded} upgraded/updated from ${institutionName}`);

      console.log(`Successfully linked ${accountsToInsert.length} accounts from ${institutionName} (token encrypted in vault)`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          accounts_linked: accountsToInsert.length + upgraded,
          accounts_new: accountsToInsert.length,
          accounts_upgraded: upgraded,
          institution: institutionName,
          encryption: "vault"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "sync_accounts") {
      // Sync balances for all linked accounts
      const { data: plaidItems } = await supabase
        .from("plaid_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (!plaidItems || plaidItems.length === 0) {
        return new Response(
          JSON.stringify({ message: "No linked accounts to sync" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let totalUpdated = 0;

      for (const item of plaidItems) {
        // Get decrypted access token from vault
        const accessToken = await getPlaidToken(supabase, item.id);
        if (!accessToken || accessToken === 'ENCRYPTED_IN_VAULT' || accessToken === 'PENDING_VAULT_STORAGE') {
          console.error(`No valid token for item ${item.id}`);
          continue;
        }

        const accountsResponse = await fetchWithRetry(`${plaidBaseUrl}/accounts/get`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            access_token: accessToken,
          }),
        });

        const accountsData = await accountsResponse.json();

        if (accountsData.accounts) {
          for (const acc of accountsData.accounts) {
            const { error } = await supabase
              .from("accounts")
              .update({ balance: Math.abs(acc.balances?.current || 0) })
              .eq("plaid_account_id", acc.account_id)
              .eq("user_id", user.id);

            if (!error) totalUpdated++;
          }
        }
      }

      console.log(`Synced ${totalUpdated} accounts`);
      return new Response(
        JSON.stringify({ success: true, accounts_synced: totalUpdated }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "sync_transactions") {
      // Sync transactions from all linked Plaid accounts
      const { data: plaidItems } = await supabase
        .from("plaid_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (!plaidItems || plaidItems.length === 0) {
        return new Response(
          JSON.stringify({ message: "No linked accounts to sync transactions from" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let totalTransactions = 0;
      const errors: string[] = [];

      for (const item of plaidItems) {
        // Get decrypted access token from vault
        const accessToken = await getPlaidToken(supabase, item.id);
        if (!accessToken || accessToken === 'ENCRYPTED_IN_VAULT' || accessToken === 'PENDING_VAULT_STORAGE') {
          console.error(`No valid token for item ${item.id}`);
          errors.push(`Token retrieval failed for ${item.institution_name}`);
          continue;
        }

        try {
          // Get transactions for the past 90 days
          const endDate = new Date().toISOString().split('T')[0];
          const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

          const transactionsResponse = await fetchWithRetry(`${plaidBaseUrl}/transactions/get`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client_id: PLAID_CLIENT_ID,
              secret: PLAID_SECRET,
              access_token: accessToken,
              start_date: startDate,
              end_date: endDate,
            }),
          });

          const transactionsData = await transactionsResponse.json();

          if (transactionsData.error_code) {
            console.error(`Plaid transactions error for ${item.institution_name}:`, transactionsData.error_message);
            errors.push(transactionsData.error_message || `Error fetching from ${item.institution_name}`);
            continue;
          }

          // Map Plaid categories to our categories
          const categoryMapping: Record<string, string> = {
            "FOOD_AND_DRINK": "food",
            "FOOD AND DRINK": "food",
            "GENERAL_MERCHANDISE": "shopping",
            "GENERAL MERCHANDISE": "shopping",
            "TRANSPORTATION": "transportation",
            "TRAVEL": "travel",
            "ENTERTAINMENT": "entertainment",
            "RECREATION": "entertainment",
            "RENT_AND_UTILITIES": "utilities",
            "RENT AND UTILITIES": "utilities",
            "LOAN_PAYMENTS": "debt",
            "LOAN PAYMENTS": "debt",
            "MEDICAL": "healthcare",
            "PERSONAL_CARE": "personal",
            "PERSONAL CARE": "personal",
            "GOVERNMENT_AND_NON_PROFIT": "other",
            "GOVERNMENT AND NON-PROFIT": "other",
            "TRANSFER_IN": "income",
            "TRANSFER IN": "income",
            "TRANSFER_OUT": "other",
            "TRANSFER OUT": "other",
            "INCOME": "salary",
            "BANK_FEES": "other",
            "BANK FEES": "other",
          };

          // Get existing Plaid transaction IDs to avoid duplicates
          const existingTxIds = new Set<string>();
          const { data: existingTxs } = await supabase
            .from("transactions")
            .select("plaid_transaction_id")
            .eq("user_id", user.id)
            .not("plaid_transaction_id", "is", null);
          
          (existingTxs || []).forEach((tx: any) => {
            if (tx.plaid_transaction_id) existingTxIds.add(tx.plaid_transaction_id);
          });

          // Prepare transactions to insert
          const transactionsToInsert = [];

          for (const tx of transactionsData.transactions || []) {
            // Skip if already exists
            if (existingTxIds.has(tx.transaction_id)) continue;

            // Determine category
            let category = "other";
            const primaryCategory = tx.personal_finance_category?.primary || tx.category?.[0] || "";
            const mappedCategory = categoryMapping[primaryCategory.toUpperCase()];
            if (mappedCategory) category = mappedCategory;

            // Determine type (income vs expense)
            const isIncome = tx.amount < 0 || 
              primaryCategory.toUpperCase().includes("INCOME") ||
              primaryCategory.toUpperCase().includes("TRANSFER_IN");
            
            transactionsToInsert.push({
              user_id: user.id,
              description: tx.name || tx.merchant_name || "Unknown",
              amount: Math.abs(tx.amount),
              type: isIncome ? "income" : "expense",
              category: category,
              transaction_date: tx.date,
              is_recurring: tx.personal_finance_category?.detailed?.includes("SUBSCRIPTION") || false,
              plaid_transaction_id: tx.transaction_id,
              notes: tx.merchant_name ? `Merchant: ${tx.merchant_name}` : null,
            });
          }

          // Insert new transactions in batches
          if (transactionsToInsert.length > 0) {
            const batchSize = 100;
            for (let i = 0; i < transactionsToInsert.length; i += batchSize) {
              const batch = transactionsToInsert.slice(i, i + batchSize);
              const { error: insertError } = await supabase.from("transactions").insert(batch);
              if (insertError) {
                console.error("Error inserting transactions batch:", insertError);
              }
            }
            totalTransactions += transactionsToInsert.length;
          }

          console.log(`Synced ${transactionsToInsert.length} transactions from ${item.institution_name}`);
        } catch (err) {
          console.error(`Error syncing transactions for ${item.institution_name}:`, err);
          errors.push(err instanceof Error ? err.message : "Unknown error");
        }
      }

      console.log(`Total transactions synced: ${totalTransactions}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          transactions_synced: totalTransactions,
          errors: errors.length > 0 ? errors : undefined
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Plaid edge function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
