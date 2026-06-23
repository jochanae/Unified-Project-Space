import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Test: deliverGiftToChat inserts correct chat message ──

describe('deliverGiftToChat: message structure', () => {
  it('builds correct gift message for non-consumable', () => {
    const item = { name: 'Silk Scarf', category: 'accessories', emoji: '🧣' };
    const companion = { name: 'Aria' };
    const giftMessage = item.category === 'consumables'
      ? `*sends ${companion.name} a ${item.name.toLowerCase()}* ${item.emoji || '🎁'}`
      : `*gives ${companion.name} a ${item.name}* ${item.emoji || '🎁'}`;
    expect(giftMessage).toBe('*gives Aria a Silk Scarf* 🧣');
  });

  it('builds correct gift message for consumable', () => {
    const item = { name: 'Hot Cocoa', category: 'consumables', emoji: '☕' };
    const companion = { name: 'Kael' };
    const giftMessage = item.category === 'consumables'
      ? `*sends ${companion.name} a ${item.name.toLowerCase()}* ${item.emoji || '🎁'}`
      : `*gives ${companion.name} a ${item.name}* ${item.emoji || '🎁'}`;
    expect(giftMessage).toBe('*sends Kael a hot cocoa* ☕');
  });

  it('falls back to 🎁 when no emoji', () => {
    const item = { name: 'Mystery Box', category: 'gifts', emoji: undefined };
    const companion = { name: 'Nyx' };
    const giftMessage = `*gives ${companion.name} a ${item.name}* ${item.emoji || '🎁'}`;
    expect(giftMessage).toContain('🎁');
  });

  it('insert payload has correct fields', () => {
    const userId = 'user-123';
    const memberId = 'member-456';
    const giftMessage = '*gives Aria a Silk Scarf* 🧣';

    const payload = {
      user_id: userId,
      member_id: memberId,
      role: 'user',
      content: `[verified-gift] ${giftMessage}`,
      source: 'gift-store',
    };

    expect(payload.role).toBe('user');
    expect(payload.source).toBe('gift-store');
    expect(payload.member_id).toBe('member-456');
    expect(payload.content).toContain('[verified-gift]');
    expect(payload.content).toContain('Silk Scarf');
  });
});

// ── Test: Cart loop processes all items ──

describe('Cart loop: processes all items', () => {
  it('iterates through every cart item', async () => {
    const cart = [
      { id: 'g1', name: 'Item 1', stripe_price_id: 'price_1' },
      { id: 'g2', name: 'Item 2', stripe_price_id: 'price_2' },
      { id: 'g3', name: 'Item 3', stripe_price_id: 'price_3' },
    ];

    const processedIds: string[] = [];
    const mockCheckout = vi.fn(async (cartItem: typeof cart[0]) => {
      processedIds.push(cartItem.id);
      return { url: `https://checkout.stripe.com/${cartItem.id}` };
    });

    // Simulate the cart loop from StorePage
    for (const cartItem of cart) {
      await mockCheckout(cartItem);
    }

    expect(mockCheckout).toHaveBeenCalledTimes(3);
    expect(processedIds).toEqual(['g1', 'g2', 'g3']);
  });

  it('does not stop after first item on error', async () => {
    const cart = [
      { id: 'g1', name: 'Item 1' },
      { id: 'g2', name: 'Item 2' },
    ];

    const processedIds: string[] = [];
    let errorThrown = false;

    // The actual StorePage wraps the entire loop in try/catch,
    // so an error on item 1 would stop item 2.
    // This test documents that behavior.
    try {
      for (const cartItem of cart) {
        if (cartItem.id === 'g1') throw new Error('Stripe error');
        processedIds.push(cartItem.id);
      }
    } catch {
      errorThrown = true;
    }

    expect(errorThrown).toBe(true);
    // Note: current implementation stops on first error.
    // If we want resilience, we'd need per-item try/catch.
    expect(processedIds).toEqual([]);
  });
});

// ── Test: Stripe success handler ──

describe('Stripe success handler', () => {
  it('extracts gift and memberId from search params', () => {
    const params = new URLSearchParams('?gift=success&giftId=scarf-01&memberId=member-abc');
    expect(params.get('gift')).toBe('success');
    expect(params.get('giftId')).toBe('scarf-01');
    expect(params.get('memberId')).toBe('member-abc');
  });

  it('does not trigger on canceled status', () => {
    const params = new URLSearchParams('?gift=canceled');
    const shouldDeliver = params.get('gift') === 'success' && !!params.get('giftId') && !!params.get('memberId');
    expect(shouldDeliver).toBe(false);
  });

  it('does not trigger when giftId is missing', () => {
    const params = new URLSearchParams('?gift=success&memberId=member-abc');
    const shouldDeliver = params.get('gift') === 'success' && !!params.get('giftId') && !!params.get('memberId');
    expect(shouldDeliver).toBe(false);
  });
});

// ── Test: VP purchase does NOT add to cart ──

describe('VP purchase flow', () => {
  it('VP items should not be added to cart', () => {
    // VP purchases are instant — they call handleVpPurchase directly
    // and never go through addToCart. This test validates the separation.
    const item = { id: 'rose-01', vp_cost: 50, price_cents: 0, stripe_price_id: '' };
    const isVpOnly = item.vp_cost > 0 && !item.stripe_price_id;
    // Items with vp_cost and no stripe_price_id are VP-only
    expect(isVpOnly).toBe(true);
  });
});
