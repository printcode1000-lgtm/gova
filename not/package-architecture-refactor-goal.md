# Gova Package Architecture Refactor Goal

## Required Outcome

- Inspect **every Package that currently exists** and identify the responsibilities it actually owns, not merely what its current name suggests.
- Detect every package that contains more than one independent responsibility, then **split it into smaller packages** where needed.
- Create **new packages** whenever a capability, domain, infrastructure concern, runtime concern, transport concern, or ownership boundary has no clear independent owner.
- Redistribute existing code so that every responsibility has **exactly one owner**.
- Eliminate **dual ownership** completely: the same capability, rule, service, adapter, persistence responsibility, or runtime authority must never be logically owned by two packages.
- Enforce the **Single Responsibility Principle at package level**, not only at file or class level.
- Establish explicit separation between:
  - Domain
  - Application
  - Infrastructure
  - Data access
  - Runtime/config
  - Transport/API
  - Platform capabilities
  - Composition/wiring
- Prevent packages from knowing implementation details outside their responsibility and minimize the dependency graph as aggressively as correctness allows.
- Make the **Composition Root smaller, faster, and more precise** so that:
  - it does not load unused packages or capabilities,
  - it does not centralize unrelated wiring,
  - every Runtime/Deployment receives its own exact composition,
  - every composition uses the smallest reachable dependency graph,
  - unnecessary dynamic imports and registrations are eliminated.- Review the existing `*-composition` packages themselves rather than treating them as automatically correct, and decide whether each should be:
  - split,
  - partially merged,
  - or replaced with more specialized composition packages.
- Preserve the governing principle:
  **One Capability → One Owner → One Public Door → One Explicit Composition.**
- Perform the eventual refactor without feature loss, temporary shared ownership, or transitional duplicate authorities.
- **No compatibility layers may remain after the final cutover.** The completed architecture must contain no compatibility packages, forwarding exports, deprecated aliases, legacy facade modules, adapter shims that exist only to preserve old package paths, parallel old/new APIs, or temporary translation layers. Every consumer must use the final owner package and final public door directly.
- Any newly created architectural unit must be a **proper sealed Package that satisfies all Gova package rules**. Do not introduce a new capability as an unregistered module, internal pseudo-package, arbitrary folder, parallel ownership surface, or any other substitute for a project-compliant package.
- Every new package must therefore satisfy the repository package contract, including ownership registration, architectural layer assignment, explicit package exports, independent tests/gates, dependency restrictions, vendor ownership rules where applicable, and composition wiring rules.
- Produce a complete target architecture that explicitly identifies:
  - packages that remain,
  - packages that are removed,
  - packages that are split,
  - new packages that are created,
  - the exact responsibility owned by every final package,
  - the exact allowed dependencies and public door of every final package,
  - and the final Composition Root topology after reconstruction.

## Core Intent

This is not merely a request to split `data-core` or a few large packages. The objective is to **redraw the ownership boundaries of the entire Gova repository** so the final architecture is single-owner, single-responsibility, minimal-dependency, and runtime-specific, with the Composition Root transformed from a broad wiring board into precise compositions for each runtime and deployment.