# Gova Repository-Wide Package Architecture Refactor Plan

## 0. Authority and Scope

This plan is the implementation blueprint for `not/package-architecture-refactor-goal.md`.

It is intentionally repository-wide. Existing package names, folder boundaries, public exports, composition roots, and dependency edges are evidence to inspect, not constraints to preserve.

The completed refactor MUST satisfy this invariant:

> **One Capability → One Owner → One Public Door → One Explicit Composition.**

This document is a plan only. It does not authorize partial compatibility architecture. The final implementation must be an atomic architectural cutover: no compatibility packages, forwarding exports, duplicate authorities, temporary dual ownership, deprecated package aliases, or old/new composition paths may remain in the completed tree.

Any newly created architectural unit MUST be a proper sealed Gova package that satisfies the repository package-creation contract. A new capability MUST NOT be introduced as an unregistered module, pseudo-package, arbitrary internal folder, parallel source tree, or other substitute for a project-compliant package.

---

## 1. Success Definition

The refactor is complete only when all of the following are simultaneously true:

1. Every existing package has been inspected by live source responsibility, not by name.
2. Every final package has exactly one coherent ownership statement.
3. Every capability, rule, service, adapter, repository family, runtime state machine, vendor SDK, and composition responsibility has exactly one owner.
4. No final package contains independent Domain, Application, Infrastructure, Data Access, Runtime, Transport, Platform, Presentation, Tooling, or Composition responsibilities that can change for different reasons.
5. No package imports application source through `@/`.
6. No composition package owns business logic or infrastructure logic.
7. Every runtime/deployment composes only the packages it actually needs.
8. The transitive package graph for every runtime is the smallest graph required by its reachable functionality.
9. Vendor SDK ownership is unique. No vendor is intentionally owned by two packages.
10. Every final package publishes one canonical public door: `.` only.
11. All removed package names have zero production imports and zero compatibility forwarding exports.
12. All existing application behavior, database behavior, mobile behavior, release behavior, service behavior, and deployment behavior remains functionally present.
13. Architecture enforcement makes regression into shared ownership or broad composition mechanically impossible.
14. The final architecture documents are generated from the new source of truth and match the live tree exactly.

---

## 2. Verified Current Baseline

The live repository currently contains **48 sealed packages**.

Current concentration indicators from the live tree:

| Package | Source files | Approx. LOC | Current public doors | Verified concentration |
| --- | ---: | ---: | ---: | --- |
| `data-core` | 281 | 30,151 | 37 | DB drivers, schemas, sharding, repositories, domain entities, browser AsolDB, TanStack Query, image cache, provisioning, migrations, telemetry, runtime policy |
| `ota-core` | 85 | 9,746 | 6 | OTA domain, client runtime, React runtime, publishing, store adapters, R2, release/admin behavior |
| `architecture-core` | 47 | 8,793 | 1 | architecture enforcement; large but currently cohesive |
| `native-core` | 137 | 8,160 | 5 | many independent Capacitor/plugin capabilities under one owner |
| `release-core` | 32 | 6,213 | 5 | release pipeline, release console, build jobs, artifact analysis |
| `storage-image-manager-core` | 19 | 3,006 | 4 | UI, image upload lifecycle, processing, queueing, caching |
| `notifications-core` | 30 | 2,781 | 7 | notification domain, grants, delivery orchestration, provider adapters |
| `storage-core` | 50 | 2,721 | 3 | object-store transport, image rules, profiles, providers, orchestration |

Additional verified problems:

- The current generated package graph contains 68 production package-import edges.
- `data-core` is a dependency hub for unrelated business and infrastructure concerns.
- `data-core/src/domains` contains persistence/application code for auth, orders, products, profiles, notifications, advertisements, OTA, feature flags, follow, data health, backup, system logs, password recovery and more.
- `data-core/src/browser` combines AsolDB, TanStack Query, query persistence, image cache and reset logic.
- `auth-core` owns authentication/session behavior while `data-core/auth` owns user entities and persistence.
- `orders-core` owns order meaning while `data-core/marketplace-orders` contains substantial order application and persistence logic.
- `storage-image-manager-core` and `data-core/browser/image-cache` both participate in image caching.
- `account-bridge` mixes route ownership, service-origin routing, notification bridging, mobile credential storage and direct FCM delivery.
- `native-core` owns unrelated native capabilities and more than twenty plugin dependencies.
- `@aws-sdk/client-s3` is currently owned by both `storage-core` and `ota-core`.
- `google-auth-library` is currently owned by both `notifications-core` and `ota-core`.
- Isolated `*-composition` packages still import exact `@/features/*` implementation seams.
- `submain-composition` is particularly broad and therefore tightly coupled to application implementation structure.
- Some composition behavior is triggered by module-load registration rather than explicit composition execution.

These are the starting conditions the plan must eliminate.

---

## 3. Final Architectural Layer Model

Replace the broad current `capability` bucket with explicit package layers. Every final package MUST belong to exactly one layer.

| Layer | Sole purpose | Allowed dependency direction |
| --- | --- | --- |
| `domain` | entities, values, invariants, pure policy, validation | domain-only contracts |
| `application` | use cases and orchestration through declared ports | domain + narrow contract packages |
| `data-access` | repositories, persistence mapping, domain-specific SQL/query implementation | domain/application contracts + DB abstraction packages |
| `infrastructure` | external SDK/driver/filesystem/network/storage adapters | narrow contracts needed to implement the adapter |
| `runtime` | stateful runtime engines, caches, lifecycle, backend/runtime selection | domain/application + required infrastructure abstractions |
| `transport` | HTTP/API protocol, CORS, service routing, request/response mapping | domain/application contracts |
| `platform` | native/device/platform capability | domain/application contracts + one platform SDK family |
| `presentation` | reusable UI/view model/presenter | domain/application only |
| `tooling` | build, migration, release, provisioning, generation, repository tools | declared package doors; never required by product runtime |
| `declarations` | immutable deployment/account metadata | declaration contracts only |
| `composition` | runtime/deployment wiring only | explicit final package doors required by that runtime |
| `enforcement` | architecture registry, scanners, generated truth | toolchain only |

### 3.1 Mandatory dependency rules

1. `domain` never imports application, data-access, infrastructure, runtime, transport, platform, presentation, tooling or composition.
2. `application` never constructs a database, vendor client, filesystem adapter, network adapter, native plugin or framework runtime.
3. `data-access` contains no business policy beyond persistence mapping and query semantics required by its owned repository contract.
4. `infrastructure` owns vendor integration, not business meaning.
5. `runtime` owns lifecycle/state, not canonical business entities.
6. `transport` maps protocol to application contracts and never performs persistence directly.
7. `presentation` never imports data-access, infrastructure, tooling or composition.
8. `tooling` MUST NOT enter browser, native application, service-request or production web runtime closures unless that runtime explicitly exists to run the tool.
9. `composition` contains wiring only and imports no application `@/` path.
10. No package imports another package through an undeclared subpath.
11. No package exports more than one public door.
12. The package graph MUST remain acyclic.

---

## 4. Public Door Contract

The final package rule is stricter than the current repository:

```json
{
  "exports": {
    ".": "./src/index.ts"
  }
}
```

Every final package exposes only `.`.

Current patterns such as `./server`, `./browser`, `./ui`, `./tooling`, `./providers`, `./session`, `./super-admin`, and package-specific subpaths MUST disappear.

If code behind two current doors has different runtime requirements, infrastructure privileges, change reasons, or dependency closures, the code belongs in separate packages.

This converts the principle “one public door” from documentation into an enforceable package contract.

---

## 5. Registry and Architecture Enforcement Reconstruction

Before the completed cutover can be accepted, `@asol/architecture-core` must model the final architecture directly.

Each package registry row MUST record:

- `folder`
- `name`
- exact `owns` statement
- exactly one `layer`
- runtime targets
- exactly one public export door
- exact vendor modules owned
- whether I/O is allowed
- whether secret access is allowed
- allowed dependency classes and exceptional package edges, if any
- composition membership, if any

Add or strengthen architecture checks for:

1. one package folder ↔ one registry row;
2. one package ↔ one ownership statement;
3. duplicate/overlapping ownership detection;
4. exactly one public export door;
5. forbidden layer-to-layer edges;
6. package cycles;
7. package imports of `@/`;
8. composition-to-composition imports;
9. undeclared vendor imports;
10. duplicate vendor ownership;
11. tooling entering product runtime closures;
12. package runtime-target violations;
13. composition closure larger than declared capability set;
14. missing composition dependency required by a reachable route/use case;
15. old package-name imports after migration;
16. old compatibility forwarding exports;
17. domain entity/type duplication across owners;
18. repository implementation located outside its registered data-access owner.

Introduce a canonical `COMPOSITION_REGISTRY` in architecture-core. For every runnable runtime/deployment, it MUST declare the exact allowed package set. The architecture check MUST compute the real transitive package closure and fail when the live closure has either an undeclared package or a missing required package.

---

## 6. Final Vendor Ownership Rule

Every vendor/SDK belongs to exactly one package.

Mandatory examples after cutover:

- `better-sqlite3` → `@asol/sqlite-core`
- `@libsql/client` → `@asol/turso-core`
- `drizzle-orm*` → `@asol/drizzle-core`
- `@tanstack/react-query*` → `@asol/query-cache-core`
- `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` → `@asol/storage-core`
- `google-auth-library` → `@asol/google-auth-core`
- `web-push` → `@asol/web-push-core`
- `maplibre-gl` → `@asol/map-ui-core`
- `sharp` → `@asol/branding-assets-core`
- `@vercel/sandbox` → `@asol/vercel-core`
- every Capacitor/plugin SDK → exactly one corresponding native capability package

No “intentional dual ownership” exception remains in the final registry.

---

## 7. Current Package Disposition

Every current package receives a mandatory final decision.

| Current package | Decision | Final direction |
| --- | --- | --- |
| `architecture-core` | KEEP | enforcement only |
| `api-contract-core` | KEEP | transport contracts only |
| `account-declarations` | REMOVE | shared declaration contract + one declaration package per account |
| `account-bridge` | REMOVE | service routing + notification bridge + mobile-push packages |
| `auth-core` | REMOVE | identity + authentication + session + authorization + account lifecycle |
| `backup-core` | NARROW | backup application orchestration only |
| `branding-core` | NARROW | branding identity/constants only; generation tooling moves out |
| `cors` | REPLACE | `cors-core` transport package |
| `catalog-core` | NARROW | pure catalog domain only |
| `control-composition` | REWRITE | control wiring only |
| `data-core` | REMOVE | fully decomposed; no generic business/data hub remains |
| `data-health-core` | NARROW | data-health domain policy only |
| `dev-core` | KEEP | developer runtime/path guards only |
| `env-core` | KEEP | environment reading/loading rules only |
| `favorites-core` | NARROW | favorites domain/application; UI moves out |
| `featured-marquee-core` | NARROW | pure featured-marquee domain |
| `format-core` | KEEP | pure formatting |
| `google-play-store-assets-core` | KEEP | Play listing asset contracts/validation |
| `gova-deployment-core` | KEEP | gova artifact/build view gate |
| `hero-slider-core` | NARROW | pure hero-slider domain |
| `map-core` | REMOVE | geo domain + map UI + native location ownership |
| `native-core` | REMOVE | split by native capability |
| `notifications-core` | NARROW | pure notification domain |
| `notifications-composition` | REWRITE | notifications deployment wiring only |
| `observability-core` | REMOVE | telemetry contracts + browser runtime + server tracing |
| `orders-core` | NARROW | pure order domain |
| `orders-composition` | REWRITE | orders deployment wiring only |
| `ota-core` | NARROW | pure OTA domain |
| `page-save-core` | REVIEW/NARROW | retain only page-save application/runtime if one change reason remains |
| `page-snapshot-core` | REVIEW/NARROW | retain only snapshot runtime if one change reason remains |
| `product-card-core` | NARROW | view model/presenter; React UI moves out |
| `product-core` | KEEP | pure product domain |
| `product-style-core` | NARROW | pure style domain; filesystem store moves out |
| `products-composition` | REWRITE | products deployment wiring only |
| `profiles-composition` | REWRITE | profiles deployment wiring only |
| `release-core` | REMOVE | pipeline + console + build jobs + artifact analysis |
| `seller-card-core` | NARROW | view model/presenter; React UI moves out |
| `secrets-core` | KEEP | secret archive behavior only |
| `service-mirror-core` | KEEP/NARROW | deterministic service source projection only |
| `service-runtime-core` | REPLACE | `service-http-core` transport package |
| `signed-token-core` | KEEP | signed envelope primitive only |
| `storage-core` | NARROW | object-store/R2 transport only |
| `storage-image-manager-core` | REMOVE | image upload runtime + image cache + image-manager UI |
| `sub2main-composition` | REWRITE | sub2main wiring only |
| `submain-composition` | REWRITE | submain wiring only |
| `system-logs-core` | NARROW | pure logging domain/contracts |
| `trending-ribbon-core` | NARROW | pure trending-ribbon domain |
| `vercel-deploy-core` | REMOVE | Vercel infrastructure + release state/application concerns |

`REVIEW/NARROW` does not mean optional review. It means the implementation must run the same responsibility audit and either prove one change reason or split the package before acceptance.

---

## 8. Target Package Architecture

Every package below is a proposed final owner. During implementation, the source audit may split a proposed package further, but it MUST NOT merge independent responsibilities into a broader package than specified here.

### 8.1 Architecture, contracts, declarations, transport

| Final package | Layer | Sole ownership |
| --- | --- | --- |
| `@asol/architecture-core` | enforcement | architecture registry, checks, generated architecture documentation |
| `@asol/api-contract-core` | transport | JSON transport naming and validation contracts |
| `@asol/cors-core` | transport | CORS policy, headers and preflight |
| `@asol/service-http-core` | transport | shared service HTTP/proxy/error/health protocol behavior |
| `@asol/service-routing-core` | transport | Business API route/method ownership and service-origin resolution |
| `@asol/account-contract-core` | declarations | shared account declaration types and validation |
| `@asol/gova-account-declaration` | declarations | gova account metadata |
| `@asol/control-account-declaration` | declarations | control account metadata |
| `@asol/notifications-account-declaration` | declarations | notifications account metadata |
| `@asol/orders-account-declaration` | declarations | orders account metadata |
| `@asol/products-account-declaration` | declarations | products account metadata |
| `@asol/profiles-account-declaration` | declarations | profiles account metadata |
| `@asol/submain-account-declaration` | declarations | submain account metadata |
| `@asol/sub2main-account-declaration` | declarations | sub2main account metadata |

### 8.2 Database and browser-local data

| Final package | Layer | Sole ownership |
| --- | --- | --- |
| `@asol/database-contract-core` | domain | database-neutral database/repository primitive contracts |
| `@asol/sqlite-core` | infrastructure | SQLite driver and SQLite connection/execution |
| `@asol/turso-core` | infrastructure | Turso/libSQL client and Turso connection/execution |
| `@asol/drizzle-core` | infrastructure | Drizzle schema binding/integration primitives |
| `@asol/database-runtime-core` | runtime | backend selection, logical datasource registry and lazy lifecycle |
| `@asol/database-provisioning-core` | tooling | database/schema provisioning and schema synchronization |
| `@asol/database-migrations-core` | tooling | migrations, shard migrations, database creation and DB verification commands |
| `@asol/asol-db-core` | runtime | browser AsolDB storage engine and store primitives |
| `@asol/query-cache-core` | runtime | TanStack Query client, policies, persistence and local-first query runtime |
| `@asol/image-cache-core` | runtime | canonical local image cache and local-first image resolution |

### 8.3 Identity and account security

| Final package | Layer | Sole ownership |
| --- | --- | --- |
| `@asol/identity-core` | domain | identity entities, normalized identity values and invariants |
| `@asol/authorization-core` | domain | role/super-admin authorization policy |
| `@asol/authentication-core` | application | credential authentication use cases |
| `@asol/session-core` | application | session issuance/verification/lifecycle |
| `@asol/account-lifecycle-core` | application | account deletion lifecycle |
| `@asol/password-recovery-core` | application | recovery challenge and reset workflow |
| `@asol/identity-data-core` | data-access | user/identity persistence |
| `@asol/password-recovery-data-core` | data-access | recovery persistence |
| `@asol/signed-token-core` | domain | generic signed-envelope primitive |

### 8.4 Catalog, product, profile, seller

| Final package | Layer | Sole ownership |
| --- | --- | --- |
| `@asol/catalog-core` | domain | catalog entities, visibility and catalog invariants |
| `@asol/catalog-runtime-core` | runtime | immutable catalog loading and in-memory catalog queries |
| `@asol/catalog-validation-core` | tooling | catalog/schema/asset validation |
| `@asol/product-core` | domain | product entities, IDs, normalization and product invariants |
| `@asol/product-application-core` | application | product use cases |
| `@asol/product-data-core` | data-access | product persistence and row mapping |
| `@asol/product-review-core` | domain | product-review entities/rules |
| `@asol/product-review-application-core` | application | product-review use cases |
| `@asol/product-review-data-core` | data-access | product-review persistence |
| `@asol/product-search-core` | application | product-search semantics and use cases |
| `@asol/product-search-data-core` | data-access | product-search queries/persistence |
| `@asol/product-style-core` | domain | product-style schema/defaults/policy |
| `@asol/product-style-store-core` | infrastructure | product-style filesystem persistence/indexing |
| `@asol/product-card-core` | presentation | product-card view model/presenter |
| `@asol/product-card-ui-core` | presentation | ProductCard React component |
| `@asol/profile-core` | domain | profile entities and invariants |
| `@asol/profile-application-core` | application | profile use cases |
| `@asol/profile-data-core` | data-access | profile persistence and shard queries |
| `@asol/profile-review-core` | domain | profile-review entities/rules |
| `@asol/profile-review-application-core` | application | profile-review use cases |
| `@asol/profile-review-data-core` | data-access | profile-review persistence |
| `@asol/seller-discount-core` | domain | seller-discount rules |
| `@asol/seller-discount-application-core` | application | seller-discount use cases |
| `@asol/seller-discount-data-core` | data-access | seller-discount persistence |
| `@asol/seller-card-core` | presentation | seller-card view model/presenter |
| `@asol/seller-card-ui-core` | presentation | SellerCard React component |
| `@asol/follow-core` | domain | follow relationship rules |
| `@asol/follow-application-core` | application | follow/unfollow use cases |
| `@asol/follow-data-core` | data-access | follow persistence |
| `@asol/pharmacy-profile-catalog-core` | domain | pharmacy-profile catalog rules/entities |
| `@asol/pharmacy-profile-catalog-application-core` | application | pharmacy-profile catalog use cases |
| `@asol/pharmacy-profile-catalog-data-core` | data-access | pharmacy-profile catalog persistence |

### 8.5 Orders and feature flags

| Final package | Layer | Sole ownership |
| --- | --- | --- |
| `@asol/orders-core` | domain | order entities, statuses, calculations, visibility and invariants |
| `@asol/orders-application-core` | application | order commands/queries and access orchestration |
| `@asol/orders-data-core` | data-access | marketplace order persistence, SQL and row mapping |
| `@asol/feature-flags-core` | domain | feature-flag rules/value model |
| `@asol/feature-flags-application-core` | application | flag read/update use cases |
| `@asol/feature-flags-data-core` | data-access | flag persistence |

### 8.6 Notifications

| Final package | Layer | Sole ownership |
| --- | --- | --- |
| `@asol/notifications-core` | domain | notification entities/templates/enums/builder policy |
| `@asol/notification-grants-core` | application | grant envelope/collection/validation protocol |
| `@asol/notification-delivery-core` | application | provider-neutral delivery orchestration |
| `@asol/notification-data-core` | data-access | notification tokens/preferences/recipient persistence |
| `@asol/web-push-core` | infrastructure | Web Push adapter |
| `@asol/google-auth-core` | infrastructure | Google service-account OAuth token acquisition |
| `@asol/fcm-core` | infrastructure | FCM transport adapter using google-auth-core |
| `@asol/apns-core` | infrastructure | APNs transport adapter |
| `@asol/notification-bridge-core` | transport | cross-service/browser grant forwarding |
| `@asol/mobile-push-core` | platform | device-side push credential lifecycle and direct mobile delivery orchestration |

### 8.7 Advertisements

| Final package | Layer | Sole ownership |
| --- | --- | --- |
| `@asol/hero-slider-core` | domain | hero-slider entity/schema/normalization/policy |
| `@asol/hero-slider-application-core` | application | hero-slider use cases |
| `@asol/hero-slider-data-core` | data-access | hero-slider persistence |
| `@asol/featured-marquee-core` | domain | marquee entity/schema/policy |
| `@asol/featured-marquee-application-core` | application | marquee use cases |
| `@asol/featured-marquee-data-core` | data-access | marquee persistence |
| `@asol/trending-ribbon-core` | domain | trending-ribbon entity/schema/policy |
| `@asol/trending-ribbon-application-core` | application | trending-ribbon use cases |
| `@asol/trending-ribbon-data-core` | data-access | trending-ribbon persistence |

### 8.8 Storage, images and backup

| Final package | Layer | Sole ownership |
| --- | --- | --- |
| `@asol/storage-core` | infrastructure | generic R2/S3 object-store transport and object operations |
| `@asol/storage-profile-core` | domain | storage profiles, routing and profile policy |
| `@asol/image-core` | domain | image identity, keys, paths, formats and image rules |
| `@asol/image-storage-core` | application | image storage use cases through storage/profile ports |
| `@asol/image-upload-core` | runtime | upload lifecycle, queue, drafts and retry state |
| `@asol/image-cache-core` | runtime | canonical local image cache |
| `@asol/image-manager-ui-core` | presentation | image-manager React UI |
| `@asol/backup-core` | application | backup orchestration |
| `@asol/turso-backup-core` | infrastructure | Turso backup source/adapter |

### 8.9 Native/platform

`native-core` MUST disappear. Native SDK ownership is split by capability.

| Final package | Layer | Sole ownership |
| --- | --- | --- |
| `@asol/native-platform-core` | platform | platform detection, common native result/error/listener/plugin-loader primitives |
| `@asol/native-app-core` | platform | app lifecycle, app metadata and back-button |
| `@asol/native-browser-core` | platform | native browser |
| `@asol/native-camera-core` | platform | camera |
| `@asol/native-files-core` | platform | filesystem, file picking and local download file handling |
| `@asol/native-location-core` | platform | geolocation and location permissions |
| `@asol/native-notifications-core` | platform | push/local notification plugin integration |
| `@asol/native-network-core` | platform | network state |
| `@asol/native-preferences-core` | platform | native preferences |
| `@asol/native-share-core` | platform | share |
| `@asol/native-speech-core` | platform | speech recognition |
| `@asol/native-barcode-core` | platform | barcode scanning |
| `@asol/native-ui-core` | platform | haptics, keyboard, splash, status bar, orientation, text zoom, toast, dialog, action sheet |
| `@asol/native-build-core` | tooling | plugin manifest, Capacitor include projection, native build validation/preflight |

### 8.10 Map and reusable presentation

| Final package | Layer | Sole ownership |
| --- | --- | --- |
| `@asol/geo-core` | domain | geometry/clustering/geospatial types |
| `@asol/map-ui-core` | presentation | MapLibre UI and MapLibre adapter |
| `@asol/favorites-core` | application | favorites entity/collection/storage contract/card adaptation |
| `@asol/favorites-ui-core` | presentation | FavoritesProvider/FavoriteButton/UI |

### 8.11 OTA, release and store publishing

| Final package | Layer | Sole ownership |
| --- | --- | --- |
| `@asol/ota-core` | domain | OTA versions, manifests, rollout, revocation, delta and capability policy |
| `@asol/ota-application-core` | application | OTA admin/release use cases |
| `@asol/ota-data-core` | data-access | OTA release/audit persistence |
| `@asol/ota-runtime-core` | runtime | update/download/activation state machine |
| `@asol/ota-ui-core` | presentation | OTA React provider/hooks |
| `@asol/ota-publishing-core` | tooling | OTA build, manifest, bundle and publication orchestration |
| `@asol/app-store-connect-core` | infrastructure | App Store Connect adapter |
| `@asol/google-play-publishing-core` | infrastructure | Google Play publishing adapter |
| `@asol/release-pipeline-core` | tooling | release phases/checkpoints/resume/release transaction |
| `@asol/release-console-core` | presentation | release-console presentation model/runbook data |
| `@asol/build-job-core` | tooling | build-job execution and progress |
| `@asol/artifact-analysis-core` | tooling | bundle/build artifact analysis |
| `@asol/vercel-core` | infrastructure | Vercel API/sandbox/deployment primitives |
| `@asol/release-state-core` | application | durable release-state concurrency/version behavior |
| `@asol/release-state-data-core` | data-access | release-state persistence |

### 8.12 Observability and system logs

| Final package | Layer | Sole ownership |
| --- | --- | --- |
| `@asol/telemetry-contract-core` | domain | telemetry event types and instrumentation contracts |
| `@asol/observability-browser-core` | runtime | browser monitor store/query observation/client traces |
| `@asol/observability-server-core` | runtime | request-scoped server tracing and DB trace integration |
| `@asol/system-logs-core` | domain | system-log entities, correlation/fingerprint/sanitization rules |
| `@asol/system-log-capture-core` | runtime | browser/global capture and in-memory capture coordination |
| `@asol/system-log-service-core` | application | persistent log, alert and streaming use cases through ports |
| `@asol/system-log-data-core` | data-access | system-log persistence only |

### 8.13 Remaining focused packages

| Final package | Layer | Sole ownership |
| --- | --- | --- |
| `@asol/format-core` | domain | formatting helpers |
| `@asol/env-core` | runtime | environment value reading/loading rules |
| `@asol/dev-core` | tooling | developer-only path/runtime guard helpers |
| `@asol/branding-core` | domain | branding identity/constants |
| `@asol/branding-assets-core` | tooling | generated branding assets and `sharp` ownership |
| `@asol/google-play-store-assets-core` | tooling | Play listing asset contracts/validation/generation support |
| `@asol/gova-deployment-core` | tooling | gova build-view/artifact gate |
| `@asol/secrets-core` | tooling | encrypted secrets archive backup/restore |
| `@asol/service-mirror-core` | tooling | deterministic service-source projection |
| `@asol/data-health-core` | domain | schema/data-health policy and result contracts |
| `@asol/data-health-application-core` | application | health/integrity inspection and cleanup use cases |
| `@asol/data-health-data-core` | data-access | health/inventory/schema-comparison persistence queries |
| `@asol/page-save-core` | application | page-authored save orchestration contract |
| `@asol/page-save-runtime-core` | runtime | save journal/queue/runtime persistence lifecycle |
| `@asol/page-snapshot-core` | runtime | page snapshot key/capture/restore runtime |


### 8.14 Canonical capabilities currently living primarily in `src/features`

The source audit must not stop at existing packages. The following registered application features currently contain canonical capability logic that must be extracted into packages if the responsibility remains after the responsibility ledger is built. The host feature then retains only Next/React/page/route-specific code.

| Current feature | Mandatory target ownership action |
| --- | --- |
| `app-reset` | create `@asol/app-reset-core` (`runtime`) for coordinated browser/device reset behavior through storage/notification ports |
| `cart` | create `@asol/cart-core` (`domain`) for cart/fulfillment/pricing rules, `@asol/cart-application-core` (`application`) for checkout orchestration, and `@asol/cart-runtime-core` (`runtime`) if the current cart store remains a reusable state engine |
| `contact` | create `@asol/contact-core` (`domain`) for contact-message/rate policy, `@asol/contact-application-core` (`application`) for send use case, and `@asol/contact-email-core` (`infrastructure`) as the sole `nodemailer` owner if email remains the delivery mechanism |
| `onboarding` | create `@asol/onboarding-core` (`domain`) for onboarding state/schema/step rules and `@asol/onboarding-runtime-core` (`runtime`) for reusable onboarding state lifecycle; keep page/form presentation in the host application unless it is intentionally reusable |
| `network` | create `@asol/network-health-core` (`application`) for server reachability semantics; device network state stays owned by `native-network-core` |
| `qr-code` | create `@asol/qr-code-core` (`application`) for QR artifact rules and `@asol/qr-code-renderer-core` (`infrastructure`) as sole `qrcode` vendor owner; file saving goes through `native-files-core` |
| `sharing` | create `@asol/sharing-core` (`application`) for share/deep-link content and action rules; native execution goes through `native-share-core` |
| `specialty-chat` | create `@asol/specialty-chat-core` (`domain`) for chat capability/message/receipt/rate rules and `@asol/specialty-chat-application-core` (`application`) for conversation/request orchestration through identity/catalog/profile/product/notification ports |
| `profile-working-hours` | move canonical working-hours entities/rules into `profile-core`; move use-case behavior into `profile-application-core`; retain cards in application presentation |
| `vehicle-catalog` | move vehicle catalog entities into `catalog-core` and loading/cache behavior into `catalog-runtime-core`; do not create a second catalog owner |

Every other registered feature must also receive an explicit ledger decision. If its source contains only page-specific presentation, route adaptation, or host glue, it may remain under `src/features`. If it contains canonical domain/application/runtime/infrastructure ownership, that ownership must be extracted into a proper package before final acceptance.


---

## 9. Exhaustive `data-core` Decomposition Map

`data-core` MUST be deleted at the end of the migration. Its responsibilities are redistributed as follows.

| Current `data-core` area | Final owner |
| --- | --- |
| `core/database/*` driver-neutral contracts | `database-contract-core` |
| SQLite clients/cached connections/SQLite execution | `sqlite-core` |
| Turso/libSQL clients/retry | `turso-core` |
| Drizzle bindings/schema adapter helpers | `drizzle-core` |
| backend selection/data-source registry | `database-runtime-core` |
| `provisioning/*` | `database-provisioning-core` |
| `tooling/*` DB/migration scripts | `database-migrations-core` or owning domain tooling package when domain-specific |
| `browser/asol-db/*` | `asol-db-core` |
| `browser/query/*` and Query persistence | `query-cache-core` |
| `browser/image-cache/*` | `image-cache-core` |
| `domains/auth/*` | identity/authentication + `identity-data-core` |
| `domains/account-deletion/*` | account-lifecycle + identity/account data owners |
| `domains/password-recovery/*` | password-recovery + password-recovery-data |
| `domains/product/*` | product/product-review data owners |
| `domains/product-search/*` | product-search/product-search-data |
| `domains/profile/*` | profile/profile-review data owners |
| `domains/pharmacy-profile-catalog/*` | pharmacy-profile-catalog data owner |
| `domains/seller-discounts/*` | seller-discount data owner |
| `domains/follow/*` | follow data owner |
| `domains/marketplace-orders/*` | orders-application + orders-data |
| `domains/notifications/*` | notification-data |
| `domains/advertisements/*` | hero/marquee/trending data owners |
| `domains/ota/*` | ota-data |
| `domains/feature-flags/*` | feature-flags application/data owners |
| `domains/data-health/*` | data-health application/data owners |
| `domains/dev-cloud-backup/*` | turso-backup + backup-core |
| `domains/system-logs/*` | system-log-data |
| `domains/super-admin/*` | identity-data or dedicated operational query owner selected by actual query responsibility |
| `ports/telemetry.ts` | telemetry-contract-core |
| `ports/runtime-config.ts` | database-runtime-core |
| `ports/product-search-fields.ts` | product-search-core |
| `control-system-logs.ts` | system-log-data composed by control |
| `control-release-state.ts` | release-state-data |
| `control-ota.ts` / `ota-runtime.ts` | ota-data + composition |

No generic `data-core` replacement package may be created. Recreating a broad `data-platform-core` or equivalent would violate this plan.

---

## 10. Application Source Boundary After Refactor

`src/features/*` remains the application host layer only for framework-specific page/route composition, page-specific state and app-specific presentation that is not reusable architecture.

The following MUST move out of `src/features/*` when it constitutes canonical capability ownership:

- business entities and canonical validation;
- business use cases;
- repository contracts and implementations;
- shared application services used by service deployments;
- vendor adapters;
- reusable runtime engines;
- reusable React components already treated as sealed capability;
- service routing rules;
- environment capability definitions;
- cross-runtime port implementations that can be expressed entirely through package contracts.

After cutover:

1. Composition packages MUST NOT import `@/features/*`.
2. Service deployments MUST NOT rely on mirrored application implementation seams to satisfy package ports.
3. Route handlers/pages may import package doors and a runtime composition entry, but must not construct infrastructure themselves.
4. Any logic that isolated services need MUST live in a sealed package, not in `src/features`.

---

## 11. Composition Root Redesign

### 11.1 Final composition principle

Composition is defined by **runtime**, not by “register everything available”.

Each runnable target owns one explicit root with one synchronous/async entry function. That function wires only the package graph reachable by that target.

Final composition packages:

- `@asol/gova-web-composition`
- `@asol/gova-static-composition`
- `@asol/gova-native-composition`
- `@asol/control-composition`
- `@asol/notifications-composition`
- `@asol/orders-composition`
- `@asol/products-composition`
- `@asol/profiles-composition`
- `@asol/submain-composition`
- `@asol/sub2main-composition`
- optional dedicated `@asol/local-development-composition` only if local development truly requires capabilities that do not belong to a production runtime

Every one is a proper package and every one has exactly one public door.

### 11.2 Delete the broad main composition pattern

The completed architecture must remove the need for a catch-all `registerAppServerPorts()` that registers every server capability.

`src/instrumentation.ts` becomes a thin runtime selector that imports exactly one composition package for the current runtime role and calls its explicit entry function.

It must not contain capability wiring itself.

### 11.3 Browser composition

Replace the broad global browser registration with runtime-specific composition entry points.

For example:

```text
gova-web-composition
  → query-cache runtime
  → browser observability
  → page-save runtime
  → page-snapshot runtime
  → image cache
  → notification bridge when reachable

gova-native-composition
  → same required browser-safe capabilities
  → only the native capability packages actually reachable by the shell
  → OTA runtime only when enabled for this target
```

Do not register native, OTA, image, notification or observability capabilities solely because they exist in the repository.

### 11.4 Service compositions

Every service composition imports only final packages and its own account declaration package.

No `@/features/*` import is allowed.

A composition must expose an explicit immutable runtime object or explicit registration function whose fields correspond to the service's actual tasks. Missing capability means missing key, not a configured no-op.

### 11.5 Composition performance rules

For every composition:

1. static imports are preferred when the package is unconditionally required by that runtime;
2. dynamic import is allowed only for a genuinely conditional capability or to preserve a measured bundle/runtime boundary;
3. no dynamic import may be used as a substitute for correct package boundaries;
4. no module-load registration side effect;
5. no global “register all” barrel;
6. no import of a package that contributes zero reachable runtime operation;
7. startup validation is limited to the credentials/configuration of the composed capability set;
8. connections/clients are lazy until first use unless eager initialization has measured benefit;
9. composition closure size is measured and regression-gated.

### 11.6 Composition registry

For every composition record:

- runtime/deployment identity;
- direct package imports;
- allowed transitive capability set;
- vendor capability set;
- required secrets/config keys;
- prohibited capability set;
- expected route/task ownership;
- browser/server/native applicability.

A composition test MUST fail if an unused capability enters the closure or if a reachable task lacks its owner.

---

## 12. Service Deployment Ownership Reconstruction

Do not assume the current account split is architecturally optimal merely because it exists.

For each service account, build a table from live routes containing:

- method + route pattern;
- application use case;
- domain package;
- data-access package;
- infrastructure package;
- required secrets;
- required database/storage account;
- final deployment owner.

Then apply these rules:

1. a route belongs to the deployment that can satisfy the full use case with the least privilege;
2. do not grant a deployment an extra secret merely to preserve an existing route assignment;
3. do not split one use case across deployment compositions unless the split is an explicit network protocol with an owner package;
4. route ownership and capability ownership are different concepts and must be recorded separately;
5. if a current `submain`/`sub2main` composition is only a collection of unrelated tasks, split deployment responsibility only if the deployment model permits separate deployable accounts; otherwise keep one deployment composition but wire independent packages without creating a shared business owner.

The plan does **not** require creating more Vercel accounts merely to obtain SRP. Composition packages may legitimately wire many independent owners because composition itself owns no capability.

---

## 13. Package Creation Contract for Every New Package

For each new package, implementation MUST perform all of the following in the same atomic refactor:

1. create `packages/<name>/package.json`;
2. expose only `.`;
3. add the package to the architecture registry with exact layer/ownership/runtime/vendor metadata;
4. add an independent package contract test;
5. add the root `test:<package>` gate or approved grouped gate;
6. update build/test/static-build gate chains as appropriate;
7. declare only actual npm dependencies;
8. prove no forbidden `@asol/*` dependency edge;
9. prove zero `@/` imports;
10. assign vendor ownership uniquely if applicable;
11. declare runtime targets;
12. add/update generated architecture docs through the generator, never by hand;
13. add composition membership only where runtime reachability proves it is required.

A folder that does not pass these requirements is not an acceptable substitute for a package.

---

## 14. Source Audit Method Before Moving Code

Before moving any source file, build a machine-readable **Responsibility Ledger** for every production file in all 48 current packages and every capability-owning file in `src/features`.

Each ledger row MUST record:

- current path;
- current package/feature;
- responsibility category;
- canonical capability;
- final owner package;
- public/internal status;
- current consumers;
- final consumers;
- side effects;
- vendor imports;
- environment/secrets read;
- database/shard touched;
- runtime targets;
- whether the file is moved, split, rewritten or deleted.

No production source file may remain unclassified.

For mixed files, split by responsibility before assigning ownership. Do not move a mixed file intact into a new package and call the package single-responsibility.

---

## 15. Migration Sequence

The implementation must be executed as one architectural cutover in the working branch, but internally follow this dependency-safe order.

### Step 1 — Freeze and inventory

- record the 48-package baseline;
- generate the responsibility ledger;
- generate the current package graph, runtime closures, vendor-owner map, route-owner map and secret-access map;
- record all current exports/import consumers;
- record current test/build/smoke gates;
- record baseline service artifacts and runtime closure sizes for comparison.

### Step 2 — Upgrade architecture enforcement first

- add final layer model;
- add single-door enforcement;
- add unique vendor-owner enforcement;
- add runtime target and composition registry model;
- add duplicate-ownership and old-package-name checks;
- temporarily point checks at the declared target manifest used by the refactor branch so every migration operation is judged against the final architecture, not the old architecture.

This is enforcement scaffolding, not a compatibility layer. It must not create production aliases.

### Step 3 — Create leaf domain/contract packages

Create/migrate pure packages first because all later packages depend inward on them:

- identity/authorization;
- catalog/product/profile/order/notification/image/storage-profile/OTA/logging/domain packages;
- telemetry/database contracts;
- account declaration contract;
- geo and other pure domains.

Remove duplicate canonical entities/types from old owners as each responsibility moves.

### Step 4 — Create infrastructure owners

Create unique owners for:

- SQLite;
- Turso/libSQL;
- Drizzle;
- R2/S3;
- Google auth;
- Web Push;
- FCM;
- APNs;
- Vercel;
- App Store Connect;
- Google Play publishing;
- filesystem style store;
- MapLibre;
- each native plugin capability.

Move every vendor import to its single owner and fail the architecture check on any duplicate.

### Step 5 — Create data-access owners

Move domain repositories and SQL/schema ownership out of `data-core` into their domain-specific data packages.

For each data package:

- depend on domain/application contracts;
- depend on DB infrastructure abstractions;
- own its schema/query mapping only;
- expose no generic datasource registry;
- expose no unrelated repository.

### Step 6 — Create application/use-case owners

Move application services from `data-core` and `src/features` into application packages.

Application packages must receive persistence/storage/auth/provider behavior through constructor/factory arguments or explicit port registration owned by that package. They must not reach into application `@/` source.

### Step 7 — Split runtimes and presentation

Move:

- AsolDB;
- Query cache;
- image cache;
- image upload runtime;
- OTA runtime;
- observability runtimes;
- page-save runtime;
- system-log capture;
- reusable UI packages;
- native capability packages.

Ensure browser/server/native closures contain only compatible code.

### Step 8 — Rebuild composition packages

Rewrite every composition package from final package doors only.

Create gova web/static/native composition packages.

Remove all `@/features/*` composition seams and remove the architecture exception registry that permitted them once no consumer remains.

### Step 9 — Migrate application and service consumers

Rewrite all imports in:

- `src/app`;
- `src/core`;
- `src/features`;
- `src/shared`;
- `services/*`;
- scripts/tooling;
- Next/Capacitor configuration;
- test suites.

Consumers import only the final package owner.

No old package import may remain.

### Step 10 — Delete superseded packages and code

Delete old package folders only after their ownership ledger reaches zero remaining responsibilities.

Mandatory removals include at least:

- `data-core`;
- `native-core`;
- `account-bridge`;
- `account-declarations`;
- `auth-core`;
- `map-core`;
- `release-core`;
- `storage-image-manager-core`;
- `service-runtime-core`;
- old broad `observability-core`;
- old broad `vercel-deploy-core`;
- any other old package whose responsibility has been fully transferred.

Do not leave package stubs or forwarding barrels.

### Step 11 — Remove old composition infrastructure

Delete:

- application feature composition seam exceptions;
- obsolete broad server/browser composition roots;
- module-load registration patterns;
- compatibility route/wiring imports created only for the old package graph.

`src/instrumentation.ts` becomes runtime selection only.

### Step 12 — Regenerate architecture truth

Regenerate package catalog, capability map, dependency map, feature/application documentation, runtime/deployment maps and any knowledge graph indexes whose source-of-truth inputs changed.

Update intentional architecture documentation in the same change.

---

## 16. No-Dual-Ownership Procedure

For every capability transfer, use a three-state ledger during implementation:

```text
UNMIGRATED → MOVED → OLD_OWNER_DELETED
```

A capability is never marked complete while both old and new implementations remain reachable.

Rules:

1. move source or rewrite it in the new owner;
2. change all consumers in the same refactor branch;
3. delete old source immediately after its last consumer moves;
4. never add forwarding re-exports from old package to new package;
5. never duplicate repository/schema/service implementation during migration;
6. never publish both old and new package names;
7. never add compatibility aliases to package exports;
8. architecture checks must reject the old owner once the target ledger marks the capability MOVED.

---

## 17. Data and Schema Preservation Rules

This refactor changes code ownership, not persisted data contracts unless an independently justified schema change is required.

Therefore:

- do not rename database columns merely to match package names;
- do not rewrite historical migrations for architectural convenience;
- preserve existing Turso/SQLite schema semantics;
- move schema source ownership without changing the physical schema unless a separate migration is explicitly required;
- preserve current camelCase application/transport contracts and snake_case SQL/database row boundaries;
- preserve shard routing and account credential isolation;
- prove data-access packages produce the same externally observable data contract before and after the move.

---

## 18. Composition Performance Verification

“Better composition performance” must be measured, not assumed.

Capture before/after metrics for every runtime/deployment:

- direct package count;
- transitive package count;
- vendor module count;
- server trace/file count;
- startup-import module count;
- composition initialization duration in a controlled local measurement;
- server artifact size;
- static/mobile bundle contribution where measurable;
- number of port registrations;
- number of dynamic imports in composition code;
- number of credentials/env keys required at startup.

Acceptance rules:

1. no runtime may gain an unrelated capability in its transitive closure;
2. no isolated service may gain a vendor SDK it does not execute;
3. no gova frontend runtime may regain DB/storage/business-service packages;
4. no static/mobile runtime may include server-only DB drivers;
5. composition initialization must execute only required registrations;
6. dynamic import count must decrease or each remaining dynamic import must have a documented runtime-boundary reason;
7. broad root import cost must be eliminated by runtime-specific roots.

Performance must never be improved by weakening ownership, validation, security or least privilege.

---

## 19. Required Test Strategy

### 19.1 Package contract tests

Every package must test:

- only `.` is exported;
- no forbidden app import;
- no forbidden layer import;
- vendor ownership compliance;
- runtime target compliance;
- ownership-specific invariants.

### 19.2 Architecture tests

`architecture:check` must prove:

- package inventory exactness;
- layer DAG validity;
- no cycles;
- no dual vendor ownership;
- no dual capability ownership;
- no old package references;
- exact composition closures;
- no `@/` imports from packages;
- no composition imports from application source;
- no undeclared package door;
- no tooling leakage into product runtimes.

### 19.3 Behavior characterization

Before moving each major capability, preserve/extend characterization tests for its observable behavior. Run the same behavior tests against the final owner.

Mandatory families include:

- authentication/session/account deletion/recovery;
- product/profile/search/reviews;
- orders and delivery flows;
- notifications/grants/providers;
- storage/image upload/cache;
- OTA update/admin/publishing;
- data health/backup;
- system logs/observability;
- release/deployment tooling;
- native capability adapters;
- catalog and advertisements.

### 19.4 Runtime and deployment tests

Verify each final composition independently:

- gova web;
- gova static;
- Android/static shell;
- iOS/static shell;
- control;
- notifications;
- orders;
- products;
- profiles;
- submain;
- sub2main.

Each composition test must assert both positive capability presence and negative capability absence.

### 19.5 Full repository gates

The final cutover must pass all repository-required gates, including at minimum the applicable forms of:

```text
architecture:check
docs:ci
typecheck
lint
unit/package tests
service composition tests
services:sync
services:verify
services:build
smoke:services
main application build
static build
mobile/native preflight gates
release-related contract tests
```

Use the repository's current canonical command names at implementation time rather than assuming this list remains unchanged.

---

## 20. Acceptance Audit for Every Final Package

Before declaring any package complete, answer YES to all of these:

1. Can its ownership be described without “and” joining independent concerns?
2. Does every production file serve that ownership statement?
3. Is there exactly one public door?
4. Does it have exactly one architectural layer?
5. Does it avoid `@/` imports?
6. Are all vendor imports uniquely owned?
7. Are all I/O side effects appropriate for its layer?
8. Are all dependencies necessary for its responsibility?
9. Does removing any dependency remove an actual required behavior?
10. Is the package absent from runtimes that do not use it?
11. Is the same capability absent from every other package?
12. Does its test gate verify the ownership boundary, not merely function output?

Any NO blocks completion.

---

## 21. Final Repository Acceptance Gates

The architecture is accepted only when all of these repository-wide assertions hold:

### Ownership

- zero dual capability owners;
- zero duplicate repository implementations;
- zero duplicate canonical domain entities;
- zero duplicate vendor owners;
- zero unregistered package folders;
- zero capability-owning modules outside packages.

### Dependency graph

- zero package cycles;
- zero package `@/` imports;
- zero composition-to-composition imports;
- zero forbidden layer edges;
- zero undeclared public subpaths;
- zero old removed-package imports.

### Composition

- every runtime has one explicit root;
- every root has a declared exact closure;
- no catch-all application root remains;
- no composition imports application implementation paths;
- no hidden top-level registration remains;
- no runtime loads a capability it cannot reach.

### Runtime safety

- browser/static/native graphs contain no server DB drivers;
- isolated service graphs contain only their credentials/capabilities;
- gova frontend remains free of business DB/storage owners;
- all required isolated-service backend pins remain enforced where a runtime cannot support both backends.

### Feature preservation

- all characterization tests pass;
- all API contracts remain valid;
- all mobile/native behaviors remain represented;
- all service routes remain owned and reachable;
- all release/deploy capabilities remain available from their new owners;
- all persisted data remains readable/writable under unchanged external semantics.

### Documentation

- generated architecture docs match the registry/live graph;
- intentional docs describe the new layer model and composition model;
- old counts, old package names and old composition guidance are removed;
- an ADR records the repository-wide ownership reset and its invariants.

---

## 22. Completion Artifacts

The implementation is not complete until it produces all of the following final artifacts:

1. final package inventory;
2. final ownership registry;
3. final package dependency DAG;
4. final vendor-owner map;
5. final runtime/composition closure map;
6. final route → use case → capability → data/infrastructure → deployment ownership map;
7. final old-path → new-package migration ledger with zero unresolved rows;
8. final removed-package list;
9. final architecture ADR;
10. regenerated capability map/package catalog/dependency map;
11. before/after composition performance report;
12. verification report containing all required gate results.

---

## 23. Explicit Prohibitions

The implementation MUST NOT:

- create a replacement mega-package for `data-core`;
- create a replacement mega-package for `native-core`;
- use subpath exports to simulate packages;
- create internal modules as substitutes for required packages;
- preserve old imports through re-export aliases;
- allow two packages to own the same SDK;
- allow two packages to own the same business capability;
- move code without re-evaluating its responsibility;
- put repositories in domain packages;
- put business rules in data-access packages;
- put vendor clients in application packages;
- make composition packages depend on `src/features`;
- make runtime composition depend on tooling packages;
- load every capability at application startup;
- optimize bundle/startup cost by silently weakening validation or least privilege;
- leave documentation describing the previous ownership model after cutover.

---

## 24. Final Definition of Done

The repository-wide refactor is DONE only when:

```text
Every capability has exactly one package owner.
Every package has exactly one responsibility.
Every package has exactly one public door.
Every vendor has exactly one package owner.
Every runtime has exactly one explicit composition root.
Every composition imports only packages, never application implementation seams.
Every runtime closure is minimal and verified.
Every old superseded owner is physically deleted.
Every feature remains behaviorally present.
Every architecture, build, service, static and mobile gate passes.
```

At that point the repository has moved from broad capability containers and centralized wiring toward a sealed, single-owner, runtime-specific architecture whose dependency graph and composition behavior are mechanically enforced rather than conventionally documented.
