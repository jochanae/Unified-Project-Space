---
name: Atlas Architecture 2.0 Constitution
description: The governing constitution for all Atlas development — five pillars, Application Model, No Duplicate Truth rule, canonical ownership table, three-question evaluation test.
---

## What this is

The Architecture 2.0 document is not documentation. It is governance. Every new feature must pass its three-question evaluation test and point to one of the five pillars. Read it before planning or building anything.

Full document: `.local/atlas-architecture-2.0.md`

## The sentence that governs everything

> "Atlas remembers what it agreed to build."

## The No Duplicate Truth Rule

Every piece of information has exactly one canonical owner. No information has two primary owners. Before creating any new data store or field, check the ownership table in the document.

## The five pillars (in execution order)

1. **Builder Foundation** — precision editing, rollback, artifact scoping
2. **Application Model** — canonical per-project object (Phase 2A: structure; Phase 2B: migrations)
3. **Describe → See** — Blueprint materializes live from Application Model; approval gates the model
4. **Workspace Unification** — ten views of the same project, not ten tools
5. **Memory** — the Application Model's version history (not a separate system)

## Key ownership decisions

- Genome = computed projection of Application Model (never independently stored)
- Ledger = decision history, each entry references an Application Model field
- Blueprint/Sketch = visual rendering of Application Model (not a separate data store)
- Flow Map = relationship graph derived from Application Model pages + relationships
- Intent, Pages, Components, Data, Logic, Build State = all canonical in Application Model

## The three-question test (apply before every feature)

1. Which pillar does this belong to?
2. Does this reduce or increase the number of canonical sources of truth?
3. Does this make "Atlas remembers what it agreed to build" more true?

**Why:** Without this document, each agent session re-invents vocabulary and ownership independently, accumulating duplicate sources of truth. This is the reference that prevents drift.

**How to apply:** Before creating any new table, route, or component, read `.local/atlas-architecture-2.0.md` and answer the three questions. If the answers are "none," "increases," and "no," don't build it yet.
