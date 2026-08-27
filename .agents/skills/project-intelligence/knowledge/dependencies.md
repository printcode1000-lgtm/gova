# Dependency Architecture & Isolation Rules

## Cross-Package Dependency Directions

The dependency flow between architectural layers is strictly hierarchical and enforced by static analysis.

```text
               ┌────────────────────────┐
               │   architecture-core    │ (Reads all packages via AST)
               └────────────────────────┘
                           │
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
┌───────────────┐                       ┌──────────────┐
│  src/features │                       │ *-composition│
└───────┬───────┘                       └──────┬───────┘
        │                                      │
        ▼                                      ▼
┌──────────────────────────────────────────────────────┐
│                  *-core (Capability)                 │
│  (e.g., data-core, native-core, storage-core, etc.)  │
└──────────────────────────┬───────────────────────────┘
                           │
                           ▼
               ┌────────────────────────┐
               │  account-declarations  │ (Imports NOTHING)
               └────────────────────────┘
```

### Layer Dependency Rules

| Layer | Permitted Outgoing Dependencies | Strictly Forbidden Dependencies |
|---|---|---|
| **Enforcement** (`architecture-core`) | Toolchain / TypeScript AST APIs | Runtime application or package imports |
| **Declarations** (`account-declarations`) | None (0 imports) | Any external module or internal package |
| **Bridge** (`account-bridge`) | `native-core`, `signed-token-core`, `account-declarations` | Direct backend databases, Server SDKs |
| **Capability** (`*-core`) | Other `*-core` packages (declared doors only) | `@/...` (Application code), unowned vendor SDKs |
| **Composition** (`*-composition`) | `@/features/*`, declared `@asol/*` doors | Other composition packages |
| **Application** (`src/`) | Declared `@asol/*` package doors | Package internal paths (`packages/*/src/...`), unowned vendor SDKs |

---

## Vendor SDK Ownership Map

External third-party SDKs are strictly sealed behind owning capability packages. Application code and non-owning packages are forbidden from importing them:

| Vendor SDK / Module | Exclusive Owner Package | Purpose |
|---|---|---|
| `better-sqlite3` | `@asol/data-core` | Local SQLite database driver |
| `@libsql/client` | `@asol/data-core` | Cloud Turso libSQL database driver |
| `drizzle-orm` / `drizzle-orm/*` | `@asol/data-core` | ORM query builder and schema engine |
| `@aws-sdk/client-s3` | `@asol/storage-core`, `@asol/ota-core` | Cloudflare R2 object storage & OTA bundle distribution |
| `@aws-sdk/s3-request-presigner` | `@asol/storage-core` | Presigned URL generation for client direct uploads |
| `@capacitor/*` (all 20+ plugins) | `@asol/native-core` | Mobile device APIs (camera, geolocation, storage, push, haptics) |
| `@capawesome/*` / `@capgo/*` | `@asol/native-core` | Enhanced file picker & speech recognition |
| `web-push` | `@asol/notifications-core` | Web browser push notification delivery |
| `google-auth-library` | `@asol/notifications-core`, `@asol/ota-core` | FCM HTTP v1 OAuth2 tokens & Google Play publishing API |
| `maplibre-gl` | `@asol/map-core` | Interactive vector map rendering |
| `sharp` | `@asol/branding-core` | Icon and splash screen rasterization |
| `@vercel/sandbox` | `@asol/vercel-deploy-core` | Programmatic Vercel deployment orchestration |

**Root-Owned Vendor Files**:
- `capacitor.config.ts` is explicitly owned by `@asol/native-core` via `ROOT_VENDOR_OWNED_FILES`.

---

## Feature Internal Vocabulary & Structure Boundaries

Application features under `src/features/*` must strictly adhere to the approved internal directory vocabulary enforced by `packages/architecture-core`:

- **Approved `src/` Roots**: `app`, `core`, `features`, `shared`.
- **Approved Feature Subdirectories**:
  - `domain/`: Pure business entities, schemas, calculations, and domain types.
  - `application/`: Application services, use cases, and client state managers.
  - `presentation/`: React UI components, cards, forms, and client views.
  - `infrastructure/`: External drivers and infrastructure bridges.
  - `ports/`: Abstract port definitions and adapter bindings.
  - `server/`: Server-only services, route handlers, and database adapters.
  - `tests/`: Feature unit, integration, and contract tests.
- **Forbidden App Roots**: `modules`, `components`, `hooks`, `lib`, `theme`, `locales`.

---

## Composition Feature Seams (`COMPOSITION_FEATURE_SEAMS`)

Composition packages (`*-composition`) are deployment roots. To prevent broad imports from dragging unrelated dependencies or credentials into isolated microservices, composition packages may bypass feature doors only through exact paths declared in `packages/architecture-core/src/registry/composition-feature-seams-registry.ts`:

- `@asol/notifications-composition`: `@/features/data/ports/data-core-runtime-config-ports`
- `@asol/orders-composition`: `@/features/auth/domain/super-admin`, `@/features/data/ports/data-core-runtime-config-ports`
- `@asol/products-composition`: Product services, search services, pharmacy catalog lookup ports, and runtime config ports.
- `@asol/profiles-composition`: Profile bootstrap services and runtime config ports.
- `@asol/submain-composition`: Cart catalogue pricing, product search services, and runtime config ports.
- `@asol/sub2main-composition`: Pharmacy catalog services, product mutation services, profile bootstrap services, image storage bootstrap services, and runtime config ports.

---

## Circular Dependency Prevention & Port-Adapter Pattern

To prevent tight coupling and circular dependencies across features:
1. **Ports (Interfaces)**: Capability packages define TypeScript interfaces (ports) for services they require from other packages or application layers.
2. **Adapters (Implementations)**: Concrete implementations are defined in application feature directories (`src/features/*/ports/`).
3. **Composition Roots**: Ports are wired at process startup in:
   - `src/core/composition/browser-ports.ts` (Client runtime)
   - `src/core/composition/server-ports.ts` (Server runtime)
4. **Port Registry Verification**: `src/core/composition/tests/ports-registry.test.ts` validates that every declared seam is properly registered, preventing un-wired dependencies.
