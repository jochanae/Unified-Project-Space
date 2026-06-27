---
name: Axiom Product Reset
description: Builder-first product direction, three-phase roadmap, and design principles established June 2026
---

## The reset

User articulated the core problem: too many surfaces competing with the one thing worth evaluating — "Can Atlas reliably produce something great?" Every unfinished surface adds cognitive overhead before that question is answered.

**The rule:** The builder is the product. Every other surface must either amplify the builder or stay out of the way.

## The test question

Instead of "Does this improve build quality?", use:
> **Does this surface reduce the amount of thinking the user has to do?**

If a feature requires a paragraph of explanation before someone understands why it exists, it hasn't earned its place.

## Three-phase roadmap (approved)

**Phase 1 — Trust:** Better UI/code generation. Conversation continuity. Clean streaming. Remove status theater. No new surfaces until this is solid.

**Phase 2 — Intelligence:** Atlas reads Forge, Ledger, conversation history automatically before building. Users should never have to open the Ledger to verify what Atlas should already know. Atlas explains decisions naturally ("I'm following your previous decision to prioritize mobile-first").

**Phase 3 — Visibility:** Axiom Flow becomes Atlas's reasoning map (nodes = committed decisions, answering "Why did you build it this way?"). Master Map becomes a portfolio navigator. Parking Lot resurfaces ideas when relevant.

## Surface verdicts from audit

- **Workspace chat** — Core. Simplify presentation, preserve function.
- **Forge** — Keep only if Atlas demonstrably uses it before building.
- **Ledger** — Infrastructure Atlas consults, never a destination for the user.
- **Parking Lot** — Keep as capture; Atlas resurfaces ideas, user never navigates there.
- **Axiom Flow** — Not a diagram. Must become Atlas's reasoning map (explorable explanation of *why* the project is built the way it is). Hidden until Phase 3.
- **Manifest** — Remove from primary nav until it's genuinely project-aware (not template-driven).
- **Master Map** — Optional portfolio view. Filter test/garbage projects. Never a required stop.

## Freeze rule

No new user-facing surfaces until Phase 1 is complete. Infrastructure work (continuity, Forge feed, generation quality) is allowed — users don't see it as "features" but it directly builds trust.

## Status theater removed (Phase 1 start)

Removed from ChatComposer:
- "BUILD MODE · READY" / "PLAN MODE · ACTIVE" banner
- "Ready to build…" / "Ready to strategize…" italic placeholder
- planBannerVisible state cascade
- "AUTO APPLY" / "REVIEW WRITES" pill → compact ⚡ icon
- Plan mode button redesigned: ☐ Plan [existing icon] (checkbox + label, no colored frame)
- Placeholders changed to "Describe what you want to build…"

**Why:** A confident builder doesn't narrate itself. Silence when idle. Real progress labels when working ("Writing authentication…", not "Executing build…").
