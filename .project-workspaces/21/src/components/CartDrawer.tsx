import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CartItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price_cents: number;
  stripe_price_id: string;
  image_url: string | null;
}

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemove: (id: string) => void;
  onCheckout: () => void;
  checkoutLoading: boolean;
  companionName?: string;
}

export default function CartDrawer({ open, onClose, items, onRemove, onCheckout, checkoutLoading, companionName }: CartDrawerProps) {
  const total = items.reduce((sum, i) => sum + i.price_cents, 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50"
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm flex flex-col"
            style={{
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
                Your Cart
              </h2>
              <p className="text-[10px] text-white/50 ml-7">Paid items only · VP purchases are instant ⚡</p>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
                <X className="h-5 w-5 text-white/70" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-12">
                   <ShoppingBag className="h-10 w-10 text-white/30 mx-auto mb-3" />
                  <p className="text-sm text-white/50">Your cart is empty</p>
                  <p className="text-xs text-white/40 mt-1">
                    Tap the $ button on any item to add it here
                  </p>
                  <p className="text-[10px] text-white/25 mt-0.5">
                    VP purchases are applied instantly ⚡
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {items.map(item => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center gap-3 rounded-xl p-3"
                      style={{ background: 'rgba(255,255,255,0.07)' }}
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg overflow-hidden bg-white/5">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xl">🎁</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                        <p className="text-xs text-white/50">${(item.price_cents / 100).toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => onRemove(item.id)}
                        className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-white/50 hover:text-red-400" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-4 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Total</span>
                  <span className="text-lg font-bold text-white">${(total / 100).toFixed(2)}</span>
                </div>
                <button
                  onClick={onCheckout}
                  disabled={checkoutLoading}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold transition-all',
                    'bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]',
                    checkoutLoading && 'opacity-70'
                  )}
                >
                  {checkoutLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShoppingBag className="h-4 w-4" />
                  )}
                  Proceed to Checkout
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
