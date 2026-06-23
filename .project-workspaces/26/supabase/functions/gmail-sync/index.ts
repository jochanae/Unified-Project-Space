import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// Keywords that indicate a REAL bill (not just any email with money mentioned)
const BILL_KEYWORDS = [
  'bill is ready', 'bill available', 'bill due', 'payment due', 'amount due',
  'monthly bill', 'monthly statement', 'your statement is ready', 'pay by',
  'due date', 'autopay scheduled', 'automatic payment', 'account balance',
  'current charges', 'total amount due', 'minimum payment due',
  'utility bill', 'service charge', 'past due notice', 'payment reminder'
];

// Specific senders/domains that send bills (high confidence)
const BILL_SENDER_PATTERNS = [
  'billing', 'payments', 'invoicecloud', 'billpay', 'autopay',
  'utility', 'electric', 'power', 'water', 'sewer', 'trash', 'waste',
  'gas company', 'energy', 'municipal', 'city of', 'county of'
];

// Words that indicate this is NOT a bill (exclusion patterns)
const NON_BILL_PATTERNS = [
  'receipt', 'order confirmation', 'shipping', 'delivered', 'thank you for your order',
  'sale', 'discount', 'flash sale', 'deal', 'promo', 'coupon', 'off your next',
  'newsletter', 'daily', 'weekly digest', 'horoscope', 'news', 'update',
  'verification', 'verify your', 'confirm your email', 'welcome to',
  'account was updated', 'password', 'security alert', 'sign in'
];

// Category mapping - MUST match bill_category enum exactly!
const BILL_CATEGORIES: Record<string, string> = {
  'electric': 'utilities',
  'power': 'utilities',
  'energy': 'utilities',
  'gas': 'utilities', 
  'water': 'utilities',
  'sewer': 'utilities',
  'trash': 'utilities',
  'waste management': 'utilities',
  'sanitation': 'utilities',
  'internet': 'internet',
  'comcast': 'internet',
  'xfinity': 'internet',
  'spectrum': 'internet',
  'at&t': 'phone',
  'verizon': 'phone',
  't-mobile': 'phone',
  'sprint': 'phone',
  'netflix': 'streaming',
  'spotify': 'streaming',
  'hulu': 'streaming',
  'disney': 'streaming',
  'amazon prime': 'subscriptions',
  'subscription': 'subscriptions',
  'membership': 'subscriptions',
  'insurance': 'insurance',
  'geico': 'insurance',
  'state farm': 'insurance',
  'progressive': 'insurance',
  'allstate': 'insurance',
  'mortgage': 'mortgage',
  'home loan': 'mortgage',
  'rent': 'rent',
  'lease': 'rent',
  'property tax': 'property_tax',
  'credit card': 'credit_card',
  'chase': 'credit_card',
  'amex': 'credit_card',
  'american express': 'credit_card',
  'capital one': 'credit_card',
  'citi': 'credit_card',
  'discover': 'credit_card',
  'student loan': 'student_loan',
  'medical': 'medical',
  'healthcare': 'medical',
  'hospital': 'medical',
  'doctor': 'medical',
  'pharmacy': 'medical',
  'gym': 'gym',
  'fitness': 'gym',
  'car payment': 'loans',
  'auto loan': 'loans',
  'loan payment': 'loans'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Not authenticated');

    const supabaseClient = createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { action, pendingBillId } = await req.json();

    // Get Gmail connection (metadata only)
    const { data: connection } = await supabaseAdmin
      .from('gmail_connections')
      .select('id, user_id, gmail_address, is_active, expires_at')
      .eq('user_id', user.id)
      .single();

    if (!connection?.is_active) {
      throw new Error('Gmail not connected');
    }

    // Get decrypted tokens from vault via secure function
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .rpc('get_gmail_tokens_secure', { p_user_id: user.id });
    
    if (tokenError || !tokenData?.[0]) {
      throw new Error('Failed to retrieve Gmail tokens');
    }

    let accessToken = tokenData[0].access_token;
    const refreshToken = tokenData[0].refresh_token;

    // Refresh token if expired
    if (new Date(connection.expires_at) < new Date()) {
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });

      const tokens = await refreshResponse.json();
      if (!refreshResponse.ok) throw new Error('Failed to refresh token');

      accessToken = tokens.access_token;
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      // Update with new access token (trigger will auto-encrypt to vault)
      await supabaseAdmin
        .from('gmail_connections')
        .update({ 
          access_token: accessToken, 
          expires_at: expiresAt.toISOString(),
          access_token_vault_id: null  // Reset so trigger re-encrypts
        })
        .eq('user_id', user.id);
    }

    if (action === 'sync_bills') {
      // Search for bill-related emails from last 30 days - more specific query
      const billTerms = ['"bill is ready"', '"payment due"', '"amount due"', '"monthly statement"', '"pay by"', '"due date"'];
      const senderTerms = ['from:billing', 'from:payments', 'from:invoicecloud', 'from:autopay'];
      const query = `newer_than:30d (${billTerms.join(' OR ')} OR ${senderTerms.join(' OR ')})`;
      
      const searchResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const searchResult = await searchResponse.json();
      const messageIds = searchResult.messages?.map((m: any) => m.id) || [];

      let newBillsCount = 0;

      for (const messageId of messageIds.slice(0, 20)) { // Limit to 20 emails
        // Check if already processed
        const { data: existing } = await supabaseAdmin
          .from('pending_email_bills')
          .select('id')
          .eq('user_id', user.id)
          .eq('source_email_id', messageId)
          .single();

        if (existing) continue;

        // Get email details
        const msgResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const email = await msgResponse.json();
        const headers = email.payload?.headers || [];
        
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
        const from = headers.find((h: any) => h.name === 'From')?.value || '';
        const date = headers.find((h: any) => h.name === 'Date')?.value;

        // Extract text content
        let bodyText = '';
        if (email.payload?.body?.data) {
          bodyText = atob(email.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } else if (email.payload?.parts) {
          const textPart = email.payload.parts.find((p: any) => p.mimeType === 'text/plain');
          if (textPart?.body?.data) {
            bodyText = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          }
        }

        const combinedText = `${subject} ${from} ${bodyText}`.toLowerCase();
        
        // EXCLUSION CHECK: Skip if it matches non-bill patterns (receipts, newsletters, etc.)
        const isExcluded = NON_BILL_PATTERNS.some(pattern => combinedText.includes(pattern));
        if (isExcluded) continue;

        // Check if sender matches known bill sender patterns (high confidence)
        const fromLower = from.toLowerCase();
        const isBillSender = BILL_SENDER_PATTERNS.some(pattern => fromLower.includes(pattern));
        
        // Check if content matches bill keywords
        const hasBillKeyword = BILL_KEYWORDS.some(kw => combinedText.includes(kw));
        
        // Must either be from a known bill sender OR have strong bill keywords
        if (!isBillSender && !hasBillKeyword) continue;

        // Extract bill details
        const amountMatch = combinedText.match(/\$[\d,]+\.?\d{0,2}/);
        const amount = amountMatch ? parseFloat(amountMatch[0].replace(/[$,]/g, '')) : null;

        const dueDateMatch = combinedText.match(/due\s*(date)?[:\s]*([\w\s,]+\d{1,2})/i);
        const dueDate = dueDateMatch ? parseDate(dueDateMatch[2]) : null;

        // Detect category - must match bill_category enum!
        let category = 'other';
        for (const [keyword, cat] of Object.entries(BILL_CATEGORIES)) {
          if (combinedText.includes(keyword)) {
            category = cat;
            break;
          }
        }

        // Extract payee from sender
        const payeeMatch = from.match(/^([^<]+)/);
        const payee = payeeMatch ? payeeMatch[1].trim().replace(/"/g, '') : from;

        // Calculate confidence - higher for known bill senders
        let confidence = isBillSender ? 0.7 : 0.5;
        if (amount && amount > 0 && amount < 10000) confidence += 0.15; // Reasonable bill amount
        if (dueDate) confidence += 0.1;
        if (category !== 'other') confidence += 0.05;

        // Save pending bill
        await supabaseAdmin.from('pending_email_bills').insert({
          user_id: user.id,
          source_email_id: messageId,
          from_address: from,
          subject: subject.substring(0, 255),
          received_at: date ? new Date(date).toISOString() : null,
          detected_payee: payee.substring(0, 100),
          detected_amount: amount,
          detected_due_date: dueDate,
          detected_category: category,
          confidence_score: confidence,
          status: 'pending'
        });

        newBillsCount++;
      }

      // Update last sync time
      await supabaseAdmin
        .from('gmail_connections')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('user_id', user.id);

      // Send push notification if new bills found
      if (newBillsCount > 0) {
        await supabaseAdmin.functions.invoke('send-push-notification', {
          body: {
            userId: user.id,
            title: '📧 Bills Detected',
            body: `Found ${newBillsCount} potential bill${newBillsCount > 1 ? 's' : ''} in your email. Tap to review.`,
            data: { url: '/bills' }
          }
        });
      }

      return new Response(JSON.stringify({ newBillsCount }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'approve_bill') {
      if (!pendingBillId) throw new Error('Missing pendingBillId');

      // Get pending bill
      const { data: pending } = await supabaseAdmin
        .from('pending_email_bills')
        .select('*')
        .eq('id', pendingBillId)
        .eq('user_id', user.id)
        .single();

      if (!pending) throw new Error('Pending bill not found');

      // Create actual bill
      const { data: newBill, error: billError } = await supabaseClient
        .from('bills')
        .insert({
          user_id: user.id,
          name: pending.detected_payee,
          amount: pending.detected_amount || 0,
          category: pending.detected_category || 'other',
          due_date: pending.detected_due_date || new Date().toISOString().split('T')[0],
          frequency: 'monthly',
          is_recurring: true,
          reminder_enabled: true,
          reminder_days_before: 3,
          notes: `Imported from email: ${pending.subject}`
        })
        .select()
        .single();

      if (billError) throw billError;

      // Update pending bill status
      await supabaseAdmin
        .from('pending_email_bills')
        .update({ 
          status: 'approved', 
          approved_at: new Date().toISOString(),
          created_bill_id: newBill.id 
        })
        .eq('id', pendingBillId);

      return new Response(JSON.stringify({ bill: newBill }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error('Invalid action');

  } catch (error: unknown) {
    console.error('Gmail sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function parseDate(dateStr: string): string | null {
  try {
    const cleaned = dateStr.trim();
    const parsed = new Date(cleaned);
    if (isNaN(parsed.getTime())) return null;
    return parsed.toISOString().split('T')[0];
  } catch {
    return null;
  }
}
