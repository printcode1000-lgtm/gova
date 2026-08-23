# SRP file splits outside package consolidation

This note records the August 2026 SRP pass that split application-side files
without changing their public behaviour or moving them into sealed packages.

## Scope

The pass targeted files that mixed rendering, state management, pure modelling,
validation helpers, and test harness setup. Existing imports through public
feature doors were preserved unless a file owned the local feature boundary.

## Split pattern

- UI components keep rendering and event wiring.
- Pure derivation lives in adjacent `*-model.ts` files.
- Shared local types live in adjacent `*.types.ts` files.
- Provider contexts live beside their provider, not inside the provider body.
- Integration tests keep scenario bodies in the scenario file and move session
  setup, harness state, and fixtures to adjacent helper files.

## Behaviour contract

The split is organizational only. Existing user-visible behaviour, feature
flags, storage keys, route URLs, notification contracts, and exported API doors
remain unchanged.

## Follow-up UI split pass

The later UI pass split the high/medium priority candidates without changing
runtime contracts:

- Profile edit chrome moved tab navigation, save banner, and carousel controls
  into `ProfileEditWorkspaceChrome.tsx`.
- Profile showcase derivation moved into `ProfilePageContent.showcase-model.ts`.
- Profile preview section headings moved into `ProfilePreviewSectionHeading.tsx`.
- Store identity image editing moved into `store-identity/StoreIdentityImagesEditor.tsx`.
- Onboarding product editing moved into `sections/ProductForm.tsx`.
- Cart seller grouping moved into `cart-seller-groups.ts`.
- Product page route parsing moved into `product-page-route-model.ts`.
- Order delivery/shipment status decisions moved into adjacent model helpers.
- Contact map URL generation and specialty delete impact calculation moved into
  local helper files.

## Deep UI follow-up

The subsequent user-facing UI pass removed remaining touch-policy risks and
split more high/medium priority files:

- Cart checkout settings and order submission moved into local hook/service
  files beside `CartPageContent`.
- Product page loading/style resolution moved into `use-product-page-loader.ts`.
- Product search request execution moved into `product-search-panel-request.ts`.
- Product review summary, product delete confirmation, fulfillment carrier
  search, notification empty state, profile story, and unified delivery quote
  form moved into focused presentation files.
- Follow dialog copy, hero slider ordering helpers, hero editor upload state,
  onboarding shipping constants, onboarding coupon generation, order page copy,
  and chat time formatting moved into local model/helper files.
- Shared map link generation moved to `src/features/location/location-links.ts`
  and app-facing `title` tooltip remnants were converted to accessible labels.
- The verification pipeline now lists `test:backup-core` and
  `test:data-health-core` explicitly in `test`, `build`, and `build:static`,
  matching the package-gate coverage contract instead of relying on nested
  execution through `test:data-core`.
- Service mirror manifest writing now retries short-lived filesystem write
  errors so repeated verification/build gates on Windows do not fail while the
  generated service manifest is momentarily locked.
