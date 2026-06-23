/**
 * Centralized Navigation Configuration for CoinsBloom
 * Provides consistent page definitions for various navigation contexts
 */

import { getFeatureKeyForPath } from '@/hooks/useFeatureFlags';


export interface NavigationPage {
  path: string;
  name: string;
  emoji?: string;
  icon?: string;
  requiresAuth?: boolean;
  requiresFeature?: string;
  category?: 'core' | 'money' | 'learning' | 'settings' | 'admin';
  isSimpleMode?: boolean; // Pages included in Simple Mode
}

// Simple Mode pages - core finance + help for seniors
const SIMPLE_MODE_PATHS = [
  '/dashboard',
  '/accounts', 
  '/transactions',
  '/bills',
  '/budgets',
  '/goals',
  '/money-academy',
  '/advanced',
  '/help-center',
  '/settings',
];

const SIMPLE_MODE_KEY = "coinsbloom_simple_mode";

// All available pages in the app - swipe navigation works for all these pages
// Feature gating only controls access, not swipe availability
const ALL_PAGES: NavigationPage[] = [
  { path: '/dashboard', name: 'Dashboard', emoji: '🏠', category: 'core', requiresAuth: true },
  { path: '/transactions', name: 'Transactions', emoji: '💸', category: 'money', requiresAuth: true },
  { path: '/budgets', name: 'Budgets', emoji: '📊', category: 'money', requiresAuth: true },
  { path: '/accounts', name: 'Accounts', emoji: '🏦', category: 'core', requiresAuth: true },
  { path: '/bills', name: 'Bills', emoji: '📅', category: 'money', requiresAuth: true },
  { path: '/debts', name: 'Debts', emoji: '💳', category: 'money', requiresAuth: true },
  { path: '/goals', name: 'Goals', emoji: '🎯', category: 'money', requiresAuth: true },
  { path: '/vision-board', name: 'Vision Board', emoji: '✨', category: 'money', requiresAuth: true },
  { path: '/reports', name: 'Reports', emoji: '📑', category: 'money', requiresAuth: true },
  { path: '/credit', name: 'Credit', emoji: '📈', category: 'money', requiresAuth: true },
  { path: '/advanced', name: 'Advanced Tools', emoji: '🔧', category: 'core', requiresAuth: true },
  { path: '/help-center', name: 'Help Center', emoji: '❓', category: 'learning' },
  { path: '/money-academy', name: 'Money Academy', emoji: '🎓', category: 'learning' },
  { path: '/professionals', name: 'Experts & Resources', emoji: '👔', category: 'learning', requiresAuth: true },
  { path: '/coach', name: 'Bloom', emoji: '🤖', category: 'core', requiresAuth: true },
  
  { path: '/admin/settings?tab=credit', name: 'Credit Products', emoji: '💳', category: 'admin', requiresAuth: true },
];

// Pages excluded from swipe (settings, admin, kidsbloom have their own navigation)
const SWIPE_EXCLUDED_PATHS = ['/settings', '/admin', '/kidsbloom'];

// Default order for swipe navigation - matches hamburger menu order
const SWIPE_ORDER = [
  '/dashboard',
  '/transactions',
  '/budgets',
  '/accounts',
  '/bills',
  '/debts',
  '/goals',
  '/vision-board',
  '/reports',
  '/credit',
  '/advanced',
  '/help-center',
  '/money-academy',
  '/professionals',
  '/coach',
  
];

interface NavigationContext {
  isAuthenticated: boolean;
  hasFeature: (feature: string) => boolean;
  favorites?: string[];
  useFavoritesOnly?: boolean;
  simpleMode?: boolean;
  isFeatureEnabled?: (key: string) => boolean;
}

export class NavigationService {
  /**
   * Check if Simple Mode is enabled
   */
  static isSimpleModeEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(SIMPLE_MODE_KEY) === 'true';
  }

  /**
   * Get pages for a specific navigation context (swipe, menu, etc.)
   * For swipe: returns ALL pages in order (feature gating doesn't block swipe)
   */
  static getPagesForContext(
    context: 'swipe' | 'menu' | 'all',
    options: NavigationContext
  ): NavigationPage[] {
    const { isAuthenticated, favorites = [], useFavoritesOnly = false, simpleMode, isFeatureEnabled } = options;
    
    // Use provided simpleMode or check localStorage
    const isSimpleMode = simpleMode ?? this.isSimpleModeEnabled();

    // For swipe navigation, return all non-excluded pages in order
    if (context === 'swipe') {
      let pages = ALL_PAGES.filter(page => {
        // Exclude pages that have their own navigation
        if (SWIPE_EXCLUDED_PATHS.some(excluded => page.path.startsWith(excluded))) {
          return false;
        }
        
        // Check auth requirement
        if (page.requiresAuth && !isAuthenticated) {
          return false;
        }

        // Filter for Simple Mode
        if (isSimpleMode && !SIMPLE_MODE_PATHS.includes(page.path)) {
          return false;
        }
        // Filter by feature flags
        if (isFeatureEnabled) {
          const featureKey = getFeatureKeyForPath(page.path);
          if (featureKey && !isFeatureEnabled(featureKey)) {
            return false;
          }
        }

        return true;
      });

      // If using favorites only, filter to those
      if (useFavoritesOnly && favorites.length > 0) {
        pages = pages.filter(page => favorites.includes(page.path));
      }

      // Sort by SWIPE_ORDER
      pages.sort((a, b) => {
        const aIndex = SWIPE_ORDER.indexOf(a.path);
        const bIndex = SWIPE_ORDER.indexOf(b.path);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });

      return pages;
    }

    // For menu/all, apply feature gating and Simple Mode
    return ALL_PAGES.filter(page => {
      if (page.requiresAuth && !isAuthenticated) {
        return false;
      }
      
      // Filter for Simple Mode
      if (isSimpleMode && !SIMPLE_MODE_PATHS.includes(page.path)) {
        return false;
      }

      // Filter by feature flags
      if (isFeatureEnabled) {
        const featureKey = getFeatureKeyForPath(page.path);
        if (featureKey && !isFeatureEnabled(featureKey)) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Get Simple Mode paths
   */
  static getSimpleModePaths(): string[] {
    return SIMPLE_MODE_PATHS;
  }

  /**
   * Get favorite pages from user preferences
   */
  static getFavoritePages(userPreferences: any): string[] {
    if (userPreferences?.favoritePages && Array.isArray(userPreferences.favoritePages)) {
      return userPreferences.favoritePages;
    }
    return [];
  }

  /**
   * Get all available pages (for admin/settings)
   */
  static getAllPages(): NavigationPage[] {
    return ALL_PAGES;
  }

  /**
   * Find a page by path
   */
  static getPageByPath(path: string): NavigationPage | undefined {
    return ALL_PAGES.find(page => page.path === path);
  }
  
  /**
   * Get swipe order array
   */
  static getSwipeOrder(): string[] {
    return SWIPE_ORDER;
  }
}
