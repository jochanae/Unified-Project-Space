---
name: Explainability Layer rules
description: Governing rules for the Atlas Explainability Layer — how Atlas shows its work without creating new systems
---

## Rules (user-confirmed, founder-level)

1. **No new tables** — consume existing systems: Genome, Decisions, Entries, Sessions, Conversations, Project Health
2. **No new primary data flows** — expose and explain what already exists
3. **Never store conclusions** — store evidence, generate conclusions dynamically every request
4. **Three scopes, kept separate** — Project / Portfolio / Global (do not mix)
5. "Do not create another database or another system. Expose and explain what already exists."

**Why:** Conclusions become stale. Evidence is the permanent thing. A stored "Compani has momentum" is wrong tomorrow. The raw counts (24 conversations, 6 decisions) remain true.

## Three evidence scopes

**Project** — signals about one project
- conversationsLast7Days, totalSessions, committedDecisions, parkedItems, openBlockers, openConstraints, openQuestions, confidenceScore
- Derivations: human-readable explanation of how each conclusion was reached
- Lives in: GET /api/projects/:id/genome → health.evidence

**Portfolio** — cross-project reasoning (not yet built)
- Per-project: conversation count, decision count, last activity, momentum
- Drives conclusions like "Compani has the most momentum right now"
- Planned: GET /api/evidence/portfolio

**Global** — user-level patterns across time (Phase C, not yet built)
- e.g. "You tend to create projects before defining audiences"
- Planned: Phase C (Atlas Memory Spine)

## What is built (Phase B-1)

- `computeProjectHealth` in genome.ts returns `evidence` block alongside health conclusions
- `ProjectPulsePanel.tsx` fetches genome on open, shows "Atlas Observed" (evidence) then "Atlas Concludes" (conclusions with derivation notes)
- Pattern: evidence bullets first → conclusion with note showing the signal that drove it
