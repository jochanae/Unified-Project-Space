# CoinsBloom Database Schema Documentation

This document provides a comprehensive overview of the CoinsBloom database schema, including all tables, relationships, and security configurations.

## Table of Contents

- [Overview](#overview)
- [Core Financial Tables](#core-financial-tables)
- [Budget System](#budget-system)
- [Goals System](#goals-system)
- [Bills & Debts](#bills--debts)
- [Kids Mode](#kids-mode)
- [Family System](#family-system)
- [Professional Network](#professional-network)
- [Security & Audit](#security--audit)
- [Enums](#enums)
- [Database Functions](#database-functions)

## Overview

The CoinsBloom database consists of 90+ tables organized into functional domains. All tables implement Row Level Security (RLS) to ensure data isolation between users.

### Schema Diagram

```
profiles ─────────────────┐
    │                     │
    ├── accounts          │
    ├── transactions      │
    ├── budgets ──────────┤
    ├── goals ────────────┤
    ├── bills             │
    ├── debts             │
    └── kids_profiles ────┤
           │              │
           ├── kid_chores │
           ├── kid_allowances
           └── family_links
```

## Core Financial Tables

### profiles
User profile information linked to Supabase auth.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (matches auth.users.id) |
| email | text | User email |
| first_name | text | First name |
| last_name | text | Last name |
| profile_image_url | text | Avatar URL |
| phone_number | text | Phone for SMS features |
| phone_verified | boolean | Phone verification status |
| partner_id | uuid | Associated partner (B2B) |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

### accounts
Financial accounts (bank, credit cards, investments, etc.)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Owner reference |
| name | text | Account name |
| account_type | account_type | Type enum |
| category | account_category | Asset or liability |
| balance | numeric | Current balance |
| institution | text | Bank/institution name |
| is_manual | boolean | Manual vs Plaid-linked |
| plaid_account_id | text | Plaid reference |

### transactions
Income and expense records.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Owner reference |
| title | text | Transaction description |
| amount | numeric | Transaction amount |
| type | transaction_type | Income or expense |
| category | text | Category |
| merchant | text | Merchant name |
| transaction_date | date | Date of transaction |
| account_id | uuid | Linked account |
| is_recurring | boolean | Recurring flag |
| bloom_burst_id | uuid | Bloom Burst reference |

## Budget System

### budgets
Budget configurations.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Owner reference |
| name | text | Budget name |
| category | budget_category | Category enum |
| amount | numeric | Budget limit |
| spent | numeric | Current spending |
| period | text | Monthly/weekly/etc |
| is_active | boolean | Active status |
| linked_goal_id | uuid | Auto-contribute to goal |
| auto_contribute | boolean | Enable auto-contribute |
| contribution_percent | integer | Percent to contribute |

### budget_alerts
Budget threshold notifications.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Owner reference |
| budget_id | uuid | Budget reference |
| alert_type | text | Warning/critical/over |
| threshold_percent | integer | Threshold that triggered |
| message | text | Alert message |
| is_read | boolean | Read status |
| is_dismissed | boolean | Dismissed status |

### budget_collaborators
Shared budget access.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| budget_id | uuid | Budget reference |
| user_id | uuid | Collaborator |
| role | text | Owner/editor/viewer |
| joined_at | timestamptz | Join date |

## Goals System

### goals
Savings goals.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Owner reference |
| title | text | Goal name |
| description | text | Goal description |
| target_amount | numeric | Target amount |
| current_amount | numeric | Current progress |
| deadline | date | Target date |
| goal_type | goal_type | Personal/collaborative |
| is_archived | boolean | Archive status |
| invite_code | text | Collaboration code |

### goal_contributions
Contributions toward goals.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| goal_id | uuid | Goal reference |
| user_id | uuid | Contributor |
| amount | numeric | Contribution amount |
| is_approved | boolean | Approval status |
| notes | text | Notes |
| receipt_url | text | Receipt image |

### goal_collaborators
Shared goal access.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| goal_id | uuid | Goal reference |
| user_id | uuid | Collaborator |
| role | collaborator_role | Owner/organizer/contributor/viewer |
| joined_at | timestamptz | Join date |

## Bills & Debts

### bills
Recurring bills.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Owner reference |
| name | text | Bill name |
| amount | numeric | Bill amount |
| category | bill_category | Category enum |
| due_date | date | Due date |
| frequency | bill_frequency | Monthly/weekly/etc |
| status | bill_status | Pending/paid/overdue |
| is_autopay | boolean | Autopay enabled |
| reminder_enabled | boolean | Reminders enabled |
| reminder_days_before | integer | Days before due |

### debts
Debt tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Owner reference |
| name | text | Debt name |
| debt_type | text | Type of debt |
| original_balance | numeric | Starting balance |
| current_balance | numeric | Current balance |
| interest_rate | numeric | APR |
| minimum_payment | numeric | Minimum payment |
| creditor | text | Creditor name |
| status | text | Active/paid_off |

## Kids Mode

### kids_profiles
Child account profiles.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Auth user reference |
| parent_user_id | uuid | Original parent |
| first_name | text | Child's first name |
| username | text | Login username |
| pin_hash | text | Hashed PIN (sensitive) |
| security_question | text | Recovery question |
| security_answer | text | Recovery answer (sensitive) |
| age_tier | kid_age_tier | Sprout/sapling/grower |
| current_balance | numeric | Total balance |
| spend_balance | numeric | Spend bucket |
| save_balance | numeric | Save bucket |
| give_balance | numeric | Give bucket |
| avatar_emoji | text | Avatar emoji |
| avatar_url | text | Photo URL |

### kid_chores
Chore assignments.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| kid_id | uuid | Kid profile reference |
| title | text | Chore name |
| description | text | Instructions |
| reward_amount | numeric | Reward for completion |
| status | chore_status | Pending/completed/approved |
| due_date | date | Due date |
| is_recurring | boolean | Recurring chore |
| is_bonus | boolean | Bonus opportunity |
| checklist | jsonb | Sub-task checklist |

### kid_allowances
Allowance configurations.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| kid_id | uuid | Kid profile reference |
| amount | numeric | Allowance amount |
| frequency | text | Weekly/monthly |
| next_payout_date | date | Next payout |
| is_active | boolean | Active status |
| set_by | uuid | Parent who set it |

## Family System

### family_links
Parent-child relationships.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| parent_user_id | uuid | Parent reference |
| kid_profile_id | uuid | Child reference |
| relationship | text | Mom/dad/guardian |
| status | family_link_status | Active/pending |
| can_view_transactions | boolean | Permission flag |
| can_approve_spending | boolean | Permission flag |
| can_set_allowance | boolean | Permission flag |
| can_assign_chores | boolean | Permission flag |

### family_groups
Family group management.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Group name |
| created_by | uuid | Creator |
| invite_code | text | Join code |
| subscription_tier | text | Free/premium |
| max_kids | integer | Kid limit |
| group_message_count | integer | Messages sent |
| group_message_limit | integer | Message limit |

### family_chat_messages
Family messaging.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| family_link_id | uuid | Conversation reference |
| sender_id | uuid | Sender |
| sender_type | text | Parent/kid |
| message | text | Message content |
| is_read | boolean | Read status |

## Professional Network

### professionals
Financial professional profiles.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Auth reference |
| business_name | text | Business name |
| specialty | text | Specialization |
| is_verified | boolean | Verification status |
| rating | numeric | Average rating |
| review_count | integer | Number of reviews |

### professional_reviews
Client reviews for professionals.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| professional_id | uuid | Professional reference |
| reviewer_user_id | uuid | Reviewer |
| rating | integer | 1-5 rating |
| review_text | text | Review content |

## Security & Audit

### user_roles
Role-based access control.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | User reference |
| role | app_role | user/admin/super_admin |

### audit_logs
Security event logging.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | User reference |
| action | text | Action performed |
| entity_type | text | Affected entity type |
| entity_id | text | Affected entity ID |
| details | jsonb | Additional details |
| ip_address | text | Client IP |
| user_agent | text | Browser info |

### bug_reports
Error reports from users.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Reporter |
| error_message | text | Error message |
| error_stack | text | Stack trace |
| component_stack | text | React component stack |
| page_url | text | Page where error occurred |
| status | text | Open/resolved |

## Enums

### account_type
```sql
checking, savings, credit_card, investment, loan, cash, other
```

### account_category
```sql
asset, liability
```

### budget_category
```sql
housing, transportation, food, utilities, insurance, healthcare,
savings, personal, entertainment, other
```

### bill_category
```sql
utilities, housing, transportation, insurance, subscriptions,
phone, internet, streaming, healthcare, education, other
```

### bill_status
```sql
pending, paid, overdue, cancelled
```

### goal_type
```sql
personal, collaborative
```

### collaborator_role
```sql
owner, organizer, contributor, viewer
```

### chore_status
```sql
pending, in_progress, completed, approved, rejected
```

### kid_age_tier
```sql
sprout, sapling, grower
```

### family_link_status
```sql
pending, active, rejected, removed
```

### app_role
```sql
user, admin, super_admin
```

## Database Functions

### Authentication & Authorization

- `has_role(user_id, role)` - Check if user has specific role
- `is_admin(user_id)` - Check if user is admin or super_admin
- `is_parent_of_kid(kid_id, parent_id)` - Verify parent-child relationship
- `is_goal_collaborator(goal_id, user_id)` - Check goal access
- `is_budget_collaborator(budget_id, user_id)` - Check budget access

### Data Access

- `get_linked_kids_profiles(parent_id)` - Get all linked children (safe view)
- `get_own_kid_id()` - Get current user's kid profile ID
- `parent_update_kid_profile(...)` - Safe parent update of kid profile

### Security

- `log_audit_event(action, entity_type, ...)` - Log security events
- `store_plaid_token(item_id, token)` - Store token in vault
- `get_plaid_token(item_id)` - Retrieve token from vault
- `check_and_increment_usage(...)` - Rate limiting helper

### Automation

- `check_budget_alerts()` - Trigger for budget threshold alerts
- `record_balance_snapshot()` - Trigger for balance history
- `update_professional_rating()` - Trigger for review aggregation
- `process_monthly_budget_contributions()` - Monthly goal contributions
