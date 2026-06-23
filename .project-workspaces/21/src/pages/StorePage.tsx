import { useState, useMemo, useCallback, useEffect } from 'react';
import { isAdult } from '@/lib/ageUtils';
import { logger } from '@/utils/logger';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift, ShoppingBag, Check, Loader2, Sparkles, ArrowLeft,
  Plus, Zap, Crown, Diamond, ChevronDown,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import CartDrawer, { type CartItem } from '@/components/CartDrawer';
import { useVibePoints } from '@/hooks/useVibePoints';
import { buildGenerationPayload } from '@/lib/generationPayload';
import CelestialBloom, { useCelestialBloom } from '@/components/CelestialBloom';
import { getGiftResponse } from '@/lib/giftResponses';
import { useCompanionExpressionStore } from '@/stores/useCompanionExpressionStore';
import {
  SHOP_INVENTORY, RARITY_CONFIG, CATEGORY_CONFIG as SHOP_CATEGORIES,
  getShopItemImage, type ShopItem, type RarityTier,
} from '@/lib/giftInventory';

const GENERATE_AVATAR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-avatar`;

export default function StorePage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, connections, profile } = useAppContext();
  const { balance, spendPoints, refreshBalance } = useVibePoints(user?.id ?? null);
  const { bloomState, triggerBloom } = useCelestialBloom();
  const triggerExpression = useCompanionExpressionStore(s => s.triggerExpression);
  const setContextualAmbient = useCompanionExpressionStore(s => s.setContextualAmbient);

  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Gift note dialog state
  const [pendingGiftItem, setPendingGiftItem] = useState<ShopItem | null>(null);
  const [giftNote, setGiftNote] = useState('');

  // Companion selection
  const activeConnections = connections.filter(c => !c.isArchived);
  const [selectedCompanionIdx, setSelectedCompanionIdx] = useState(0);
  const [companionPickerOpen, setCompanionPickerOpen] = useState(false);
  const selectedCompanion = activeConnections.length > 0 ? activeConnections[selectedCompanionIdx] || activeConnections[0] : null;

  // ── Shared helper: deliver a gift message to chat + trigger companion reply ──
  const deliverGiftToChat = useCallback(async (
    companionMemberId: string,
    giftId: string,
    note?: string,
  ) => {
    if (!user) return;
    const item = SHOP_INVENTORY.find(i => i.id === giftId);
    const companion = connections.find(c => c.memberId === companionMemberId);
    if (!item || !companion) return;

    // Build gift message with category context for intimate items
    const isIntimate = item.category === 'lingerie';
    const noteText = note ? ` — "${note}"` : '';
    const giftMessage = item.category === 'consumables'
      ? `*sends ${companion.name} a ${item.name.toLowerCase()}*${noteText} ${item.emoji || '🎁'}`
      : isIntimate
        ? `*gives ${companion.name} ${item.name} from the intimate collection* ${item.emoji || '🎁'}`
        : `*gives ${companion.name} a ${item.name}* ${item.emoji || '🎁'}`;

    // Insert the gift as a user message so companion can see + react
    // Prefix with [verified-gift] so the companion knows this is a real purchase
    await supabase.from('chat_messages').insert({
      user_id: user.id,
      member_id: companionMemberId,
      role: 'user',
      content: `[verified-gift] ${giftMessage}`,
      source: 'gift-store',
    });

    // Trigger companion auto-reply
    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      const { data: { session } } = await supabase.auth.getSession();

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `[verified-gift] ${giftMessage}` }],
          companionName: companion.name,
          userName: profile?.userName || 'Friend',
          companionGender: companion.gender || profile?.companionGender || 'neutral',
          vibe: profile?.vibe,
          connectionMode: companion.connectionMode || 'friend',
          backstory: companion.backstory,
          personaAge: companion.age,
          personaBio: companion.bio,
          personaPersonality: companion.personality,
          personaMemberGender: companion.gender,
          memberId: companionMemberId,
          matureMode: profile?.matureMode === true,
          giftCategory: item.category,
        }),
      });

      if (resp.ok && resp.body) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let rawStream = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          rawStream += decoder.decode(value, { stream: true });
        }
        let replyText = '';
        for (const line of rawStream.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              replyText += parsed.delta.text;
            }
          } catch {
            if (!jsonStr.startsWith('{')) replyText += jsonStr;
          }
        }
        if (!replyText && !rawStream.includes('event:')) replyText = rawStream;
        replyText = replyText
          .replace(/\[GIFT_HINT:[^\]]*\]/g, '')
          .replace(/\[SEARCH_HINT:[^\]]*\]/g, '')
          .trim();
        if (replyText) {
          await supabase.from('chat_messages').insert({
            user_id: user.id,
            member_id: companionMemberId,
            role: 'assistant',
            content: replyText,
            source: 'gift-reply',
          });
          toast(`💬 ${companion.name} reacted to your gift!`, {
            duration: 6000,
            action: {
              label: 'Go to chat',
              onClick: () => navigate(`/chat/${companionMemberId}`),
            },
          });

          // ── Gift selfie: generate image of companion with the gift ──
          // Default: companion holds/presents the gift (works for all content ratings)
          // Mature mode: companion wears the item if wearingModifier exists
          // Fallback: if wearing image fails, retry with holding prompt
          const isMatureMode = profile?.matureMode === true;
          const wearingModifier = isMatureMode && item.wearingModifier ? item.wearingModifier : null;
          const effectiveModifier = wearingModifier || item.prompt_modifier;

          if (effectiveModifier) {
            try {
              const { data: { session: imgSession } } = await supabase.auth.getSession();
              if (imgSession) {
                const generateGiftSelfie = async (modifier: string) => {
                  const prompt = `${companion.appearanceDesc || 'A warm and approachable person'}. ${modifier}.`;
                  const resp = await fetch(GENERATE_AVATAR_URL, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${imgSession.access_token}`,
                    },
                    body: JSON.stringify({
                      ...buildGenerationPayload({
                        userId: user.id,
                        memberId: companionMemberId,
                        appearanceDescription: prompt,
                        visualStyle: companion.imageStyle || 'photorealistic',
                        referenceImageUrl: companion.referenceImageUrl || companion.avatarUrl || undefined,
                        mode: 'full',
                      }),
                      skipProfileUpdate: true,
                    }),
                  });
                  if (!resp.ok) return null;
                  const data = await resp.json();
                  return data.avatarUrl ? { avatarUrl: data.avatarUrl, prompt } : null;
                };

                // Try primary modifier first
                let result = await generateGiftSelfie(effectiveModifier);

                // Fallback: if wearing mode failed, retry with holding prompt
                if (!result && wearingModifier && item.prompt_modifier) {
                  console.log('[GiftShop] Wearing selfie failed, falling back to holding prompt');
                  result = await generateGiftSelfie(item.prompt_modifier);
                }

                if (result) {
                  await supabase.from('chat_messages').insert({
                    user_id: user.id,
                    member_id: companionMemberId,
                    role: 'assistant',
                    content: `📸 *${companion.name} shows off the ${item.name}*`,
                    image_url: result.avatarUrl,
                    source: 'gift-selfie',
                  });
                  await supabase.from('companion_media').insert({
                    user_id: user.id,
                    member_id: companionMemberId,
                    media_type: 'selfie',
                    image_url: result.avatarUrl,
                    caption: `${companion.name} with ${item.name} 🎁`,
                    prompt: result.prompt.slice(0, 500),
                  }).then(null, () => {});
                }
              }
            } catch (imgErr: any) {
              console.error('[GiftShop] Gift selfie generation failed (non-blocking):', imgErr);
              // Insert a fallback text message so the user isn't left wondering
              supabase.from('chat_messages').insert({
                user_id: user.id,
                member_id: companionMemberId,
                role: 'assistant',
                content: `💝 ${companion.name} loves the ${item.name}! (Photo is on its way — check back shortly)`,
                source: 'gift-selfie-fallback',
              }).then(null, () => {});
            }
          }
        }
      }
    } catch (e) {
      console.error('[GiftShop] Auto-reply failed:', e);
    }
  }, [user, connections, profile]);

  // Handle gift purchase redirect (Stripe success)
  useEffect(() => {
    const giftStatus = searchParams.get('gift');
    const giftId = searchParams.get('giftId');
    const memberId = searchParams.get('memberId');
    if (giftStatus === 'success' && giftId && memberId && user) {
      setSearchParams({}, { replace: true });
      supabase.rpc('record_gift_purchase', {
        p_gift_id: giftId, p_member_id: memberId,
      }).then(async () => {
        toast.success('Gift purchased! 🎁');
        setPurchasedIds(prev => new Set([...prev, giftId]));
        // Deliver the gift to chat and trigger companion reaction
        await deliverGiftToChat(memberId, giftId);
      });
    } else if (giftStatus === 'canceled') {
      toast.info('Gift purchase canceled');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, user, deliverGiftToChat]);

  useEffect(() => {
    if (user) {
      supabase.from('user_gift_purchases').select('gift_id').eq('user_id', user.id)
        .then(({ data }) => {
          if (data) setPurchasedIds(new Set(data.map((p: any) => p.gift_id)));
        });
    }
    setLoading(false);
  }, [user]);

  const userIsAdult18 = isAdult(profile?.dateOfBirth);
  
  // Filter out adult-only items for minors, and hide lingerie category entirely
  const ageFilteredInventory = useMemo(() => 
    SHOP_INVENTORY.filter(item => !item.adultOnly || userIsAdult18),
    [userIsAdult18]
  );
  
  const categories = useMemo(() => {
    const cats = Object.keys(SHOP_CATEGORIES);
    // Hide lingerie category for minors
    if (!userIsAdult18) return cats.filter(c => c !== 'lingerie');
    return cats;
  }, [userIsAdult18]);
  
  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return ageFilteredInventory.filter(g => g.category !== 'lingerie');
    return ageFilteredInventory.filter(g => g.category === activeCategory);
  }, [activeCategory, ageFilteredInventory]);

  const addToCart = useCallback((item: ShopItem) => {
    if (!user) { navigate('/auth'); return; }
    if (purchasedIds.has(item.id) && item.category !== 'consumables') {
      toast.info(`${selectedCompanion?.name || 'Your companion'} already has this!`);
      return;
    }
    if (cart.find(c => c.id === item.id)) {
      toast.info('Already in your cart');
      return;
    }
    if (!selectedCompanion) {
      toast('Connect with a companion first!', { action: { label: 'Browse', onClick: () => navigate('/browse') } });
      return;
    }
    setCart(prev => [...prev, {
      id: item.id, name: item.name, description: item.description,
      category: item.category, price_cents: item.price_cents,
      stripe_price_id: item.stripe_price_id, image_url: getShopItemImage(item),
    }]);
    toast.success(`${item.name} added to cart`);
  }, [user, cart, purchasedIds, selectedCompanion, navigate]);

  const handleVpPurchase = useCallback(async (item: ShopItem) => {
    if (!user) { navigate('/auth'); return; }
    if (!selectedCompanion) {
      toast('Connect with a companion first!');
      return;
    }
    // Non-consumables can only be purchased once
    if (purchasedIds.has(item.id) && item.category !== 'consumables') return;

    // For consumables, show the gift note dialog first
    if (item.category === 'consumables') {
      setPendingGiftItem(item);
      setGiftNote('');
      return;
    }

    await executeVpPurchase(item);
  }, [user, purchasedIds, selectedCompanion, navigate]);

  const executeVpPurchase = useCallback(async (item: ShopItem, note?: string) => {
    if (!user || !selectedCompanion) return;

    logger.log('[GiftShop] Attempting VP purchase:', item.name, 'cost:', item.vp_cost, 'balance before:', balance);

    const success = await spendPoints(item.vp_cost);
    logger.log('[GiftShop] spendPoints result:', success);

    if (!success) {
      toast.error(`Not enough Vibe Points! Need ${item.vp_cost} VP`);
      return;
    }

    // Force refresh balance from DB to ensure UI is accurate
    await refreshBalance();

    if (item.category !== 'consumables') {
      setPurchasedIds(prev => new Set([...prev, item.id]));
    }

    // Record purchase in DB
    const { error: purchaseError } = await supabase.rpc('record_gift_purchase', {
      p_gift_id: item.id, p_member_id: selectedCompanion.memberId,
    });

    if (purchaseError) {
      console.error('Gift purchase record failed:', purchaseError);
    }

    toast.success(`${item.name} sent to ${selectedCompanion.name}! 🎁`);

    // Celestial Bloom animation
    const bloomVariant = item.category === 'consumables' ? 'moment' : 'premium';
    triggerBloom(bloomVariant);

    // Post-bloom: categorized thank-you response
    const response = getGiftResponse(item.category, item.id);
    setTimeout(() => {
      // Glint shimmer on avatar
      triggerExpression('glint', 1200);
      // Contextual ambient text
      setContextualAmbient(response.selectedLine, response.ambientEmoji, response.ambientDurationMs);
      // Speech-bubble toast styled by tone
      toast(`💬 ${selectedCompanion.name}: "${response.selectedLine}"`, { duration: 6000 });
    }, 2800); // fires after bloom completes

    // Deliver gift message to chat + trigger companion reaction
    await deliverGiftToChat(selectedCompanion.memberId, item.id, note);
  }, [user, purchasedIds, selectedCompanion, spendPoints, refreshBalance, balance, navigate, deliverGiftToChat]);

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(c => c.id !== id));
  }, []);

  const handleCheckout = useCallback(async () => {
    if (!selectedCompanion || cart.length === 0) return;
    setCheckoutLoading(true);

    // Stripe processes one item per session — queue each item sequentially
    if (cart.length > 1) {
      toast.info(`Processing ${cart.length} items one at a time via Stripe`);
    }

    try {
      for (const cartItem of cart) {
        const { data, error } = await supabase.functions.invoke('gift-checkout', {
          body: {
            giftId: cartItem.id,
            memberId: selectedCompanion.memberId,
            priceId: cartItem.stripe_price_id,
          },
        });
        if (error) throw error;
        if (data?.url) {
          // Open each Stripe checkout in a new tab
          window.open(data.url, '_blank');
          // Small delay between multiple checkouts so browser doesn't block popups
          if (cart.length > 1) await new Promise(r => setTimeout(r, 600));
        }
      }
      // Clear cart after all checkout sessions launched
      setCart([]);
      setCartOpen(false);
    } catch (e: any) {
      console.error('[Store] Checkout failed:', e);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  }, [cart, selectedCompanion]);

  const isInCart = (id: string) => cart.some(c => c.id === id);

  return (
    <div className={cn("flex flex-col bg-background relative min-h-full", embedded ? "h-full" : "min-h-[100dvh]")}>
      <CelestialBloom active={bloomState.active} variant={bloomState.variant} />
      {/* Header */}
      <div className={cn("flex-shrink-0 px-4 pt-3 pb-2", embedded && "pt-2")}>
        <div className="flex items-center gap-3 mb-3">
          {!embedded && (
            <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Gift Shop
            </h1>
            {/* Companion picker */}
            {selectedCompanion ? (
              <div className="relative">
                <button
                  onClick={() => activeConnections.length > 1 && setCompanionPickerOpen(!companionPickerOpen)}
                  className={cn(
                    "flex items-center gap-1 text-xs text-muted-foreground transition-colors",
                    activeConnections.length > 1 && "hover:text-foreground cursor-pointer"
                  )}
                >
                  Shopping for <span className="font-semibold text-foreground">{selectedCompanion.name}</span> ✨
                  {activeConnections.length > 1 && <ChevronDown className="h-3 w-3" />}
                </button>
                <AnimatePresence>
                  {companionPickerOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute left-0 top-full mt-1 z-50 rounded-xl border border-border bg-card shadow-xl overflow-hidden min-w-[180px]"
                    >
                      {activeConnections.map((c, i) => (
                        <button
                          key={c.memberId}
                          onClick={() => { setSelectedCompanionIdx(i); setCompanionPickerOpen(false); }}
                          className={cn(
                            "flex items-center gap-2.5 w-full px-3 py-2.5 text-left text-sm transition-colors",
                            i === selectedCompanionIdx ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-muted"
                          )}
                        >
                          {c.avatarUrl ? (
                            <img src={c.avatarUrl} alt={c.name} className="h-6 w-6 rounded-full object-cover" />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                              {c.name[0]}
                            </div>
                          )}
                          {c.name}
                          {i === selectedCompanionIdx && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Browse gifts for your companion</p>
            )}
          </div>

          {/* VP Balance Pill */}
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold bg-primary/10 border border-primary/20">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-primary">{balance} VP</span>
          </div>

          {/* Cart Button */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 transition-all hover:bg-primary/20"
          >
            <ShoppingBag className="h-5 w-5 text-primary" />
            {cart.length > 0 && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {cart.length}
              </motion.span>
            )}
          </button>
        </div>

        {/* Category filters */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {categories.map(cat => {
            const config = SHOP_CATEGORIES[cat as keyof typeof SHOP_CATEGORIES];
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border/40 text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{config.emoji}</span> {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-32">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <Gift className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No items in this category yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
            <AnimatePresence mode="popLayout">
              {filteredItems.map(item => (
                <RarityCard
                  key={item.id}
                  item={item}
                  owned={purchasedIds.has(item.id) && item.category !== 'consumables'}
                  inCart={isInCart(item.id)}
                  vpBalance={balance}
                  onAddToCart={() => addToCart(item)}
                  onVpPurchase={() => handleVpPurchase(item)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* VP Earning Guide */}
        {!loading && (
          <div className="mt-6 rounded-2xl border border-primary/20 p-4 text-center bg-primary/5">
            <Zap className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xs font-semibold text-foreground">Earn Vibe Points</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Chat (+2 VP) · Post (+5 VP) · Journal (+5 VP) · Daily Login (+10 VP) · Milestones (+25 VP)
            </p>
          </div>
        )}
      </div>

      {/* Floating Cart Bar */}
      <AnimatePresence>
        {cart.length > 0 && !cartOpen && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 z-40 max-w-lg mx-auto">
            <button onClick={() => setCartOpen(true)}
              className="w-full flex items-center justify-between rounded-2xl px-5 py-3.5 shadow-xl bg-card/80 backdrop-blur-xl border border-border">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <span className="text-sm font-bold text-foreground">{cart.length} item{cart.length > 1 ? 's' : ''}</span>
              </div>
              <span className="text-sm font-bold text-primary">
                View Cart · ${(cart.reduce((s, i) => s + i.price_cents, 0) / 100).toFixed(2)}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} items={cart}
        onRemove={removeFromCart} onCheckout={handleCheckout}
        checkoutLoading={checkoutLoading} companionName={selectedCompanion?.name} />

      {/* Gift Note Dialog */}
      <AnimatePresence>
        {pendingGiftItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={() => setPendingGiftItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{pendingGiftItem.emoji || '🎁'}</span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Send {pendingGiftItem.name}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    to {selectedCompanion?.name || 'your companion'}
                  </p>
                </div>
              </div>

              <label className="block text-xs font-medium text-foreground/80 mb-1.5">
                {pendingGiftItem.id === 'cs-mixtape'
                  ? "What's on the tape? (optional)"
                  : 'Add a note (optional)'}
              </label>
              <textarea
                value={giftNote}
                onChange={(e) => setGiftNote(e.target.value.slice(0, 200))}
                placeholder={
                  pendingGiftItem.id === 'cs-mixtape'
                    ? 'e.g. Lo-fi beats, that song we talked about, rainy day vibes…'
                    : `A personal touch for ${selectedCompanion?.name || 'them'}…`
                }
                rows={3}
                className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              <p className="text-[10px] text-muted-foreground/60 mt-1 text-right">{giftNote.length}/200</p>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setPendingGiftItem(null)}
                  className="flex-1 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const item = pendingGiftItem;
                    const note = giftNote.trim() || undefined;
                    setPendingGiftItem(null);
                    setGiftNote('');
                    await executeVpPurchase(item, note);
                  }}
                  className="flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Zap className="h-3 w-3" /> Send · {pendingGiftItem.vp_cost} VP
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close companion picker on outside click */}
      {companionPickerOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setCompanionPickerOpen(false)} />
      )}
    </div>
  );
}

/* ── Rarity Card ─────────────────────────────────── */

function RarityCard({ item, owned, inCart, vpBalance, onAddToCart, onVpPurchase }: {
  item: ShopItem; owned: boolean; inCart: boolean; vpBalance: number;
  onAddToCart: () => void; onVpPurchase: () => void;
}) {
  const rarity = RARITY_CONFIG[item.rarity];
  const img = getShopItemImage(item);
  const canAffordVP = vpBalance >= item.vp_cost;
  const isVPOnly = item.price_cents === 0;
  const isConsumable = item.category === 'consumables';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        'relative flex flex-col items-center rounded-2xl overflow-hidden text-center transition-all',
        owned ? 'opacity-80' : '',
      )}
      style={{
        border: `1.5px solid`,
        borderColor: owned ? 'rgba(255,255,255,0.1)' : rarity.glowColor === 'transparent' ? 'rgba(255,255,255,0.08)' : rarity.glowColor,
        boxShadow: rarity.glowColor !== 'transparent' && !owned ? `0 0 20px ${rarity.glowColor}, inset 0 0 20px ${rarity.glowColor.replace('0.3', '0.05').replace('0.4', '0.05')}` : 'none',
        background: 'rgba(255,255,255,0.03)',
      }}
    >
      {/* Legendary sparkle particles */}
      {rarity.hasParticles && !owned && (
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-amber-300"
              style={{ left: `${15 + i * 14}%`, top: `${10 + (i % 3) * 25}%` }}
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5], y: [0, -8, 0] }}
              transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
            />
          ))}
        </div>
      )}

      {/* Image or Emoji */}
      <div className="w-full aspect-[2/3] overflow-hidden bg-secondary relative">
        {img ? (
          <img src={img} alt={item.name} className="h-full w-full object-cover" />
        ) : item.emoji ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-primary/5 to-primary/10">
            <span className="text-5xl">{item.emoji}</span>
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-3xl">{SHOP_CATEGORIES[item.category as keyof typeof SHOP_CATEGORIES]?.emoji || '🎁'}</span>
          </div>
        )}
        {/* Rarity badge */}
        <div className={cn('absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider', rarity.badgeClass)}>
          {item.rarity === 'legendary' && <Sparkles className="h-2.5 w-2.5 inline mr-0.5" />}
          {item.rarity === 'rare' && <Diamond className="h-2.5 w-2.5 inline mr-0.5" />}
          {rarity.label}
        </div>
      </div>

      {/* Owned badge */}
      {owned && (
        <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary shadow-lg z-20">
          <Check className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
      )}
      {inCart && !owned && (
        <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary/80 shadow-lg z-20">
          <ShoppingBag className="h-3 w-3 text-primary-foreground" />
        </div>
      )}

      {/* Info */}
      <div className="px-3 pb-3 pt-2 w-full">
        <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>

        {owned ? (
          <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
            <Sparkles className="h-3 w-3" /> Owned
          </span>
        ) : inCart ? (
          <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
            <Check className="h-3 w-3" /> In Cart
          </span>
        ) : (
          <div className="mt-1.5 flex flex-col gap-1">
            {/* VP Purchase */}
            <button
              onClick={(e) => { e.stopPropagation(); onVpPurchase(); }}
              disabled={!canAffordVP}
              className={cn(
                'inline-flex items-center justify-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition-all',
                canAffordVP
                  ? 'bg-primary/15 text-primary hover:bg-primary/25 active:scale-95'
                  : 'bg-muted/30 text-muted-foreground/50 cursor-not-allowed'
              )}
            >
              <Zap className="h-3 w-3" /> {item.vp_cost} VP {isConsumable ? '· Send' : ''}
            </button>
            {/* Real money option for non-standard */}
            {!isVPOnly && (
              <button
                onClick={(e) => { e.stopPropagation(); onAddToCart(); }}
                className="inline-flex items-center justify-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/20 active:scale-95 transition-all"
              >
                <Plus className="h-3 w-3" /> ${(item.price_cents / 100).toFixed(2)}
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
