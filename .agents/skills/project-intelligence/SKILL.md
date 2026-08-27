---
name: project-intelligence
description: Continuous Project Intelligence system for maintaining a structured, living knowledge model of the repository. Use to query architectural invariants, package boundaries, runtime flows, data contracts, and conventions.
---

# Continuous Project Intelligence System

This skill maintains a living, persistent mental and structured knowledge model of the Gova repository under `.agents/skills/project-intelligence/knowledge/`.

## Entry Points & Navigation

Start with the [Knowledge Index](./knowledge/INDEX.md) to discover the core architecture and navigate to specialized knowledge modules:

- [Architecture & Invariants](./knowledge/architecture.md)
- [Sealed Packages & Ownership](./knowledge/packages.md)
- [Dependencies & Vendor SDKs](./knowledge/dependencies.md)
- [Runtime & Execution Flows](./knowledge/runtime-flows.md)
- [Data Flows & Storage Topology](./knowledge/data-flows.md)
- [Development Conventions & Rules](./knowledge/conventions.md)
- [Architectural Decisions (ADRs)](./knowledge/decisions.md)
- [High-Risk Areas & Technical Debt](./knowledge/risks.md)
- [Unresolved Questions & Inspection Log](./knowledge/unresolved.md)

## Operating Principles for Agents

1. **Source of Truth Priority**:
   `Current Implementation` → `Project Documentation / Rules` → `Persistent Knowledge Files` → `Previous Assumptions`.
2. **Read Before Change**:
   Run `npx tsx scripts/docs/context.ts <target>` and consult the relevant knowledge file before making modifications.
3. **Incremental Knowledge Update**:
   When files change, determine the affected domain, follow dependencies, and update the specific knowledge file(s) without rewriting the entire index.
4. **Knowledge Consolidation Pass**:
   At the end of every investigation or task, consolidate new findings into the knowledge files and record unresolved areas.
5. **No Knowledge Pollution**:
   Keep facts structured, concise, verified, and traceable to code. Avoid storing raw logs, code duplicates, or speculative notes.
