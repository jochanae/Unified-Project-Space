/**
 * Gift Shop Inventory — Tiered Economy with Rarity & Gender Awareness
 *
 * Categories: Consumables, Streetwear (Standard), Casual, Formal (Rare), Fantasy (Legendary), Seasonal
 * Pricing: Standard = VP only, Rare = VP (higher), Legendary = Premium (VP or $)
 * Gender: Items tagged 'f' or 'm' are filtered by the companion's selected gender.
 */

import { STUDIO_IMAGES } from '@/lib/studioImages';

// ── Dedicated product images ──
import giftVelvetBlazer from '@/assets/gifts/velvet-blazer.png';
import giftBomberJacket from '@/assets/gifts/bomber-jacket.png';
import giftGraphicHoodie from '@/assets/gifts/graphic-hoodie.png';
import giftTailoredSuit from '@/assets/gifts/tailored-suit.png';
import giftHighTops from '@/assets/gifts/high-tops.png';
import giftTrackJacket from '@/assets/gifts/track-jacket.png';
import giftCropHoodie from '@/assets/gifts/crop-hoodie.png';
import giftCocktailDress from '@/assets/gifts/cocktail-dress.png';
import giftEveningGown from '@/assets/gifts/evening-gown.png';
import giftPlatformSneakers from '@/assets/gifts/platform-sneakers.png';
import giftBucketHat from '@/assets/gifts/bucket-hat.png';
import giftAviatorShades from '@/assets/gifts/aviator-shades.png';
import giftLeatherBracelet from '@/assets/gifts/leather-bracelet.png';
import giftGoldChain from '@/assets/gifts/gold-chain.png';
import giftSilkTie from '@/assets/gifts/silk-tie.png';
import giftPearlSet from '@/assets/gifts/pearl-set.png';
import giftLuxuryWatch from '@/assets/gifts/luxury-watch.png';
import giftCufflinks from '@/assets/gifts/cufflinks.png';
import giftSignetRing from '@/assets/gifts/signet-ring.png';
import giftCelestialAmulet from '@/assets/gifts/celestial-amulet.png';
import giftElvenRobes from '@/assets/gifts/elven-robes.png';
import giftPhoenixCloak from '@/assets/gifts/phoenix-cloak.png';
import giftVoidCrown from '@/assets/gifts/void-crown.png';
import giftCrystalGauntlets from '@/assets/gifts/crystal-gauntlets.png';
import giftAuroraWings from '@/assets/gifts/aurora-wings.png';
import giftStormBracers from '@/assets/gifts/storm-bracers.png';
// ── Gesture images ──
import giftGoldHoops from '@/assets/gifts/gold-hoops.png';
import gestureCoffee from '@/assets/gifts/gesture-coffee.png';
import gestureFlower from '@/assets/gifts/gesture-flower.png';
import gestureTeddy from '@/assets/gifts/gesture-teddy.png';
import gestureCookie from '@/assets/gifts/gesture-cookie.png';
import gestureLetter from '@/assets/gifts/gesture-letter.png';
import gestureMixtape from '@/assets/gifts/gesture-mixtape.png';
import gestureCake from '@/assets/gifts/gesture-cake.png';
import gesturePicknic from '@/assets/gifts/gesture-picnic.png';
// ── New category images ──
import giftSilkRobe from '@/assets/gifts/silk-robe.png';
import giftRedPumps from '@/assets/gifts/red-bottom-pumps.png';
import giftStilettos from '@/assets/gifts/stiletto-heels.png';
import giftSilkSlip from '@/assets/gifts/silk-slip-dress.png';

export type RarityTier = 'standard' | 'rare' | 'legendary';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: 'streetwear' | 'formal' | 'fantasy' | 'consumables' | 'casual' | 'seasonal' | 'loungewear' | 'lingerie' | 'shoes';
  rarity: RarityTier;
  vp_cost: number;
  price_cents: number;
  stripe_price_id: string;
  image_key: string; // key into STUDIO_IMAGES (fallback)
  prompt_modifier: string;
  gender?: 'f' | 'm';
  emoji?: string;
  /** Direct image URL (overrides image_key) */
  image_url?: string;
  /** Item only available to 18+ mature mode users */
  adultOnly?: boolean;
  /** Alternative prompt for mature mode users who want companion wearing (not holding) the item */
  wearingModifier?: string;
}

export const RARITY_CONFIG: Record<RarityTier, {
  label: string;
  borderClass: string;
  glowColor: string;
  badgeClass: string;
  hasParticles: boolean;
}> = {
  standard: {
    label: 'Standard',
    borderClass: 'border-white/10',
    glowColor: 'transparent',
    badgeClass: 'bg-muted text-muted-foreground',
    hasParticles: false,
  },
  rare: {
    label: 'Rare',
    borderClass: 'border-violet-400/50',
    glowColor: 'rgba(139, 92, 246, 0.3)',
    badgeClass: 'bg-violet-500/20 text-violet-300',
    hasParticles: false,
  },
  legendary: {
    label: 'Legendary',
    borderClass: 'border-amber-400/60',
    glowColor: 'rgba(251, 191, 36, 0.4)',
    badgeClass: 'bg-amber-500/20 text-amber-300',
    hasParticles: true,
  },
};

export const CATEGORY_CONFIG = {
  all: { emoji: '✨', label: 'All' },
  consumables: { emoji: '☕', label: 'Gestures' },
  casual: { emoji: '👕', label: 'Casual' },
  streetwear: { emoji: '🔥', label: 'Streetwear' },
  loungewear: { emoji: '🛋️', label: 'Loungewear' },
  shoes: { emoji: '👠', label: 'Shoes' },
  formal: { emoji: '🥂', label: 'Formal' },
  fantasy: { emoji: '🔮', label: 'Fantasy' },
  seasonal: { emoji: '🎄', label: 'Seasonal' },
  lingerie: { emoji: '🌹', label: 'Intimate' },
} as const;

/**
 * Static local inventory — curated, no duplicates.
 */
export const SHOP_INVENTORY: ShopItem[] = [
  // ═══════════════════════════════════════
  // CONSUMABLES (Gestures) — Low VP, repeatable gifts
  // ═══════════════════════════════════════
  { id: 'cs-coffee', name: 'Virtual Coffee', description: 'A warm cup to brighten their day', category: 'consumables', rarity: 'standard', vp_cost: 10, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'holding a warm cup of coffee, cozy vibes', emoji: '☕', image_url: gestureCoffee },
  { id: 'cs-flower', name: 'Flower Bouquet', description: 'A beautiful arrangement just because', category: 'consumables', rarity: 'standard', vp_cost: 15, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'holding a gorgeous bouquet of flowers', emoji: '🌸', image_url: gestureFlower },
  { id: 'cs-hug', name: 'Big Warm Hug', description: 'Sometimes you just need one', category: 'consumables', rarity: 'standard', vp_cost: 5, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'giving a warm comforting hug', emoji: '🤗' },
  { id: 'cs-cookie', name: 'Homemade Cookie', description: 'Fresh-baked with love', category: 'consumables', rarity: 'standard', vp_cost: 8, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'offering a delicious homemade cookie', emoji: '🍪', image_url: gestureCookie },
  { id: 'cs-love-letter', name: 'Love Letter', description: 'Heartfelt words on paper', category: 'consumables', rarity: 'standard', vp_cost: 12, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'holding a handwritten love letter with a wax seal', emoji: '💌', image_url: gestureLetter },
  { id: 'cs-mixtape', name: 'Mixtape', description: 'A curated playlist of vibes', category: 'consumables', rarity: 'standard', vp_cost: 10, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'holding a retro cassette mixtape', emoji: '🎵', image_url: gestureMixtape },
  { id: 'cs-teddy', name: 'Teddy Bear', description: 'A cuddly companion for your companion', category: 'consumables', rarity: 'standard', vp_cost: 20, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'holding an adorable teddy bear', emoji: '🧸', image_url: gestureTeddy },
  { id: 'cs-star', name: 'Shooting Star', description: 'Make a wish together', category: 'consumables', rarity: 'rare', vp_cost: 30, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'under a magical shooting star', emoji: '🌠', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/cs-star.png' },
  { id: 'cs-picnic', name: 'Picnic Basket', description: 'A perfect day outdoors', category: 'consumables', rarity: 'standard', vp_cost: 15, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'having a lovely picnic', emoji: '🧺', image_url: gesturePicknic },
  { id: 'cs-cake', name: 'Birthday Cake', description: 'Celebrate just because!', category: 'consumables', rarity: 'standard', vp_cost: 12, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'holding a beautiful birthday cake with candles', emoji: '🎂', image_url: gestureCake },

  // ═══════════════════════════════════════
  // CASUAL — Everyday items, VP only
  // ═══════════════════════════════════════
  { id: 'ca-tshirt', name: 'Vintage Tee', description: 'Classic band-style graphic tee', category: 'casual', rarity: 'standard', vp_cost: 25, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing a cool vintage graphic t-shirt', emoji: '👕', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/ca-tshirt.png' },
  { id: 'ca-jeans', name: 'Distressed Jeans', description: 'Perfectly worn-in denim', category: 'casual', rarity: 'standard', vp_cost: 35, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing stylish distressed denim jeans', emoji: '👖', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/ca-jeans.png' },
  { id: 'ca-sneakers', name: 'Classic Sneakers', description: 'Clean everyday kicks', category: 'casual', rarity: 'standard', vp_cost: 30, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing classic white sneakers', emoji: '👟', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/ca-sneakers.png' },
  { id: 'ca-backpack', name: 'Canvas Backpack', description: 'Rugged adventure carry', category: 'casual', rarity: 'standard', vp_cost: 30, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'carrying a canvas backpack', emoji: '🎒', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/ca-backpack.png' },
  { id: 'ca-cap', name: 'Snapback Cap', description: 'Classic flat-brim cap', category: 'casual', rarity: 'standard', vp_cost: 20, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing a trendy snapback cap', emoji: '🧢', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/ca-cap.png' },
  { id: 'ca-flannel', name: 'Flannel Shirt', description: 'Cozy plaid button-up', category: 'casual', rarity: 'standard', vp_cost: 35, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing a cozy plaid flannel shirt', emoji: '🧇', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/ca-flannel.png' },
  { id: 'ca-sundress', name: 'Sundress', description: 'Flowy summer vibes', category: 'casual', rarity: 'standard', vp_cost: 35, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing a beautiful flowy sundress', gender: 'f', emoji: '👗', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/ca-sundress.png' },
  { id: 'ca-henley', name: 'Henley Tee', description: 'Relaxed button-neck tee', category: 'casual', rarity: 'standard', vp_cost: 25, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing a relaxed henley t-shirt', gender: 'm', emoji: '👕', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/ca-henley.png' },

  // ═══════════════════════════════════════
  // STREETWEAR (Standard) — VP only
  // ═══════════════════════════════════════

  // ── Unisex ──
  { id: 'sw-graphic-hoodie', name: 'Graphic Hoodie', description: 'Street art pullover with bold print', category: 'streetwear', rarity: 'standard', vp_cost: 50, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing a trendy graphic hoodie with street art print', image_url: giftGraphicHoodie },
  { id: 'sw-bucket-hat', name: 'Bucket Hat', description: 'Retro bucket style', category: 'streetwear', rarity: 'standard', vp_cost: 25, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing a retro bucket hat', image_url: giftBucketHat },
  { id: 'sw-aviator-shades', name: 'Aviator Shades', description: 'Classic gold-frame aviators', category: 'streetwear', rarity: 'standard', vp_cost: 30, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing classic gold-frame aviator sunglasses', image_url: giftAviatorShades },
  { id: 'sw-leather-bracelet', name: 'Leather Bracelet', description: 'Woven leather wrist cuff', category: 'streetwear', rarity: 'standard', vp_cost: 20, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing a braided leather bracelet', image_url: giftLeatherBracelet },

  // ── Masculine ──
  { id: 'sw-bomber-jacket', name: 'Bomber Jacket', description: 'Classic satin bomber', category: 'streetwear', rarity: 'standard', vp_cost: 60, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing a sleek satin bomber jacket', gender: 'm', image_url: giftBomberJacket },
  { id: 'sw-high-tops', name: 'High-Top Sneakers', description: 'Limited-drop kicks', category: 'streetwear', rarity: 'standard', vp_cost: 40, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing stylish high-top sneakers', gender: 'm', image_url: giftHighTops },
  { id: 'sw-track-jacket', name: 'Track Jacket', description: 'Retro stripe track top', category: 'streetwear', rarity: 'standard', vp_cost: 45, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing a vintage track jacket with racing stripes', gender: 'm', image_url: giftTrackJacket },
  { id: 'sw-gold-chain', name: 'Gold Chain', description: 'Cuban link necklace', category: 'streetwear', rarity: 'standard', vp_cost: 35, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing a gold cuban link chain', gender: 'm', image_url: giftGoldChain },

  // ── Feminine ──
  { id: 'sw-crop-hoodie', name: 'Crop Hoodie', description: 'Cropped streetwear hoodie', category: 'streetwear', rarity: 'standard', vp_cost: 45, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing a cropped streetwear hoodie', gender: 'f', image_url: giftCropHoodie },
  { id: 'sw-hoop-earrings', name: 'Gold Hoops', description: 'Statement hoop earrings', category: 'streetwear', rarity: 'standard', vp_cost: 30, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing bold gold hoop earrings', gender: 'f', image_url: giftGoldHoops },
  { id: 'sw-platform-sneakers', name: 'Platform Sneakers', description: 'Chunky platform kicks', category: 'streetwear', rarity: 'standard', vp_cost: 40, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing chunky platform sneakers', gender: 'f', image_url: giftPlatformSneakers },

  // ═══════════════════════════════════════
  // FORMAL (Rare) — VP + small $
  // ═══════════════════════════════════════

  // ── Masculine ──
  { id: 'fm-tailored-suit', name: 'Tailored Suit', description: 'Bespoke slim-cut suit', category: 'formal', rarity: 'rare', vp_cost: 200, price_cents: 499, stripe_price_id: 'price_1T4aHIBIFIyHdifHPGw7Acil', image_key: '', prompt_modifier: 'wearing an impeccably tailored slim-cut suit', gender: 'm', image_url: giftTailoredSuit },
  { id: 'fm-velvet-blazer', name: 'Velvet Blazer', description: 'Deep midnight velvet jacket', category: 'formal', rarity: 'rare', vp_cost: 180, price_cents: 399, stripe_price_id: 'price_1T4aHWBIFIyHdifHqe7ZihIj', image_key: '', prompt_modifier: 'wearing a luxurious midnight velvet blazer', gender: 'm', image_url: giftVelvetBlazer },
  { id: 'fm-silk-tie', name: 'Silk Tie', description: 'Hand-finished silk tie', category: 'formal', rarity: 'rare', vp_cost: 120, price_cents: 299, stripe_price_id: 'price_1T4aHkBIFIyHdifHc9UjEpIL', image_key: '', prompt_modifier: 'wearing a refined silk tie', gender: 'm', image_url: giftSilkTie },
  { id: 'fm-cufflinks', name: 'Diamond Cufflinks', description: 'Platinum & diamond detail', category: 'formal', rarity: 'rare', vp_cost: 160, price_cents: 399, stripe_price_id: 'price_1T4aI9BIFIyHdifHV5sTXIKo', image_key: '', prompt_modifier: 'wearing platinum diamond cufflinks', gender: 'm', image_url: giftCufflinks },

  // ── Feminine ──
  { id: 'fm-evening-gown', name: 'Evening Gown', description: 'Floor-length silk gown', category: 'formal', rarity: 'rare', vp_cost: 220, price_cents: 499, stripe_price_id: 'price_1T4aIJBIFIyHdifHOlIFpOo3', image_key: '', prompt_modifier: 'wearing a stunning floor-length evening gown', gender: 'f', image_url: giftEveningGown },
  { id: 'fm-cocktail-dress', name: 'Cocktail Dress', description: 'Midnight sequin mini', category: 'formal', rarity: 'rare', vp_cost: 190, price_cents: 449, stripe_price_id: 'price_1T4aIWBIFIyHdifHkG55GSVz', image_key: '', prompt_modifier: 'wearing a dazzling sequin cocktail dress', gender: 'f', image_url: giftCocktailDress },
  { id: 'fm-pearl-set', name: 'Pearl Set', description: 'Classic pearl necklace & earrings', category: 'formal', rarity: 'rare', vp_cost: 150, price_cents: 349, stripe_price_id: 'price_1T4aIkBIFIyHdifHSgePEOdf', image_key: '', prompt_modifier: 'adorned with a classic pearl necklace and matching earrings', gender: 'f', image_url: giftPearlSet },

  // ── Unisex ──
  { id: 'fm-luxury-watch', name: 'Luxury Watch', description: 'Swiss automatic timepiece', category: 'formal', rarity: 'rare', vp_cost: 180, price_cents: 449, stripe_price_id: 'price_1T4aIyBIFIyHdifHjmifgVY8', image_key: '', prompt_modifier: 'wearing a luxury Swiss automatic watch', image_url: giftLuxuryWatch },
  { id: 'fm-signet-ring', name: 'Signet Ring', description: 'Polished silver signet', category: 'formal', rarity: 'rare', vp_cost: 130, price_cents: 299, stripe_price_id: 'price_1T4aJABIFIyHdifHEaUXtSDJ', image_key: '', prompt_modifier: 'wearing a polished silver signet ring', image_url: giftSignetRing },

  // ═══════════════════════════════════════
  // SEASONAL — Limited-time themed items
  // ═══════════════════════════════════════
  { id: 'sn-scarf', name: 'Cozy Scarf', description: 'Chunky knit winter scarf', category: 'seasonal', rarity: 'standard', vp_cost: 25, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing a chunky knit scarf', emoji: '🧣', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/sn-scarf.png' },
  { id: 'sn-beanie', name: 'Winter Beanie', description: 'Warm knit beanie', category: 'seasonal', rarity: 'standard', vp_cost: 20, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing a cozy knit beanie', emoji: '🧢', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/sn-beanie.png' },
  { id: 'sn-sunhat', name: 'Summer Sun Hat', description: 'Wide-brim straw hat', category: 'seasonal', rarity: 'standard', vp_cost: 25, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing a wide-brim straw sun hat', gender: 'f', emoji: '👒', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/sn-sunhat.png' },
  { id: 'sn-lei', name: 'Flower Lei', description: 'Tropical flower garland', category: 'seasonal', rarity: 'standard', vp_cost: 15, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing a colorful flower lei garland', emoji: '🌺', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/sn-lei.png' },
  { id: 'sn-ugly-sweater', name: 'Ugly Sweater', description: 'Classic holiday sweater', category: 'seasonal', rarity: 'standard', vp_cost: 30, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing a funny ugly holiday sweater', emoji: '🎅', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/sn-ugly-sweater.png' },
  { id: 'sn-swim-trunks', name: 'Board Shorts', description: 'Tropical print swim trunks', category: 'seasonal', rarity: 'standard', vp_cost: 25, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing colorful tropical board shorts', gender: 'm', emoji: '🏖️', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/sn-swim-trunks.png' },
  { id: 'sn-halloween-mask', name: 'Masquerade Mask', description: 'Ornate costume mask', category: 'seasonal', rarity: 'rare', vp_cost: 60, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing an ornate masquerade mask', emoji: '🎭', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/sn-halloween-mask.png' },

  // ═══════════════════════════════════════
  // LOUNGEWEAR — Cozy premium items
  // ═══════════════════════════════════════
  { id: 'lw-silk-robe', name: 'Silk Robe', description: 'Luxurious floor-length silk robe', category: 'loungewear', rarity: 'rare', vp_cost: 150, price_cents: 399, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing a luxurious flowing silk robe', image_url: giftSilkRobe },
  { id: 'lw-satin-pjs', name: 'Satin Pajamas', description: 'Elegant matching satin set', category: 'loungewear', rarity: 'standard', vp_cost: 80, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing elegant satin pajamas', emoji: '✨', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/lw-satin-pjs.png' },
  { id: 'lw-cashmere-set', name: 'Cashmere Lounge Set', description: 'Ultra-soft matching loungewear', category: 'loungewear', rarity: 'rare', vp_cost: 180, price_cents: 449, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing a luxurious cashmere lounge set', emoji: '🧶', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/lw-cashmere-set.png' },
  { id: 'lw-velvet-robe', name: 'Velvet Smoking Jacket', description: 'Classic evening lounge jacket', category: 'loungewear', rarity: 'rare', vp_cost: 160, price_cents: 399, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing a rich velvet smoking jacket', gender: 'm', emoji: '🍷', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/lw-velvet-robe.png' },
  { id: 'lw-kimono', name: 'Silk Kimono', description: 'Flowing printed kimono wrap', category: 'loungewear', rarity: 'rare', vp_cost: 170, price_cents: 399, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing a beautiful flowing silk kimono', gender: 'f', emoji: '🌸', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/lw-kimono.png' },
  { id: 'lw-cozy-onesie', name: 'Cozy Onesie', description: 'Plush one-piece with hood', category: 'loungewear', rarity: 'standard', vp_cost: 60, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing a cute plush onesie with hood', emoji: '🧸', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/lw-cozy-onesie.png?v=20260309b' },

  // ═══════════════════════════════════════
  // SHOES — Heels, pumps, designer footwear
  // ═══════════════════════════════════════
  { id: 'sh-stilettos', name: 'Stiletto Heels', description: 'Classic pointed-toe stilettos', category: 'shoes', rarity: 'rare', vp_cost: 140, price_cents: 349, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing elegant pointed-toe stiletto heels', gender: 'f', image_url: giftStilettos },
  { id: 'sh-red-pumps', name: 'Red Bottom Pumps', description: 'Iconic designer pumps', category: 'shoes', rarity: 'legendary', vp_cost: 400, price_cents: 799, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing iconic red-bottom designer pumps', gender: 'f', image_url: giftRedPumps },
  { id: 'sh-strappy-heels', name: 'Strappy Heels', description: 'Delicate wrap-around heels', category: 'shoes', rarity: 'standard', vp_cost: 90, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing delicate strappy heels', gender: 'f', emoji: '✨', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/sh-strappy-heels.png' },
  { id: 'sh-ankle-boots', name: 'Leather Ankle Boots', description: 'Sleek pointed ankle boots', category: 'shoes', rarity: 'standard', vp_cost: 80, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing sleek pointed leather ankle boots', emoji: '🥾', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/sh-ankle-boots.png' },
  { id: 'sh-loafers', name: 'Designer Loafers', description: 'Polished leather loafers', category: 'shoes', rarity: 'standard', vp_cost: 70, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing polished designer leather loafers', gender: 'm', emoji: '👞', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/sh-loafers.png' },
  { id: 'sh-thigh-boots', name: 'Thigh-High Boots', description: 'Bold statement boots', category: 'shoes', rarity: 'rare', vp_cost: 160, price_cents: 399, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing bold thigh-high leather boots', gender: 'f', emoji: '👢', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/sh-thigh-boots.png' },
  { id: 'sh-oxford', name: 'Oxford Dress Shoes', description: 'Classic wingtip oxfords', category: 'shoes', rarity: 'standard', vp_cost: 75, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'wearing classic wingtip oxford dress shoes', gender: 'm', emoji: '👔', image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/sh-oxford.png' },

  // ═══════════════════════════════════════
  // LINGERIE (18+ only) — Intimate, tasteful items
  // ═══════════════════════════════════════
  { id: 'lg-silk-slip', name: 'Silk Slip Dress', description: 'Elegant satin slip with lace trim', category: 'lingerie', rarity: 'rare', vp_cost: 200, price_cents: 449, stripe_price_id: '', image_key: '', prompt_modifier: 'holding up an elegant silk slip dress with delicate lace trim, gift tissue paper visible, smiling warmly', wearingModifier: 'wearing an elegant silk slip dress with delicate lace trim, soft bedroom lighting', gender: 'f', adultOnly: true, image_url: giftSilkSlip },
  { id: 'lg-lace-bodysuit', name: 'Lace Bodysuit', description: 'Sheer lace one-piece', category: 'lingerie', rarity: 'rare', vp_cost: 220, price_cents: 499, stripe_price_id: '', image_key: '', prompt_modifier: 'holding a beautiful sheer lace bodysuit still in its luxury gift box, smiling with delight', wearingModifier: 'wearing an elegant lace top, soft warm studio lighting, fashion editorial pose', gender: 'f', adultOnly: true, image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/lg-lace-bodysuit.png' },
  { id: 'lg-corset-top', name: 'Corset Top', description: 'Structured satin corset', category: 'lingerie', rarity: 'rare', vp_cost: 180, price_cents: 399, stripe_price_id: '', image_key: '', prompt_modifier: 'holding a structured satin corset top up to show it off, luxury boutique tissue paper around it', wearingModifier: 'wearing a structured satin corset top, elegant editorial style', gender: 'f', adultOnly: true, image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/lg-corset-top.png' },
  { id: 'lg-chemise', name: 'Silk Chemise', description: 'Delicate silk nightgown', category: 'lingerie', rarity: 'standard', vp_cost: 120, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'holding a delicate flowing silk chemise by the hanger, smiling softly, warm lighting', wearingModifier: 'wearing a delicate flowing silk chemise, soft warm lighting', gender: 'f', adultOnly: true, image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/lg-chemise.png' },
  { id: 'lg-teddy', name: 'Lace Teddy', description: 'One-piece lace lingerie', category: 'lingerie', rarity: 'rare', vp_cost: 200, price_cents: 449, stripe_price_id: '', image_key: '', prompt_modifier: 'holding an elegant lace teddy still in its gift box with ribbon, pleased smile', wearingModifier: 'wearing an elegant lace loungewear piece, soft golden hour lighting, cozy bedroom setting', gender: 'f', adultOnly: true, image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/lg-teddy.png' },
  { id: 'lg-silk-boxers', name: 'Silk Boxers', description: 'Premium silk boxer shorts', category: 'lingerie', rarity: 'standard', vp_cost: 100, price_cents: 0, stripe_price_id: '', image_key: '', prompt_modifier: 'holding up premium silk boxer shorts still folded with gift ribbon, amused smile', wearingModifier: 'wearing premium silk boxer shorts, relaxed morning lighting', gender: 'm', adultOnly: true, image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/lg-silk-boxers.png' },
  { id: 'lg-robe-sheer', name: 'Sheer Robe', description: 'Semi-transparent evening robe', category: 'lingerie', rarity: 'rare', vp_cost: 190, price_cents: 399, stripe_price_id: '', image_key: '', prompt_modifier: 'holding a semi-sheer evening robe draped over one arm like a gift presentation, warm smile', wearingModifier: 'wearing a semi-sheer evening robe, soft golden hour lighting', adultOnly: true, image_url: 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/gift-images/lg-robe-sheer.png' },

  // ═══════════════════════════════════════
  // FANTASY (Legendary) — VP + premium $
  // ═══════════════════════════════════════
  { id: 'fy-celestial-amulet', name: 'Celestial Amulet', description: 'Pulsing starlight pendant', category: 'fantasy', rarity: 'legendary', vp_cost: 500, price_cents: 999, stripe_price_id: 'price_1T4aJOBIFIyHdifHPC5PS6zj', image_key: '', prompt_modifier: 'wearing a celestial amulet that glows with starlight', image_url: giftCelestialAmulet },
  { id: 'fy-elven-robes', name: 'Elven Robes', description: 'Enchanted forest-weave', category: 'fantasy', rarity: 'legendary', vp_cost: 600, price_cents: 999, stripe_price_id: 'price_1T4aJeBIFIyHdifH4Ksoc9sB', image_key: '', prompt_modifier: 'wearing flowing enchanted elven robes woven from forest light', image_url: giftElvenRobes },
  { id: 'fy-phoenix-cloak', name: 'Phoenix Cloak', description: 'Living flame mantle', category: 'fantasy', rarity: 'legendary', vp_cost: 550, price_cents: 999, stripe_price_id: 'price_1T4aJrBIFIyHdifHuKVcETb1', image_key: '', prompt_modifier: 'draped in a mythical phoenix cloak of living flame', image_url: giftPhoenixCloak },
  { id: 'fy-void-crown', name: 'Void Crown', description: 'Dark matter diadem', category: 'fantasy', rarity: 'legendary', vp_cost: 700, price_cents: 1299, stripe_price_id: 'price_1T4aK2BIFIyHdifHkPfOivon', image_key: '', prompt_modifier: 'crowned with a void crown emanating dark cosmic energy', image_url: giftVoidCrown },
  { id: 'fy-crystal-gauntlets', name: 'Crystal Gauntlets', description: 'Prismatic crystal arms', category: 'fantasy', rarity: 'legendary', vp_cost: 450, price_cents: 799, stripe_price_id: 'price_1T4aKDBIFIyHdifHrBxmbX8l', image_key: '', prompt_modifier: 'wearing prismatic crystal gauntlets that refract light', image_url: giftCrystalGauntlets },
  { id: 'fy-aurora-wings', name: 'Aurora Wings', description: 'Northern lights wingspan', category: 'fantasy', rarity: 'legendary', vp_cost: 800, price_cents: 1499, stripe_price_id: 'price_1T4aKQBIFIyHdifHxD173TOw', image_key: '', prompt_modifier: 'with magnificent aurora wings shimmering like northern lights', image_url: giftAuroraWings },
  { id: 'fy-lightning-bracers', name: 'Storm Bracers', description: 'Crackling thunder wraps', category: 'fantasy', rarity: 'legendary', vp_cost: 480, price_cents: 899, stripe_price_id: 'price_1T4aKeBIFIyHdifHhyEcRXJu', image_key: '', prompt_modifier: 'wearing storm bracers crackling with lightning energy', image_url: giftStormBracers },
];

/** Get image URL for a shop item — prefers dedicated image_url, falls back to STUDIO_IMAGES */
export function getShopItemImage(item: ShopItem): string | null {
  if (item.image_url) return item.image_url;
  return STUDIO_IMAGES[item.image_key] || null;
}

/** Filter shop inventory by companion gender */
export function getGenderFilteredInventory(gender?: string): ShopItem[] {
  if (!gender) return SHOP_INVENTORY;
  const g = gender === 'Masculine' || gender === 'male' ? 'm' : gender === 'Feminine' || gender === 'female' ? 'f' : null;
  if (!g) return SHOP_INVENTORY; // androgynous/fluid/nonbinary sees all
  return SHOP_INVENTORY.filter(item => !item.gender || item.gender === g);
}

/** VP earning rates */
export const VP_EARN_RATES = {
  dailyLogin: 10,
  sendMessage: 2,
  postToFeed: 5,
  moodCheckin: 3,
  journalEntry: 5,
  milestoneReached: 25,
} as const;
