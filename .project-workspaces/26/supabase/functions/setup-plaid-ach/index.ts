import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SETUP-PLAID-ACH] ${step}${detailsStr}`);
};

const PLAID_ENV = "development";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const PLAID_CLIENT_ID = Deno.env.get("PLAID_CLIENT_ID");
    const PLAID_SECRET = Deno.env.get("PLAID_SECRET");
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      throw new Error("Plaid is not configured");
    }
    
    if (!STRIPE_SECRET_KEY) {
      throw new Error("Stripe is not configured");
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");
    
    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    const { action, plaid_item_id, account_id, display_name, set_as_default } = await req.json();
    const plaidBaseUrl = `https://${PLAID_ENV}.plaid.com`;

    if (action === "create_link_token_for_ach") {
      // Create a link token specifically for ACH/payment initiation
      const response = await fetch(`${plaidBaseUrl}/link/token/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          user: { client_user_id: user.id },
          client_name: "CoinsBloom",
          products: ["auth", "transactions"],
          country_codes: ["US"],
          language: "en",
        }),
      });

      const data = await response.json();
      
      if (data.error_code) {
        throw new Error(data.error_message || "Failed to create link token");
      }

      logStep("ACH Link token created");
      return new Response(JSON.stringify({ link_token: data.link_token }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "setup_ach_payment") {
      if (!plaid_item_id || !account_id) {
        throw new Error("plaid_item_id and account_id are required");
      }

      // Get the plaid item to verify ownership
      const { data: plaidItem, error: plaidError } = await supabaseClient
        .from("plaid_items")
        .select("*")
        .eq("id", plaid_item_id)
        .eq("user_id", user.id)
        .single();

      if (plaidError || !plaidItem) {
        throw new Error("Plaid item not found");
      }

      // Get user profile for email and existing stripe customer
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("email, stripe_customer_id")
        .eq("id", user.id)
        .single();

      if (!profile?.email) {
        throw new Error("User email not found");
      }

      // Get the access token from vault
      const { data: accessToken } = await supabaseClient.rpc('get_plaid_token', { 
        p_plaid_item_id: plaid_item_id 
      });

      if (!accessToken || accessToken === 'ENCRYPTED_IN_VAULT') {
        throw new Error("Could not retrieve Plaid access token");
      }

      // Create a Stripe bank account token from Plaid
      const processorResponse = await fetch(`${plaidBaseUrl}/processor/stripe/bank_account_token/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          access_token: accessToken,
          account_id: account_id,
        }),
      });

      const processorData = await processorResponse.json();
      
      if (processorData.error_code) {
        throw new Error(processorData.error_message || "Failed to create processor token");
      }

      const stripeBankAccountToken = processorData.stripe_bank_account_token;
      logStep("Stripe bank account token created", { hasToken: !!stripeBankAccountToken });

      // Get or create Stripe customer
      let stripeCustomerId = profile.stripe_customer_id;
      
      if (!stripeCustomerId) {
        // Check if customer exists in Stripe
        const customers = await stripe.customers.list({ email: profile.email, limit: 1 });
        
        if (customers.data.length > 0) {
          stripeCustomerId = customers.data[0].id;
        } else {
          // Create new customer
          const customer = await stripe.customers.create({
            email: profile.email,
            metadata: { supabase_user_id: user.id },
          });
          stripeCustomerId = customer.id;
        }

        // Update profile with customer ID
        await supabaseClient
          .from("profiles")
          .update({ stripe_customer_id: stripeCustomerId })
          .eq("id", user.id);
        
        logStep("Stripe customer created/found", { customerId: stripeCustomerId });
      }

      // Attach the bank account token to the customer
      // This creates a bank account source on the customer
      const bankAccount = await stripe.customers.createSource(stripeCustomerId, {
        source: stripeBankAccountToken,
      });

      logStep("Bank account attached to customer", { 
        bankAccountId: bankAccount.id,
        type: bankAccount.object
      });

      // Create a PaymentMethod from the bank account for future payments
      // Note: For ACH Direct Debit, we use SetupIntent to properly configure the payment method
      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomerId,
        payment_method_types: ['us_bank_account'],
        payment_method_data: {
          type: 'us_bank_account',
          billing_details: {
            email: profile.email,
          },
        },
        // Use the bank account we just attached
        mandate_data: {
          customer_acceptance: {
            type: 'offline',
          },
        },
      });

      // For Plaid-verified accounts, we can confirm immediately since Plaid handles verification
      // However, the proper flow is to use the attached bank account source directly
      // Store the bank account ID for use in payments
      
      // Get account details for display
      const accountsResponse = await fetch(`${plaidBaseUrl}/accounts/get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          access_token: accessToken,
          options: { account_ids: [account_id] },
        }),
      });

      const accountsData = await accountsResponse.json();
      const account = accountsData.accounts?.[0];

      // If set as default, update other methods
      if (set_as_default) {
        await supabaseClient
          .from("user_autopay_methods")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      // Save to database with the Stripe bank account ID as the payment method
      // For ACH payments, we'll use the bank account source ID
      const { data: savedMethod, error: saveError } = await supabaseClient
        .from("user_autopay_methods")
        .insert({
          user_id: user.id,
          method_type: "plaid_ach",
          stripe_customer_id: stripeCustomerId,
          stripe_payment_method_id: bankAccount.id, // Store bank account ID for payments
          plaid_item_id: plaid_item_id,
          plaid_processor_token: stripeBankAccountToken, // Keep for reference
          plaid_account_id: account_id,
          display_name: display_name || `${plaidItem.institution_name} ****${account?.mask || ''}`,
          last_four: account?.mask,
          bank_name: plaidItem.institution_name,
          is_default: set_as_default || false,
          is_verified: true, // Plaid handles verification
        })
        .select()
        .single();

      if (saveError) throw saveError;

      logStep("ACH payment method saved", { 
        methodId: savedMethod.id,
        stripeCustomerId,
        bankAccountId: bankAccount.id
      });

      return new Response(JSON.stringify({
        success: true,
        payment_method: savedMethod,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_linked_accounts") {
      // Get all linked Plaid items for the user
      const { data: plaidItems, error: plaidError } = await supabaseClient
        .from("plaid_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (plaidError) throw plaidError;

      const accounts = [];

      for (const item of plaidItems || []) {
        const { data: accessToken } = await supabaseClient.rpc('get_plaid_token', { 
          p_plaid_item_id: item.id 
        });

        if (!accessToken || accessToken === 'ENCRYPTED_IN_VAULT') continue;

        // Get accounts for this item
        const accountsResponse = await fetch(`${plaidBaseUrl}/accounts/get`, {
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
            // Only include checking and savings accounts for ACH
            if (acc.type === "depository") {
              accounts.push({
                plaid_item_id: item.id,
                account_id: acc.account_id,
                name: acc.name,
                official_name: acc.official_name,
                mask: acc.mask,
                type: acc.type,
                subtype: acc.subtype,
                institution_name: item.institution_name,
              });
            }
          }
        }
      }

      return new Response(JSON.stringify({ accounts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
