# Compani Enterprise — Product Specification & Strategic Vision

**Version 1.0 — March 2026 | CONFIDENTIAL**

*Emotionally Intelligent AI Companions for the Workplace*

---

## Executive Summary

Compani is a consumer platform where users build deep, ongoing relationships with AI companions that remember, adapt, and grow alongside them. The core technology — emotional intelligence, persistent memory, proactive engagement, and character consistency — solves a problem that extends far beyond personal use.

**Compani Enterprise** applies this same relationship-first AI to the workplace. Instead of cold FAQ bots, employees get a trusted partner who knows their role, understands company policy, and communicates with warmth and contextual intelligence.

> *"Imagine a flight attendant asking about rest period policies during international flights — and getting a warm, contextual answer from a companion they trust. That's a completely different experience than searching a 400-page PDF."*

---

## Market Opportunity

### The Problem

Enterprise knowledge is trapped in PDFs, wikis, and policy documents that employees rarely read. Existing corporate chatbots are transactional, impersonal, and widely disliked. The gap between "information exists" and "employees actually use it" costs organizations billions in inefficiency, compliance risk, and employee frustration.

### The Opportunity

| Segment | Pain Point | Compani Solution |
|---------|-----------|-----------------|
| Airlines / Hospitality | Complex union rules, safety protocols, shift policies across roles | Role-aware companion pre-loaded with contracts and SOPs |
| Healthcare | Rapidly changing protocols, compliance requirements, credential tracking | Mentor companion with real-time policy access |
| Retail / QSR | High turnover, inconsistent training, scattered operational knowledge | Onboarding buddy that grows with the employee |
| Financial Services | Regulatory complexity, compliance training fatigue | Accountability partner for ongoing compliance |
| Enterprise / Tech | Scattered docs, tribal knowledge loss, new-hire ramp time | Work partner with institutional memory |

---

## What's Already Built

Compani's consumer platform contains infrastructure that maps directly to enterprise needs:

- **Memory System** — Remembers employee's role, seniority, department, past questions, and context over time
- **Connection Modes** — "Mentor/Coach" and "Accountability Partner" map directly to workplace relationships
- **Plans & Check-ins** — Training milestones, certification tracking, shift prep, onboarding checklists
- **Knowledge Cards** — Policy summaries surfaced contextually mid-conversation
- **Safety & Moderation** — Content filtering, crisis detection, and compliance-ready guardrails
- **Multi-Companion Support** — One personal companion + one work companion per user
- **Emotional Detection** — Recognizes frustration, confusion, and stress — adapts tone accordingly
- **Proactive Engagement** — Nudges for training deadlines, policy updates, and check-ins

---

## Enterprise Architecture

### New Capabilities Required

| Capability | Description | Priority |
|-----------|-------------|----------|
| Knowledge Base Upload | Admin uploads PDFs, handbooks, union contracts, SOPs → chunked, embedded, and searchable by the AI in real-time | P0 |
| Org Admin Dashboard | Company admins manage content, view anonymized usage analytics, push policy updates to all companions | P0 |
| SSO / Enterprise Auth | Integration with Okta, Azure AD, SAML for seamless corporate login | P0 |
| Tenant Isolation | Each organization's data, knowledge, and conversations are completely siloed | P0 |
| Role-Based Access | Different companion knowledge based on employee role (e.g., flight attendant vs. gate agent vs. pilot) | P1 |
| Compliance Controls | Audit logs, data retention policies, HIPAA/SOC2 readiness, exportable records | P1 |
| Custom Branding | Organization's logo, colors, and voice personality on their companion | P2 |
| API & Webhooks | Integration with HRIS, LMS, and internal tools for automated updates | P2 |

---

## Use Case Deep Dive: Delta Air Lines

A flight attendant opens Compani and messages their work companion:

> *"Hey, what's the policy on rest periods for flights over 12 hours to Europe?"*

### The companion:

- **Knows** the employee is a flight attendant (role context)
- **Pulls** from the uploaded union contract and FAA regulations (knowledge base)
- **Remembers** the employee asked about European routes last month (memory)
- **Responds warmly**: "Great question! For flights over 12 hours, you're entitled to..." (emotional intelligence)
- **Follows up**: "By the way, the new rest policy update takes effect next month — want me to walk you through the changes?" (proactive engagement)

### Additional Enterprise Scenarios

**New Hire Onboarding**
A new gate agent gets a companion that walks them through training modules, answers policy questions, and checks in on their progress — replacing the "here's a binder" experience.

**Policy Updates**
When the company updates a policy, the companion proactively notifies relevant employees and can answer questions about what changed and why.

**Compliance Training**
Instead of annual compliance videos, employees have ongoing conversations with a companion that reinforces key concepts contextually.

**Shift Prep**
Before a complex shift, the companion briefs the employee on relevant updates, reminders, and any special procedures.

---

## Business Model

| Tier | Target | Pricing Model | Features |
|------|--------|--------------|----------|
| B2C (Current) | Individual users | Freemium + $9.99/mo Premium | Personal companions, full feature set |
| B2B Starter | Small teams (10-50) | $15/seat/month | Shared knowledge base, basic analytics, email auth |
| B2B Professional | Mid-market (50-500) | $25/seat/month | SSO, role-based access, compliance controls, custom branding |
| B2B Enterprise | Large orgs (500+) | Custom pricing | Full tenant isolation, API integrations, dedicated support, SLA |

---

## Competitive Advantage

What separates Compani Enterprise from every corporate chatbot on the market:

- **Emotional Intelligence** — Employees don't just get answers — they get a partner who adapts tone, detects frustration, and communicates with genuine warmth.
- **Persistent Memory** — The companion remembers context across conversations. No more repeating your role, situation, or previous questions.
- **Character Consistency** — Unlike generic AI, each companion maintains a consistent personality that employees grow to trust over time.
- **Proactive Engagement** — The companion doesn't wait to be asked — it nudges about deadlines, policy changes, and training milestones.
- **Dual-Companion Model** — Employees can have both a personal companion (B2C) and a work companion (B2B) — increasing platform stickiness.

---

## Technical Roadmap

| Phase | Timeline | Deliverables |
|-------|----------|-------------|
| Phase 1: Foundation | Q3 2026 | Knowledge base upload (RAG pipeline), tenant isolation, org admin dashboard MVP |
| Phase 2: Auth & Roles | Q4 2026 | SSO integration (Okta/Azure AD), role-based companion knowledge, audit logging |
| Phase 3: Compliance | Q1 2027 | SOC2 Type II certification, HIPAA readiness, data retention controls, export tools |
| Phase 4: Integrations | Q2 2027 | API & webhooks, HRIS/LMS connectors, custom branding toolkit |
| Phase 5: Scale | Q3 2027 | Multi-region deployment, advanced analytics, pilot program results → case studies |

---

## Recommended Next Steps

1. Identify 1-2 pilot organizations for early enterprise testing
2. Build RAG pipeline for document upload and contextual retrieval
3. Design org admin dashboard wireframes and user flows
4. Engage enterprise security consultants for SOC2 readiness assessment
5. Develop enterprise pricing model with pilot organization feedback
6. Create enterprise demo environment with sample knowledge base

---

*This document is confidential and intended for internal strategic planning. The enterprise vision builds on Compani's proven consumer foundation — the emotional intelligence layer is what separates it from every corporate chatbot that employees hate using.*
