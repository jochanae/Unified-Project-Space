---
name: Atlas Shaping Framework and Threshold Architecture
description: The 5-dimension internal shaping model and Global→Workspace transition design
---

## The 5-Dimension Shaping Framework
Atlas internally tracks: PROBLEM / AUDIENCE / GAP / VISION / HARD PART.
These are never shown to the user as a checklist — internal scaffolding only.
Hard ceiling: 5 questions. Stop early if dimensions are inferable.

**Why:** Max-5 rule prevents Atlas from overstaying its welcome in Global. Stop-early rule prevents mechanical checkbox questioning.

**How to apply:** In CONVERSATIONAL_EXPANSION_PROTOCOL and IDEA_MODE_POSTURE. Both use same dimensions, different energy (Idea Mode is more expansive in phases 1-2).

## The Threshold — Global→Workspace Transition Signal
At threshold, Atlas emits `PROJECT_READY:{"projectName":"...","reason":"..."}` (NOT `NAVIGATE_TO`, NOT `create_project` tool call).

**Why:** `NAVIGATE_TO` auto-navigates, bypassing the CommitPill UI. `create_project` tool creates server-side but `handleHandoff()` in home.tsx creates client-side — they were duplicates. CommitPill is the correct UX pattern.

**How to apply:** CommitPill in home.tsx watches shellStore shapingStatus. PROJECT_READY → handoffSignal → shapingStatus="ready" → CommitPill shows "Open Workspace". User taps → handleHandoff() creates project → navigate.

## Global Boundaries (never ask in Global)
Project naming, pricing, architecture, tech stack, features, milestones, timelines.
If user volunteers any of these → treat as signal, transition immediately.

## CommitPill States
- "shaping" state: hidden (return null) — button only appears at threshold
- "ready" state: "Open Workspace" (was "Enter Workspace →")
- "transitioning" state: "Opening workspace…"

## Workspace Arrival (Threshold Moment)
When fresh workspace has memories from Global shaping, first message should surface what was brought over (✓ Problem, ✓ Audience, ✓ Constraints) then ask for name only if generic.
Rule: never ask user to re-explain what was already shaped in Global.
