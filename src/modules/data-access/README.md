# Data Access Module

This directory is the exclusive ownership boundary for database and browser
persistence access. Runtime queries, commands, repositories, database drivers,
schemas, migrations, database provisioning, and IndexedDB primitives live here.

Feature and UI modules may consume typed data-access operations, but must not
import database drivers, Drizzle, raw SQL, or IndexedDB directly.

The complete architecture and extension contract is documented in
`docs/01-architecture/data-layers/25-central-data-access-module.md`.
