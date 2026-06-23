import Stripe from "https://esm.sh/stripe@18.5.0";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTOPAY-PAYMENT] ${step}${detailsStr}`);
};

export interface PaymentMethod {
  id: string;
  user_id: string;
  method_type: 'stripe_card' | 'plaid_ach';
  stripe_payment_method_id: string | null;
  stripe_customer_id: string | null;
  plaid_processor_token: string | null;
  display_name: string;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  chargeId?: string;
  status?: string;
  error?: string;
}

/**
 * Process a card payment via Stripe
 */
export async function processCardPayment(
  stripe: Stripe,
  paymentMethod: PaymentMethod,
  amountInCents: number,
  metadata: Record<string, string>
): Promise<PaymentResult> {
  if (!paymentMethod.stripe_payment_method_id) {
    return { success: false, error: "No Stripe payment method ID for card" };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      customer: paymentMethod.stripe_customer_id || undefined,
      payment_method: paymentMethod.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      metadata,
    });

    logStep("Card payment processed", { 
      paymentIntentId: paymentIntent.id, 
      status: paymentIntent.status 
    });

    return {
      success: paymentIntent.status === "succeeded",
      paymentIntentId: paymentIntent.id,
      chargeId: paymentIntent.latest_charge as string,
      status: paymentIntent.status,
      error: paymentIntent.status !== "succeeded" 
        ? `Payment status: ${paymentIntent.status}` 
        : undefined,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logStep("Card payment failed", { error: errorMsg });
    return { success: false, error: errorMsg };
  }
}

/**
 * Process an ACH payment via Stripe using a Plaid-linked bank account
 * 
 * The stripe_payment_method_id for ACH is actually a bank account source ID (ba_xxx)
 * created during the Plaid setup flow. We charge it differently than PaymentMethods.
 */
export async function processACHPayment(
  stripe: Stripe,
  paymentMethod: PaymentMethod,
  amountInCents: number,
  metadata: Record<string, string>
): Promise<PaymentResult> {
  // For ACH, we need either a bank account source (ba_xxx) or a payment method (pm_xxx)
  const paymentMethodId = paymentMethod.stripe_payment_method_id;
  const customerId = paymentMethod.stripe_customer_id;
  
  if (!paymentMethodId) {
    if (paymentMethod.plaid_processor_token) {
      logStep("ACH requires setup - processor token found but no payment method", {
        hasProcessorToken: true,
      });
      return { 
        success: false, 
        error: "Bank account not properly configured. Please re-link your bank account." 
      };
    }
    return { success: false, error: "No payment method configured for bank account" };
  }

  if (!customerId) {
    return { success: false, error: "No Stripe customer ID for bank account" };
  }

  try {
    // Check if this is a bank account source (ba_xxx) or a payment method (pm_xxx)
    const isBankAccountSource = paymentMethodId.startsWith('ba_');
    
    if (isBankAccountSource) {
      // For bank account sources, we create a charge directly
      const charge = await stripe.charges.create({
        amount: amountInCents,
        currency: "usd",
        customer: customerId,
        source: paymentMethodId, // Bank account source ID
        metadata,
      });

      logStep("ACH charge created", { 
        chargeId: charge.id, 
        status: charge.status 
      });

      // ACH charges start as 'pending' and may take a few days to complete
      const isSuccessful = ['succeeded', 'pending'].includes(charge.status);

      return {
        success: isSuccessful,
        paymentIntentId: undefined, // Charges don't have PaymentIntent IDs
        chargeId: charge.id,
        status: charge.status,
        error: !isSuccessful 
          ? `Charge status: ${charge.status}` 
          : undefined,
      };
    } else {
      // For PaymentMethods (pm_xxx), use PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "usd",
        customer: customerId,
        payment_method: paymentMethodId,
        payment_method_types: ['us_bank_account'],
        off_session: true,
        confirm: true,
        mandate_data: {
          customer_acceptance: {
            type: 'offline',
          },
        },
        metadata,
      });

      logStep("ACH payment intent created", { 
        paymentIntentId: paymentIntent.id, 
        status: paymentIntent.status 
      });

      // ACH payments may be in 'processing' status initially
      const isSuccessful = ['succeeded', 'processing'].includes(paymentIntent.status);

      return {
        success: isSuccessful,
        paymentIntentId: paymentIntent.id,
        chargeId: paymentIntent.latest_charge as string,
        status: paymentIntent.status,
        error: !isSuccessful 
          ? `Payment status: ${paymentIntent.status}` 
          : undefined,
      };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logStep("ACH payment failed", { error: errorMsg });
    return { success: false, error: errorMsg };
  }
}

/**
 * Process a payment using the appropriate method
 */
export async function processPayment(
  stripe: Stripe,
  paymentMethod: PaymentMethod,
  amountInCents: number,
  metadata: Record<string, string>
): Promise<PaymentResult> {
  if (paymentMethod.method_type === 'stripe_card') {
    return processCardPayment(stripe, paymentMethod, amountInCents, metadata);
  } else if (paymentMethod.method_type === 'plaid_ach') {
    return processACHPayment(stripe, paymentMethod, amountInCents, metadata);
  }
  
  return { success: false, error: `Unknown payment method type: ${paymentMethod.method_type}` };
}
