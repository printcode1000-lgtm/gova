# Testability

## Purpose

Preserved operational and architectural detail, relocated here during the 2026-08 architecture reconstruction. Agents use this for implementation guidance.

## Scope

See sections below. Architectural relationships defer to [docs/01-architecture/README.md](../README.md) where applicable.

---

| Layer | How to test |
|-------|-------------|
| Repository | Mock `IDatabaseClient` or in-memory Drizzle |
| Server Service | Mock `IUserRepository` / `IProfileRepository` |
| Business API | Integration tests against route handlers + test DB |
| Client Service | Mock `asolApi` methods |
| Hook | Mock service interface + `QueryClientProvider` |
| UI | Render with pre-seeded `QueryClient` data |

## Principles

- Inject repositories into Commands/Queries via constructor
- Bootstrap modules wire real singletons for production routes
- Client hooks depend on interfaces, not server modules
