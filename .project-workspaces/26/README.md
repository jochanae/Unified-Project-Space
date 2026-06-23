# CoinsBloom - Personal Finance Application

CoinsBloom is a comprehensive personal finance management platform designed to help individuals and families manage their money, track spending, set goals, and build healthy financial habits.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Documentation](#documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)

## Features

### Core Financial Management
- **Dashboard**: Real-time overview of financial health with net worth, spending trends, and goal progress
- **Transactions**: Track income and expenses with categorization and merchant tagging
- **Budgets**: Create and monitor monthly budgets with alerts at configurable thresholds
- **Bills**: Manage recurring bills with payment tracking and due date reminders
- **Goals**: Set savings goals with progress tracking and collaborative goal sharing
- **Debts**: Track and manage debt repayment with payoff strategies
- **Accounts**: Link bank accounts manually or via Plaid integration

### Advanced Features
- **AI Insights**: AI-powered financial analysis and recommendations
- **Bloom Coach**: Personalized financial coaching with chat interface
- **Voice Commands**: Voice-activated transaction entry and queries
- **Vision Board**: Visual goal-setting with image uploads
- **Credit Score Tracking**: Monitor and improve credit score
- **Reports**: Comprehensive financial reports with export options

### Family Features
- **Kids Mode**: Age-appropriate financial education for children
- **Chores & Allowances**: Manage kids' chores with reward tracking
- **Family Chat**: Secure messaging between family members
- **Parental Controls**: Manage kids' access and permissions

### Professional Network
- **Financial Professionals**: Find and connect with verified advisors
- **Partner Integrations**: B2B partnerships with financial services
- **Referral Program**: Earn commissions through B2B referrals

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React + Vite)                   │
├─────────────────────────────────────────────────────────────────┤
│  React 18 │ TypeScript │ Tailwind CSS │ Shadcn/UI │ React Query │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Backend                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Auth       │  │   Database   │  │   Edge Functions     │  │
│  │ - Email/Pass │  │   (Postgres) │  │   (Deno)             │  │
│  │ - OAuth      │  │ - 90+ Tables │  │ - AI Insights        │  │
│  │ - MFA        │  │ - RLS        │  │ - Voice Commands     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │   Storage    │  │   Realtime   │                            │
│  │ - Avatars    │  │ - Live Chat  │                            │
│  │ - Receipts   │  │ - Notifs     │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                             │
├─────────────────────────────────────────────────────────────────┤
│  Plaid │ Stripe │ OpenAI │ Twilio │ Resend │ Google OAuth      │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
├── src/
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions
│   ├── pages/            # Page components
│   └── integrations/     # External service integrations
├── supabase/
│   ├── functions/        # Edge functions
│   └── config.toml       # Supabase configuration
├── e2e/                  # Playwright E2E tests
├── docs/                 # Documentation
└── .github/workflows/    # CI/CD pipelines
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd coinsbloom
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Run tests**
   ```bash
   npx playwright test
   ```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key | Yes |
| `VITE_SENTRY_DSN` | Sentry error tracking DSN | Production |

## Documentation

- [Database Schema](docs/DATABASE_SCHEMA.md) - Complete database documentation
- [API Reference](docs/API_REFERENCE.md) - Edge function API documentation

## Testing

### E2E Tests (Playwright)

```bash
# Run all tests
npx playwright test

# Run specific batch
./scripts/run-tests.sh 1  # Landing & Auth

# Run with UI mode
npx playwright test --ui
```

### Test Batches

1. Landing & Auth
2. Dashboard & Goals
3. Budgets & Bills
4. Accounts & Transactions
5. Debts & Credit
6. Vision & Reports
7. Settings & Kids
8. Accessibility & Navigation

## Deployment

### Lovable (Recommended)

The app deploys automatically through Lovable. Frontend changes require clicking "Update" in the publish dialog, while backend changes deploy immediately.

### Self-Hosting

See [Lovable self-hosting docs](https://docs.lovable.dev/tips-tricks/self-hosting) for detailed instructions.

## Security

### Implemented Security Measures

- **Row Level Security (RLS)** on all 90+ tables
- **SECURITY DEFINER functions** for sensitive operations
- **Vault integration** for sensitive tokens
- **Rate limiting** on AI endpoints
- **Sentry integration** for error monitoring
- **Audit logging** for security events

## Technologies

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Shadcn/UI
- **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions)
- **Testing**: Playwright
- **Monitoring**: Sentry
- **CI/CD**: GitHub Actions

## License

Proprietary - All rights reserved.
