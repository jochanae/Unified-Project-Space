import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Twilio signature validation
async function validateTwilioRequest(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): Promise<boolean> {
  // Sort params and create string
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  // Create HMAC-SHA1 signature
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

  return signature === expectedSignature;
}

// Match SMS transaction against unpaid bills
async function matchAgainstBills(
  supabase: any,
  userId: string,
  parsedTitle: string,
  parsedAmount: number,
  parsedCategory: string,
  transactionId: string,
  transactionDate: string
): Promise<{ matched: boolean; billName?: string; confidence?: string }> {
  try {
    // Get current month boundaries
    const today = new Date(transactionDate);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    // Fetch unpaid bills for this user in the current month
    const { data: unpaidBills, error } = await supabase
      .from('bills')
      .select('id, name, amount, category, due_date, status')
      .eq('user_id', userId)
      .in('status', ['pending', 'overdue'])
      .gte('due_date', monthStart)
      .lte('due_date', monthEnd);

    if (error || !unpaidBills || unpaidBills.length === 0) {
      return { matched: false };
    }

    // Normalize strings for comparison
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedTitle = normalize(parsedTitle);
    const smsWords = parsedTitle.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    let bestMatch: any = null;
    let bestConfidence = '';
    let bestReason = '';

    for (const bill of unpaidBills) {
      const normalizedBillName = normalize(bill.name);
      const billWords = bill.name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
      const amountMatch = Math.abs(Number(bill.amount) - parsedAmount) < 0.01;
      
      // Check name similarity
      const exactNameMatch = normalizedTitle.includes(normalizedBillName) || normalizedBillName.includes(normalizedTitle);
      const wordOverlap = smsWords.filter((w: string) => billWords.some((bw: string) => bw.includes(w) || w.includes(bw))).length;
      const hasWordOverlap = wordOverlap >= 1 && wordOverlap >= Math.min(billWords.length, smsWords.length) * 0.5;

      if (exactNameMatch && amountMatch) {
        // HIGH confidence: exact name + exact amount → auto-mark paid
        bestMatch = bill;
        bestConfidence = 'high';
        bestReason = `Exact name and amount match: "${bill.name}" = $${bill.amount}`;
        break; // Can't do better
      } else if (exactNameMatch || (hasWordOverlap && amountMatch)) {
        // MEDIUM confidence: name match OR (partial name + amount match)
        if (bestConfidence !== 'high') {
          bestMatch = bill;
          bestConfidence = 'medium';
          bestReason = exactNameMatch 
            ? `Name match: "${bill.name}" (amount differs: bill=$${bill.amount}, SMS=$${parsedAmount})`
            : `Amount match with partial name: "${bill.name}"`;
        }
      } else if (amountMatch && parsedCategory === bill.category) {
        // LOW confidence: same amount + same category
        if (!bestConfidence) {
          bestMatch = bill;
          bestConfidence = 'low';
          bestReason = `Same amount ($${bill.amount}) and category (${bill.category})`;
        }
      }
    }

    if (!bestMatch) return { matched: false };

    if (bestConfidence === 'high') {
      // Auto-mark the bill as paid
      const paidDate = transactionDate;
      
      await supabase
        .from('bills')
        .update({
          status: 'paid',
          last_paid_date: paidDate,
          scheduled_payment_date: null,
        })
        .eq('id', bestMatch.id);

      // Create bill_payments record
      await supabase
        .from('bill_payments')
        .insert({
          bill_id: bestMatch.id,
          user_id: userId,
          amount: parsedAmount,
          paid_date: paidDate,
          payment_method: 'sms',
          linked_transaction_id: transactionId,
          notes: `Auto-matched from SMS transaction`,
        });

      // Record the match for audit
      await supabase
        .from('sms_bill_matches')
        .insert({
          user_id: userId,
          transaction_id: transactionId,
          bill_id: bestMatch.id,
          confidence: 'high',
          match_reason: bestReason,
          status: 'confirmed',
          resolved_at: new Date().toISOString(),
        });

      console.log(`[SMS→Bill] HIGH confidence match: auto-paid "${bestMatch.name}"`);
      return { matched: true, billName: bestMatch.name, confidence: 'high' };
    } else {
      // Medium/Low confidence → save for user review
      await supabase
        .from('sms_bill_matches')
        .insert({
          user_id: userId,
          transaction_id: transactionId,
          bill_id: bestMatch.id,
          confidence: bestConfidence,
          match_reason: bestReason,
          status: 'pending',
        });

      console.log(`[SMS→Bill] ${bestConfidence.toUpperCase()} confidence match: "${bestMatch.name}" — pending review`);
      return { matched: false, billName: bestMatch.name, confidence: bestConfidence };
    }
  } catch (err) {
    console.error('[SMS→Bill] Matching error:', err);
    return { matched: false };
  }
}

// Parse SMS to extract transaction details using AI
async function parseTransactionFromSMS(messageBody: string): Promise<{
  amount: number;
  title: string;
  category: string;
  type: 'expense' | 'income';
}> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    // Fallback to simple regex parsing
    const amountMatch = messageBody.match(/\$?([\d,]+\.?\d*)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(",", "")) : 0;
    return {
      amount,
      title: "SMS Transaction",
      category: "other",
      type: "expense"
    };
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a financial transaction parser. Extract transaction details from SMS messages.
            
CATEGORIES (choose the most appropriate one):
- food: restaurants, cafes, coffee shops, groceries, dining, fast food (Starbucks, McDonald's, Chick-fil-A, Walmart groceries, etc.)
- transportation: gas, uber, lyft, parking, car maintenance, public transit
- shopping: retail stores, Amazon, clothing, electronics
- utilities: electric, water, gas, internet, phone bills
- entertainment: movies, concerts, streaming, games, sports
- healthcare: doctors, pharmacy, medical bills
- education: tuition, books, courses, school supplies
- housing: rent, mortgage, home repairs
- insurance: car, health, home, life insurance
- income: salary, refunds, deposits, payments received
- other: only use if nothing else fits

Always respond with a JSON object containing:
- amount: number (the transaction amount)
- title: string (brief description including merchant name, max 50 chars)
- category: string (one of the categories above - prefer specific over "other")
- type: "expense" or "income"

IMPORTANT: Starbucks, Dunkin, cafes, restaurants are ALWAYS "food" category.
If you cannot determine the amount, set it to 0.
If it's clearly a deposit, credit, or payment received, set type to "income".`
          },
          {
            role: "user",
            content: messageBody
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_transaction",
              description: "Parse the SMS and extract transaction details",
              parameters: {
                type: "object",
                properties: {
                  amount: { type: "number", description: "The transaction amount" },
                  title: { type: "string", description: "Brief description of the transaction" },
                  category: { 
                    type: "string", 
                    enum: ["food", "transportation", "shopping", "utilities", "entertainment", "healthcare", "education", "housing", "insurance", "other", "income"]
                  },
                  type: { type: "string", enum: ["expense", "income"] }
                },
                required: ["amount", "title", "category", "type"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "parse_transaction" } }
      }),
    });

    if (!response.ok) {
      console.error("AI API error:", await response.text());
      throw new Error("AI parsing failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      return JSON.parse(toolCall.function.arguments);
    }
    
    throw new Error("No tool call response");
  } catch (error) {
    console.error("AI parsing error:", error);
    // Fallback to simple parsing
    const amountMatch = messageBody.match(/\$?([\d,]+\.?\d*)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(",", "")) : 0;
    return {
      amount,
      title: "SMS Transaction",
      category: "other",
      type: "expense"
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!TWILIO_AUTH_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Parse form data from Twilio
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const { From: fromNumber, Body: messageBody, MessageSid } = params;

    console.log(`Received SMS from ${fromNumber}: ${messageBody}`);

    // Validate Twilio signature (optional but recommended)
    const twilioSignature = req.headers.get('X-Twilio-Signature');
    if (twilioSignature) {
      const url = `${SUPABASE_URL}/functions/v1/sms-webhook`;
      const isValid = await validateTwilioRequest(TWILIO_AUTH_TOKEN, twilioSignature, url, params);
      if (!isValid) {
        console.warn('Invalid Twilio signature, but continuing...');
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Normalize phone number (remove all non-digits except +)
    const normalizedPhone = fromNumber.replace(/[^\d+]/g, '');

    // Look up user by phone number
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, phone_verified')
      .eq('phone_number', normalizedPhone)
      .single();

    let logEntry: any = {
      from_number: fromNumber,
      message_body: messageBody,
      status: 'pending'
    };

    let responseMessage = '';

    if (profileError || !profile) {
      logEntry.status = 'failed';
      logEntry.error_message = 'Phone number not registered';
      responseMessage = "This phone number is not registered with CoinsBloom. Please add your phone number in Settings to track transactions via SMS.";
    } else if (!profile.phone_verified) {
      logEntry.status = 'failed';
      logEntry.error_message = 'Phone number not verified';
      logEntry.user_id = profile.id;
      responseMessage = "Your phone number is not verified. Please verify it in the CoinsBloom app.";
    } else {
      // Parse the transaction
      const parsed = await parseTransactionFromSMS(messageBody);
      
      logEntry.user_id = profile.id;
      logEntry.parsed_amount = parsed.amount;
      logEntry.parsed_title = parsed.title;
      logEntry.parsed_category = parsed.category;

      if (parsed.amount > 0) {
        // Check for a matching bill first to inherit properties
        let matchedBillIsRecurring = false;
        {
          const normalizeStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
          const normalizedTitle = normalizeStr(parsed.title);
          const { data: candidateBills } = await supabase
            .from('bills')
            .select('is_recurring, name, amount')
            .eq('user_id', profile.id)
            .in('status', ['pending', 'overdue']);
          
          if (candidateBills) {
            const match = candidateBills.find(b => {
              const normalizedName = normalizeStr(b.name);
              return (normalizedTitle.includes(normalizedName) || normalizedName.includes(normalizedTitle))
                && Math.abs(Number(b.amount) - parsed.amount) < 0.01;
            });
            if (match) matchedBillIsRecurring = match.is_recurring;
          }
        }

        // Create the transaction
        const { data: transaction, error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: profile.id,
            amount: parsed.amount,
            title: parsed.title,
            type: parsed.type,
            category: parsed.category,
            is_recurring: matchedBillIsRecurring,
            notes: `Via SMS: ${messageBody}`,
            transaction_date: new Date().toISOString().split('T')[0]
          })
          .select()
          .single();

        if (txError) {
          logEntry.status = 'failed';
          logEntry.error_message = txError.message;
          responseMessage = "Failed to record transaction. Please try again.";
        } else {
          logEntry.status = 'success';
          logEntry.transaction_id = transaction.id;
          
          const txDate = new Date().toISOString().split('T')[0];
          
          // Try to match against unpaid bills
          let billMatched = false;
          let billMatchInfo = '';
          if (parsed.type === 'expense') {
            const matchResult = await matchAgainstBills(
              supabase, profile.id, parsed.title, parsed.amount, parsed.category, transaction.id, txDate
            );
            
            if (matchResult.matched) {
              billMatched = true;
              billMatchInfo = ` & bill "${matchResult.billName}" marked paid`;
            } else if (matchResult.billName) {
              billMatchInfo = ` (possible match: "${matchResult.billName}" — confirm in app)`;
            }
          }

          // Auto-update budget envelope if this is an expense
          let budgetUpdated = false;
          if (parsed.type === 'expense' && parsed.category) {
            const categoryMapping: Record<string, string> = {
              'food': 'food',
              'transportation': 'transportation',
              'shopping': 'shopping',
              'utilities': 'utilities',
              'entertainment': 'entertainment',
              'healthcare': 'healthcare',
              'education': 'education',
              'housing': 'housing',
              'insurance': 'insurance',
              'other': 'other',
            };
            
            const budgetCategory = categoryMapping[parsed.category] || 'other';
            
            const { data: budgets } = await supabase
              .from('budgets')
              .select('id, name, spent, amount')
              .eq('user_id', profile.id)
              .eq('category', budgetCategory)
              .eq('is_active', true)
              .limit(1);
            
            if (budgets && budgets.length > 0) {
              const budget = budgets[0];
              const newSpent = Number(budget.spent) + parsed.amount;
              
              await supabase
                .from('budgets')
                .update({ spent: newSpent })
                .eq('id', budget.id);
              
              budgetUpdated = true;
              console.log(`Updated ${budget.name} budget: +$${parsed.amount} (now $${newSpent}/${budget.amount})`);
            }
          }
          
          if (billMatched) {
            responseMessage = `✓ Recorded${billMatchInfo}: $${parsed.amount.toFixed(2)} - ${parsed.title}`;
          } else if (budgetUpdated) {
            responseMessage = `✓ Recorded & budget updated: $${parsed.amount.toFixed(2)} ${parsed.type} - ${parsed.title}${billMatchInfo}`;
          } else {
            responseMessage = `✓ Recorded: $${parsed.amount.toFixed(2)} ${parsed.type} - ${parsed.title}${billMatchInfo}`;
          }
        }
      } else {
        logEntry.status = 'failed';
        logEntry.error_message = 'Could not parse amount';
        responseMessage = "Could not detect an amount in your message. Try: '$45.99 coffee shop'";
      }
    }

    // Log the SMS
    await supabase.from('sms_transaction_logs').insert(logEntry);

    // Return TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`;

    return new Response(twiml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml'
      }
    });
  } catch (error) {
    console.error('SMS webhook error:', error);
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, there was an error processing your message.</Message>
</Response>`;

    return new Response(twiml, {
      status: 200, // Twilio expects 200 even for errors
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml'
      }
    });
  }
});
