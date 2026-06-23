# CoinsBloom Edge Functions API Documentation

This document describes all Supabase Edge Functions available in CoinsBloom.

## Table of Contents

- [Authentication](#authentication)
- [AI Functions](#ai-functions)
- [Plaid Integration](#plaid-integration)
- [Payments](#payments)
- [Notifications](#notifications)
- [Kids Mode](#kids-mode)
- [Scheduled Functions](#scheduled-functions)

## Authentication

All authenticated endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

## AI Functions

### ai-insights

Generates AI-powered financial insights based on user data.

**Rate Limit**: 10 requests/minute per user

**Endpoint**: `POST /functions/v1/ai-insights`

**Request Body**:
```json
{
  "financialData": {
    "income": 5000,
    "expenses": 3500,
    "netCashFlow": 1500,
    "savingsRate": 30,
    "budgetHealth": 85,
    "categories": [
      { "name": "Housing", "value": 1200 },
      { "name": "Food", "value": 500 }
    ],
    "budgetStats": {
      "onTrack": 4,
      "warning": 1,
      "overBudget": 0
    },
    "trendData": [...],
    "goalsData": {
      "current": 5000,
      "target": 10000
    },
    "goalsProgress": 50
  }
}
```

**Response**: Streaming markdown text with insights

---

### bloom-coach-chat

Interactive AI financial coaching chat.

**Rate Limit**: 20 requests/minute per user

**Endpoint**: `POST /functions/v1/bloom-coach-chat`

**Request Body**:
```json
{
  "message": "How can I save more money?",
  "conversationHistory": [
    { "role": "user", "content": "Previous message" },
    { "role": "assistant", "content": "Previous response" }
  ]
}
```

**Response**: Streaming chat response

---

### bloom-coach-insights

Automated comprehensive financial analysis.

**Rate Limit**: 20 requests/minute per user

**Endpoint**: `POST /functions/v1/bloom-coach-insights`

**Request Body**: None (fetches user data automatically)

**Response**:
```json
{
  "summary": "Your finances are in good shape...",
  "insights": ["Insight 1", "Insight 2"],
  "actions": ["Action 1", "Action 2"],
  "warnings": ["Warning 1"],
  "metrics": {
    "netWorth": 50000,
    "savingsRate": "25.5",
    ...
  }
}
```

---

### bill-optimizer

Analyzes bills and suggests optimization opportunities.

**Rate Limit**: 5 requests/minute per user

**Endpoint**: `POST /functions/v1/bill-optimizer`

**Request Body**:
```json
{
  "bills": [
    {
      "name": "Internet",
      "amount": 89.99,
      "category": "utilities",
      "frequency": "monthly"
    }
  ]
}
```

**Response**:
```json
{
  "suggestions": "Markdown formatted suggestions...",
  "totalMonthly": 500,
  "billCount": 10,
  "categories": ["utilities", "subscriptions"]
}
```

---

### voice-command

Processes voice commands for hands-free operation.

**Rate Limit**: 30 requests/minute per user

**Endpoint**: `POST /functions/v1/voice-command`

**Request Body**:
```json
{
  "command": "Add $50 expense for groceries",
  "intent": "transaction",
  "parameters": {
    "amount": 50,
    "type": "expense",
    "category": "groceries",
    "description": "Groceries"
  }
}
```

**Supported Intents**:
- `navigate` - Navigate to a page
- `transaction` - Create a transaction
- `budget` - Create a budget
- `bill` - Mark bill as paid
- `savings` - Add to savings goal
- `query` - Query financial data

**Response**:
```json
{
  "success": true,
  "response": "Added $50 expense: Groceries",
  "transaction": { ... }
}
```

## Plaid Integration

### plaid

Handles Plaid Link integration for bank account connection.

**Endpoint**: `POST /functions/v1/plaid`

**Request Body**:
```json
{
  "action": "create_link_token" | "exchange_token" | "sync_transactions",
  "publicToken": "...",  // For exchange_token
  "itemId": "..."        // For sync_transactions
}
```

**Actions**:

1. **create_link_token**: Generates Plaid Link token for initialization
2. **exchange_token**: Exchanges public token for access token
3. **sync_transactions**: Syncs transactions from connected account

## Payments

### create-checkout

Creates Stripe checkout session for subscriptions.

**Endpoint**: `POST /functions/v1/create-checkout`

**Request Body**:
```json
{
  "priceId": "price_xxx",
  "successUrl": "https://...",
  "cancelUrl": "https://..."
}
```

**Response**:
```json
{
  "sessionId": "cs_xxx",
  "url": "https://checkout.stripe.com/..."
}
```

---

### customer-portal

Opens Stripe customer portal for subscription management.

**Endpoint**: `POST /functions/v1/customer-portal`

**Request Body**:
```json
{
  "returnUrl": "https://..."
}
```

**Response**:
```json
{
  "url": "https://billing.stripe.com/..."
}
```

---

### check-subscription

Checks user's subscription status.

**Endpoint**: `POST /functions/v1/check-subscription`

**Response**:
```json
{
  "active": true,
  "tier": "premium",
  "expiresAt": "2024-12-31"
}
```

## Notifications

### send-push-notification

Sends push notification to user.

**Endpoint**: `POST /functions/v1/send-push-notification`

**Request Body**:
```json
{
  "userId": "uuid",
  "title": "Bill Due",
  "body": "Your internet bill is due tomorrow",
  "data": {
    "type": "bill_reminder",
    "billId": "uuid"
  }
}
```

---

### send-bill-reminders

Scheduled function to send bill due reminders.

**Access**: Cron only (requires CRON_SECRET)

---

### sms-webhook

Processes incoming SMS messages for transaction logging.

**Access**: Public (Twilio webhook)

**Endpoint**: `POST /functions/v1/sms-webhook`

## Kids Mode

### kids-auth

Handles kid login and password recovery.

**Rate Limit**: 5 requests/15 minutes per username

**Endpoint**: `POST /functions/v1/kids-auth`

**Actions**:

1. **lookup**: Find kid profile by username
```json
{
  "action": "lookup",
  "username": "kidusername"
}
```

2. **reset-password**: Reset password with security answer
```json
{
  "action": "reset-password",
  "username": "kidusername",
  "securityAnswer": "answer",
  "newPassword": "newpass123"
}
```

---

### validate-kid-username

Validates username availability for new kid accounts.

**Endpoint**: `POST /functions/v1/validate-kid-username`

**Request Body**:
```json
{
  "username": "newkidusername"
}
```

**Response**:
```json
{
  "available": true
}
```

---

### reset-kid-password

Admin/parent password reset for kids.

**Endpoint**: `POST /functions/v1/reset-kid-password`

**Request Body**:
```json
{
  "kidProfileId": "uuid",
  "newPassword": "newpass123"
}
```

---

### process-allowances

Processes scheduled allowance payments.

**Access**: Cron only

## Scheduled Functions

These functions are triggered by cron jobs:

| Function | Schedule | Description |
|----------|----------|-------------|
| `process-allowances` | Daily | Pays allowances due |
| `send-bill-reminders` | Daily | Sends bill due reminders |
| `send-scheduled-reports` | Weekly | Sends scheduled reports |
| `reset-budgets` | Monthly | Resets monthly budgets |
| `credit-score-alert` | Weekly | Checks for score changes |

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing auth token |
| `RATE_LIMITED` | 429 | Too many requests |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `NOT_FOUND` | 404 | Resource not found |
| `INTERNAL_ERROR` | 500 | Server error |

### Rate Limit Response

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 45
}
```

Headers:
- `Retry-After`: Seconds until rate limit resets
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Seconds until reset
