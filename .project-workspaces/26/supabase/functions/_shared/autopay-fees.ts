// Fee structure constants
export const CARD_FEE_PERCENT = 0.029; // 2.9%
export const CARD_FEE_FIXED = 0.30; // $0.30
export const ACH_FEE_PERCENT = 0.008; // 0.8%
export const ACH_FEE_MAX = 5.00; // $5 cap

export interface FeeCalculation {
  fee: number;
  total: number;
  feeDescription: string;
}

export interface FeeQuote {
  isPremium: boolean;
  billAmount: number;
  card: FeeCalculation;
  ach: FeeCalculation & { premiumBenefit: boolean };
  selectedMethod: {
    type: string;
    fee: number;
    total: number;
  };
}

/**
 * Calculate fee based on payment method type and user tier
 * Cards: 2.9% + $0.30 - user always pays
 * ACH: 0.8% capped at $5 - premium users get free
 */
export function calculateFee(
  amount: number, 
  methodType: 'stripe_card' | 'plaid_ach', 
  isPremium: boolean
): { fee: number; total: number } {
  let fee = 0;
  
  if (methodType === 'stripe_card') {
    // Cards: 2.9% + $0.30 - user always pays
    fee = (amount * CARD_FEE_PERCENT) + CARD_FEE_FIXED;
  } else if (methodType === 'plaid_ach') {
    // ACH: 0.8% capped at $5 - premium users get free
    if (isPremium) {
      fee = 0; // Premium benefit: free ACH
    } else {
      fee = Math.min(amount * ACH_FEE_PERCENT, ACH_FEE_MAX);
    }
  }
  
  return {
    fee: Math.round(fee * 100) / 100, // Round to cents
    total: Math.round((amount + fee) * 100) / 100,
  };
}

/**
 * Generate a complete fee quote for both payment methods
 */
export function generateFeeQuote(
  amount: number,
  selectedMethodType: 'stripe_card' | 'plaid_ach',
  isPremium: boolean
): FeeQuote {
  const cardFee = calculateFee(amount, 'stripe_card', isPremium);
  const achFee = calculateFee(amount, 'plaid_ach', isPremium);

  return {
    isPremium,
    billAmount: amount,
    card: {
      fee: cardFee.fee,
      total: cardFee.total,
      feeDescription: `${(CARD_FEE_PERCENT * 100).toFixed(1)}% + $${CARD_FEE_FIXED.toFixed(2)}`,
    },
    ach: {
      fee: achFee.fee,
      total: achFee.total,
      feeDescription: isPremium 
        ? 'Free with Premium' 
        : `${(ACH_FEE_PERCENT * 100).toFixed(1)}% (max $${ACH_FEE_MAX.toFixed(2)})`,
      premiumBenefit: !isPremium,
    },
    selectedMethod: {
      type: selectedMethodType,
      fee: selectedMethodType === 'stripe_card' ? cardFee.fee : achFee.fee,
      total: selectedMethodType === 'stripe_card' ? cardFee.total : achFee.total,
    },
  };
}
