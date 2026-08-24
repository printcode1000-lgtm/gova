# Overview Domain

## Purpose

Repository/product-level orientation that does not belong to one implementation capability.

## Read First

- [Technologies](./technologies.md) — primary technology/runtime overview.
- [Contact and Account Deletion](./contact-and-account-deletion.md) — public support and account-deletion behavior.
- [Project Knowledge Base](../README.md) — agent navigation and change workflow.

## Sources of Truth

Current technical facts should be verified against `package.json`, root configuration files, `.env.example` key names, and architecture-generated catalogs. This directory explains the high-level meaning; it should not become a second package or dependency inventory.

## Change Impact

Changes to core runtime versions, framework configuration, application identity, or public account-deletion behavior require reviewing this domain plus the owning architecture/platform/data/release documents.

Use `npx tsx scripts/docs/context.ts <target>` before implementation to resolve the exact related surfaces.
