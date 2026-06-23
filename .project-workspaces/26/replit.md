# CoinsBloom - Family Financial Management Platform

## Overview

CoinsBloom is a comprehensive personal finance application designed for families. It helps users manage budgets, track spending, set savings goals, pay bills, and teach kids financial literacy through a dedicated "KidsBloom" portal. The app is built as a Progressive Web App (PWA) with offline support, push notifications, and biometric authentication capabilities.

The platform targets two primary user groups:
1. **Adults** - Full financial dashboard with budgeting, debt management, credit tracking, vision boards, and AI-powered coaching
2. **Kids** - Simplified "KidsBloom" interface with age-appropriate financial education, chores/allowance tracking, and gamified learning

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with SWC for fast compilation
- **Routing**: React Router DOM for client-side navigation
- **State Management**: TanStack Query (React Query) for server state, React Context for auth and app state
- **Styling**: Tailwind CSS with CSS variables for theming, supports dark mode via next-themes
- **UI Components**: shadcn/ui (Radix primitives) for accessible, customizable components
- **Animations**: Framer Motion for transitions and micro-interactions

### Backend & Data
- **Backend-as-a-Service**: Supabase for authentication, database, and storage
- **Authentication**: Supabase Auth with Google OAuth, WebAuthn/Passkey support, and MFA (TOTP)
- **Database**: PostgreSQL via Supabase (tables for users, transactions, accounts, goals, budgets, bills, debts, kids profiles, etc.)
- **File Storage**: Supabase Storage for receipts, vision board images, and kid avatars

### Key Architectural Patterns

**Protected Routes**: `ProtectedRoute` component wraps authenticated pages, redirecting to `/auth` when needed.

**Feature Gating**: `useFeatureGating` hook and `FeatureGate` component manage free vs premium feature access. Premium features include collaborative goals/budgets, expanded KidsBloom, and unlimited AI coaching.

**Offline Support**: 
- Service worker for PWA caching (`vite-plugin-pwa`)
- Custom `offlineQueue` utility queues transactions when offline
- `useOfflineSync` hook processes queue when connection returns

**Session Management**:
- Adults: Supabase session with idle timeout (15min warning, 30min logout)
- Kids: Separate localStorage-based session (`kidsbloom_session`) with username/password auth

**Dashboard Customization**: `DashboardEditContext` allows users to hide/show dashboard cards, persisted to localStorage.

### Application Structure

```
src/
├── components/       # Reusable UI components and feature-specific components
│   ├── ui/          # shadcn/ui primitives
│   ├── auth/        # Auth-related components (ProtectedRoute, IdleTimeoutModal)
│   └── ...          # Feature components (dashboard cards, forms, modals)
├── contexts/        # React contexts (AuthContext, OfflineSyncContext, DashboardEditContext)
├── hooks/           # Custom hooks (useFeatureGating, usePushNotifications, useMFA, etc.)
├── pages/           # Page components mapped to routes
│   ├── kidsbloom/   # Kid-specific pages (login, dashboard, learn, settings)
│   └── admin/       # Admin pages for content management
├── integrations/    # Third-party integrations (Supabase client)
├── data/            # Static JSON data for lessons, videos, games
└── utils/           # Utility functions (offlineQueue, etc.)
```

### PWA Configuration
- Manifest with app icons and shortcuts
- Service worker for push notifications (`/sw.js`)
- Install prompt handling
- Standalone display mode with portrait orientation

## External Dependencies

### Core Services
- **Supabase**: Authentication, PostgreSQL database, file storage, real-time subscriptions
- **Google OAuth**: Social sign-in provider configured through Supabase

### Third-Party Libraries
- **@tanstack/react-query**: Data fetching and caching
- **react-helmet-async**: SEO meta tag management
- **date-fns**: Date formatting and manipulation
- **recharts**: Data visualization (inferred from chart references in tests)
- **canvas-confetti**: Celebration animations
- **dompurify**: HTML sanitization for user-generated content
- **zod**: Schema validation (via @hookform/resolvers)

### Development & Testing
- **Playwright**: End-to-end testing across browsers (Chrome, Firefox, Safari, mobile)
- **ESLint + TypeScript ESLint**: Code linting
- **lovable-tagger**: Development component tagging (Lovable platform integration)

### Storage Buckets (Supabase)
- `vision-images`: Vision board images
- `receipts`: Transaction receipt uploads

### Push Notifications
- Web Push API with VAPID keys
- Custom service worker at `/sw.js` for handling push events