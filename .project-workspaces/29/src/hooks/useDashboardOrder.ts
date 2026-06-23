import { useState, useEffect, useCallback } from 'react';

// Default order of dashboard widgets (from Recent Trades to Refer & Earn)
export const DEFAULT_DASHBOARD_ORDER = [
  'financial-health',
  'quinn-insights',
  'live-learn',
  'recent-trades',
  'watchlist',
  'price-alerts',
  'economic-calendar',
  'reminders',
  'trade-checklist',
  'pattern-recognition',
  'market-news',
  'referral',
];

const STORAGE_KEY = 'dashboard-widget-order';
const VERSION_KEY = 'dashboard-widget-order-version';
const CURRENT_VERSION = 6; // Bump this to force reset saved order

export function useDashboardOrder() {
  const [order, setOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const savedVersion = localStorage.getItem(VERSION_KEY);
      const isCurrentVersion = savedVersion === String(CURRENT_VERSION);

      if (isCurrentVersion) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const missingItems = DEFAULT_DASHBOARD_ORDER.filter(id => !parsed.includes(id));
            return [...parsed, ...missingItems];
          } catch {
            return DEFAULT_DASHBOARD_ORDER;
          }
        }
      } else {
        // Version mismatch — clear old order, apply new defaults
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(VERSION_KEY, String(CURRENT_VERSION));
      }
    }
    return DEFAULT_DASHBOARD_ORDER;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  }, [order]);

  const updateOrder = useCallback((newOrder: string[]) => {
    setOrder(newOrder);
  }, []);

  const resetOrder = useCallback(() => {
    setOrder(DEFAULT_DASHBOARD_ORDER);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { order, updateOrder, resetOrder };
}
