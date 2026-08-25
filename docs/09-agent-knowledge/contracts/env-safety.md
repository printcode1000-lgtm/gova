# Env Safety Matrix

## Purpose

Defines the Env Safety Matrix: a catalog of every environment variable **name** the repository reads or assigns, who consumes it, and which runtime it affects — with a single, absolute rule that values never enter documentation or generated knowledge.

## What It Covers

Every environment key discovered from `.env.example`, `process.env.KEY` reads in source, and root-command assignments (`KEY=value node script.js`-style invocations in `package.json` scripts). This is the documentation-facing view of the `environment-key` nodes and `uses-environment` edges already defined in [Knowledge Schema](../knowledge-schema.md).

## Fields — Key Names Only

| Field | Meaning |
|---|---|
| Key name | The exact `^[A-Z][A-Z0-9_]*$` identifier — never a value, never an example value, never a partially-redacted value. |
| Consumers | Source files/commands/packages that read or assign the key. |
| Runtime(s) affected | Which of Development/Web/Static `out/`/Android/iOS/services/tooling the key is relevant to. A `NEXT_PUBLIC_*` key is almost always bundled into the static/native client payload; a server-only key must never leak into a `NEXT_PUBLIC_*` name. |
| Provisioning surface | Where the value is supplied in practice (`.env.local`, Vercel project environment, cloud-agent secret store, Fastlane/CI secret) — described as a procedure, never as the value itself. |
| Required/optional | Whether the runtime fails without it. |

## Redaction Is Absolute

- Documentation and generated knowledge store **names only**. No default value, no "example" value that happens to be a real secret shape, no partially masked value.
- Root-command text that embeds an assignment (`SECRET_KEY=... node script.js`) is rendered with the assignment replaced by `<redacted>` wherever it appears in generated operational output — this is a probed invariant (`npm run architecture:check` includes a redaction probe that fails if a known-sensitive or known-visible value ever leaks through).
- If a key's very name is sensitive enough to imply structure worth hiding, that is still fine to document as a name; the rule is about the **value**, never the identifier.

## Why Names Only, Never Values

An agent (or a generated catalog committed to the repository) that includes a real secret value creates a permanent, hard-to-purge leak in Git history, independent of whether the file is later corrected. Treating environment knowledge as name-and-relationship-only means the catalog is exactly as safe to publish, share, and feed into external tooling as the rest of the (non-secret) Knowledge Graph.

## Regeneration

The matrix is `generated` truth, derived from `.env.example`, source `process.env` reads, and command-assignment scanning — not hand-maintained. Regenerate with:

```bash
npm run docs:generate
# or
npm run architecture:docs
```

Never hand-edit the generated matrix. If a key is missing or misattributed, fix `.env.example`/the source read/the command definition, then regenerate.

## Verification

```bash
npm run docs:ci
npm run architecture:check   # includes the environment-assignment redaction probe
```

## Related Documents

- [API Contract Catalog](./api-contracts.md)
- [Generation and Drift](../generation-and-drift.md) — "Secret-Safety Invariant" section
- [Knowledge Schema](../knowledge-schema.md)
- [Data Task Template](../templates/data-task.md)
