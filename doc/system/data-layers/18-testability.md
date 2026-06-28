# Testability

| Layer | How to test |
|-------|-------------|
| Repository | Mock `IDatabaseClient` or in-memory Drizzle |
| Server Service | Mock `IUserRepository` / `IProfileRepository` |
| Business API | Integration tests against route handlers + test DB |
| Client Service | Mock `govaApi` methods |
| Hook | Mock service interface + `QueryClientProvider` |
| UI | Render with pre-seeded `QueryClient` data |

## Principles

- Inject repositories into Commands/Queries via constructor
- Bootstrap modules wire real singletons for production routes
- Client hooks depend on interfaces, not server modules
