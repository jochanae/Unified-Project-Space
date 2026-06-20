---
name: Continuity Architecture — Transcript + Resume
description: The two-artifact handoff model for global conversation → workspace transition
---

# Continuity Architecture Decision

## The model (user-confirmed, production target)

Global conversation → project created → TWO things must happen:

1. **Full transcript copied into workspace thread** (for the human)
   - Purpose: trust and continuity. "Atlas came with me."
   - Implementation (two-layer):
     a. **Visual layer**: sessionStorage `atlas-opening-conversation` → `normalizeThinkFreelyThread` → `setMessages` in workspace.tsx (already wired, survives nav)
     b. **Persistence layer**: `POST /api/projects/:id/append-thread` writes conversation snapshot to `nexusMessagesTable` with `projectId = newProjectId` (added; survives refresh; AI context)

2. **Resume artifact generated from transcript** (for the system)
   - Purpose: compressed, structured signal for Manifest, builders, future agents
   - Implementation: same `POST /api/projects/:id/append-thread` call — generates Resume artifact
   - Shape: { threadSummary, suggestedFirstBuild, intent, audience, tone, clarityScore }

## What's built (Phase 2 complete)

- ✅ Resume artifact generated and stored (`artifactsTable` type="resume")
- ✅ threadSummary surfaced as workspace opening greeting (commitCarryover.greeting)
- ✅ ManifestMode reads Resume artifact via GET /api/projects/:id/resume
- ✅ Visual transcript transfer: sessionStorage → workspace chat UI (OPENING_CONVERSATION_STORAGE_KEY)
- ✅ Persistent transcript: nexusMessagesTable write on append-thread (idempotent, filters empty/genesis msgs)

## Idempotency guard
`append-thread` checks if any nexus messages with `projectId = id AND userId = userId` already exist before inserting. Safe to call multiple times.

## Why both matter
- Summary-only: feels efficient but emotionally empty, loses nuance
- Transcript-only: too noisy for Manifest/builders, they need compressed artifact
- Both: human gets the chain, system gets the brief

## Rule
**Do not remove the transcript copy step to "simplify."**
Resume is NOT a replacement for the transcript — they serve different consumers.
