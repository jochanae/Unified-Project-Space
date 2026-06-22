---
name: Axiom Memory Architecture Roadmap
description: Agreed V2–V5 sequencing for project memory, retrieval, and RAG — do not skip phases
---

## The roadmap

```
V2   → synthesizeProjectMemory() + three triggers + "Refresh Atlas Memory"
         (make the snapshot smarter)

V3   → Query interface (text search over ledger/sessions/parking)
         (make the data findable without code)

V4   → Vector embeddings + semantic retrieval
         (make the data findable by meaning)

V5   → Full RAG loop (Atlas retrieves before answering)
         (close the loop)
```

## V2 detail (approved scope)

- `synthesizeProjectMemory(projectId)` — pulls Genome + Ledger + Sessions + Parking Lot into a typed `ProjectMemory` object; `generateAtlasMd` consumes this instead of raw genome
- New genome fields: `stack: text[]`, `protectedAreas: text[]`, `constraints: text[]` (minimal, targeted)
- Three regeneration triggers only (not on every ledger commit):
  - **Event 1 — Activation**: `POST /projects/:id/activate` already exists; add ATLAS.md push
  - **Event 2 — Major genome change**: diff-based detection in PATCH /genome (purpose/wedge/audience changed)
  - **Event 3 — Manual**: `POST /projects/:id/refresh-atlas-memory`; user sees "Refresh Atlas Memory"
- GitHub push utility: `pushAtlasMdToRepo(projectId, userId)` — updates ATLAS.md in-place, single commit per refresh
- User-facing language: "Refresh Atlas Memory" / "Update Project Memory" (never "regenerate ATLAS.md")

## Three memory layers (architectural principle)

```
Human layer   →  PROJECT.md  (what is this, why, who, what's unresolved)
Agent layer   →  ATLAS.md    (how should I behave inside this project)
System layer  →  Genome + Ledger + Sessions + Parking Lot
```

## Why RAG is not now

- RAG quality depends entirely on data quality and structure
- The work done to fix COMMIT lifecycle, genome seeding, session seeding IS the RAG prerequisite
- V3 (text search over existing SQL) is 80% there already — it's a product decision not a prerequisite
- Don't build V5 without V2 being solid; the snapshot must be trustworthy before retrieval is useful

**Why:** skipping phases produces confident-sounding wrong answers, which is worse than no retrieval.
**How to apply:** when RAG/embeddings come up, check that V2 synthesizeProjectMemory() is solid first.
