# Sharing System

## Purpose

The sharing system is the single owner of product, public-profile, location,
social-destination, rich-preview, install-banner, and native deep-link sharing
behavior in ASOL.

The module lives in:

```text
src/features/sharing
```

Feature pages provide only the resource-specific content and the existing UI
trigger. They must not construct social-network URLs, call the native share or
clipboard plugins directly, interpret App/Universal Links, or duplicate the
sharing menu.

The system deliberately has no database model. It does not persist a share,
referrer, social destination, seller identity, sharer identity, visitor
identity, attribution, or analytics event. Public links contain only the
identifier required to open the shared resource.

## Non-negotiable invariants

1. All product and profile share URLs are built by `share-links.ts`.
2. All destination actions are implemented by `share-actions.client.ts`.
3. Product and profile surfaces use the same `ShareMenu` component.
4. Social crawlers receive metadata in the first server HTML response; client
   JavaScript is not required to discover the Open Graph card.
5. Public crawler routes stay out of the Capacitor static bundle.
6. Native deep links accept only the configured public origin and the two
   explicitly supported public paths.
7. Sharing must continue to work, or fall back to copying, when a native share
   sheet is unavailable.
8. Cancelling the system share sheet is a normal outcome, not an error.
9. No tracking parameters are added implicitly.
10. A change to the public origin, Android host, Android package, iOS associated
    domain, or iOS bundle identity must be treated as a coordinated web and
    native release change.

## Scope

The current resource kinds are:

| Kind | Public URL | Internal native route | Identifier |
|---|---|---|---|
| Product | `/s/product?mode=view&productId=...` | `/product?mode=view&productId=...` | `productId` |
| Profile | `/s/profile?mode=preview&uid=...` | `/profile?mode=preview&uid=...` | `uid` |

The public `/s/*` routes are server-rendered web entry points. The internal
`/product` and `/profile` routes are the routes used inside the Capacitor shell.
Keeping these contracts separate allows crawler-friendly web metadata without
making the static mobile bundle depend on server rendering.

Map/location sharing is also centralized in the module through
`shareLocationUrl()`, but locations do not currently have a rich public ASOL
landing route or social card.

## Architecture

```text
ProductPageContent / ProfilePreviewContent
  -> ShareContent
  -> ShareMenu
     -> WhatsApp URL
     -> Facebook sharer URL
     -> Instagram copy + open
     -> Native Platform Share
     -> Native Platform Clipboard

Shared public URL
  -> /s/product or /s/profile (server-rendered web route)
     -> server service reads the public record
     -> generateMetadata() emits Open Graph and Twitter metadata
     -> the normal product/profile page component receives initial server data
     -> browser renders the full public page
     -> OpenInAsolHeaderPrompt offers the correct store destination in AppHeader

Verified App/Universal Link
  -> Android intent filter or iOS associated domain
  -> Capacitor App plugin
     -> cold launch: App.getLaunchUrl()
     -> warm launch: appUrlOpen event
  -> ShareDeepLinkController
  -> exact origin/path validation
  -> safe internal /product or /profile route
```

## Module map

### Public module files

| File | Responsibility |
|---|---|
| `share-content.ts` | Shared resource, destination, and server hydration types. |
| `share-links.ts` | Canonical public origin, public resource URLs, destination URLs, message composition, store URLs, and safe public-to-internal routing. |
| `share-actions.client.ts` | Browser/native destination actions and fallback policy. Client-only. |
| `ShareMenu.tsx` | Reusable responsive sharing dialog and status feedback. Client-only. |
| `OpenInAsolHeaderPrompt.tsx` | Route-aware web install prompt, OS-aware store selection, and the header presentation model. Client-only. |
| `ShareDeepLinkController.tsx` | Cold- and warm-launch native deep-link routing. Client-only. |
| `share-metadata.server.ts` | Server record loading and Open Graph/Twitter metadata generation. Server-only. |
| `share-location-url.ts` | Central share-or-copy helper for map/location URLs. |
| `index.ts` | Client-safe/public exports. |
| `index.server.ts` | Explicit server-only metadata and loader exports. |
| `tests/sharing-module.test.ts` | URL, message, privacy, destination, and deep-link boundary tests. |

The separate `index.server.ts` boundary prevents client components from
accidentally importing server services through the normal module barrel.

### Web entry points

| File | Responsibility |
|---|---|
| `src/app/s/product/page.tsx` | Product public entry point and `generateMetadata()`. |
| `src/app/s/profile/page.tsx` | Profile public entry point and `generateMetadata()`. |
| `src/app/.well-known/assetlinks.json/route.ts` | Android Digital Asset Links association. |
| `src/app/.well-known/apple-app-site-association/route.ts` | iOS Universal Links association. |

### Native integration points

| File | Responsibility |
|---|---|
| `android/app/src/main/AndroidManifest.xml` | Verified HTTPS intent filters for the two public paths. |
| `ios/App/App/App.entitlements` | iOS `applinks:` associated-domain entitlement. |
| `src/native-platform/app/app-native-adapter.ts` | Thin Capacitor `App.getLaunchUrl()` adapter. |
| `src/native-platform/app/app.ts` | Platform-neutral `app.launchUrl()` and `app.onDeepLink()` API. |
| `src/app/layout.tsx` | Global controller mount and public metadata base. |

### Feature integration points

| File | Integration |
|---|---|
| `ProductPageContent.tsx` | Builds `ShareContent` for view mode and supplies the existing trigger. |
| `ProfilePreviewContent.tsx` | Builds profile `ShareContent` and supplies the existing trigger. |
| `AppShell.tsx` / `AppHeader.tsx` | Consume the centralized install-prompt model and render it as a second row inside the fixed application header. |
| `ProfilePageContent.tsx` | Accepts server-loaded public profile data for hydration. |
| `use-store-details.ts` | Accepts server `initialData` through TanStack Query. |
| `use-profile-store-images.ts` | Accepts server `initialData` through TanStack Query. |

## Data contracts

### `ShareContent`

```typescript
interface ShareContent {
  kind: "product" | "profile";
  title: string;
  text: string;
  url: string;
  imageUrl?: string | null;
}
```

Field meanings:

| Field | Meaning |
|---|---|
| `kind` | Resource vocabulary. It is not written to storage or sent as tracking data. |
| `title` | Human-readable heading used by the menu and supported share sheets. |
| `text` | Short description used by WhatsApp, Instagram copy, and system sharing. |
| `url` | Absolute canonical public `/s/*` URL. |
| `imageUrl` | Optional menu preview image. Social cards use server metadata, not this client value. |

The feature page owns the human-readable client content because it already has
the localized resource model. The module owns how that content is delivered.

### `PublicProfileShareRecord`

```typescript
interface PublicProfileShareRecord {
  uid: string;
  storeDetails: StoreDetailsData;
  storeImages: StoreImagesData;
}
```

This is an in-memory server-to-page hydration contract. It is not a new entity,
table, cache record, or API payload stored by the sharing module.

### Action result

Asynchronous sharing actions return one of:

```typescript
type ShareActionResult = "shared" | "copied" | "cancelled";
```

The UI uses this to distinguish a successful system share, a clipboard
fallback, and a user cancellation without treating cancellation as a failure.

## Canonical public URLs

The builders are the only supported way to construct product/profile share
links:

```typescript
buildProductShareUrl(productId);
buildProfileShareUrl(uid);
```

Examples:

```text
https://gova-swart.vercel.app/s/product?mode=view&productId=product-123
https://gova-swart.vercel.app/s/profile?mode=preview&uid=usr_123
```

The `mode` value is explicit to preserve the existing page contract. The links
do not contain `utm_*`, a share ID, a seller attribution value, a sharer ID, a
destination value, or a redirect token.

`PUBLIC_SHARE_ORIGIN` is normalized to an origin only. A configured path,
query, or trailing slash cannot become part of generated share links. An
invalid configured URL falls back to:

```text
https://gova-swart.vercel.app
```

## Destination behavior

### WhatsApp

WhatsApp receives a newline-separated message:

```text
<title>
<short text>
<public URL>
```

The module generates a `https://wa.me/?text=...` URL using `URL` and
`URLSearchParams`, so the message is encoded correctly. WhatsApp decides
whether to render a preview by fetching the public URL and reading its Open
Graph metadata.

### Facebook

Facebook receives only the canonical URL through:

```text
https://www.facebook.com/sharer/sharer.php?u=<public URL>
```

The visible card title, description, image, and canonical destination come
from the public page's Open Graph metadata. They are not supplied through
untrusted client query parameters.

### Instagram

Instagram does not expose a supported web endpoint for publishing an arbitrary
external clickable link. The module therefore:

1. opens Instagram;
2. copies the title, short text, and URL;
3. keeps the menu open and tells the user to paste the copied content.

This behavior must not be replaced with a fabricated or undocumented
Instagram publishing URL.

### Other Share

`shareThroughSystem()` uses the Native Platform Share abstraction. It sends the
title, text, and URL when the platform can open a share sheet.

Fallback order:

```text
native/system share available -> open share sheet
share unavailable             -> copy URL
unexpected share failure      -> copy URL
user cancels share sheet       -> return "cancelled"; do nothing else
```

Application UI must not import Capacitor directly. Native access remains behind
`src/native-platform`.

### Copy link

`copyShareLink()` writes only the canonical public URL through the Native
Platform Clipboard abstraction. It does not append attribution.

### Map/location links

`shareLocationUrl()` implements the same system-share-or-copy policy for
absolute map URLs. Callers may provide `onCopied` and `onFailed` callbacks for
surface-specific feedback. A cancelled share sheet does not trigger either
callback.

## Share menu UI contract

`ShareMenu` accepts:

```typescript
interface ShareMenuProps {
  content: ShareContent;
  locale: "ar" | "en";
  trigger: ReactNode;
}
```

The component intentionally accepts the existing page trigger instead of
creating a second share button. This preserves page layout while keeping all
dialog and action behavior centralized.

The menu provides:

- a mobile bottom sheet and a centered dialog on larger screens;
- WhatsApp, Facebook, Instagram, Other Share, and Copy Link actions;
- official recognizable brand icons for social destinations;
- a resource image/title/description preview;
- Arabic RTL and English LTR layout;
- `aria-label` values for icon actions;
- `role="status"` and `aria-live="polite"` for result feedback;
- keyboard focus rings and semantic buttons;
- normal close/reset behavior when the dialog is dismissed.

Product sharing is displayed only in product `view` mode and only when a
resource identifier is available. Profile sharing is displayed for a valid
public preview UID.

## Server-rendered rich previews

Social crawlers often do not execute application JavaScript. The module uses
Next.js `generateMetadata()` on the public `/s/*` routes so Open Graph and
Twitter metadata are present in the initial HTML.

Every successful metadata response includes:

- document title and description;
- canonical URL;
- `og:type=website`;
- `og:locale=ar_EG`;
- `og:site_name=ASOL`;
- Open Graph title, description, URL, and image;
- `twitter:card=summary_large_image`;
- Twitter title, description, and image;
- an explicit robots policy.

### Product metadata selection

| Metadata field | Source/fallback |
|---|---|
| Title | Product name plus current price or price label, capped at 100 characters. |
| Description | Main description, then price label, then the ASOL default description; capped at 180 characters. |
| Image | First non-empty product image, then `/logo.png`. |
| Canonical URL | `buildProductShareUrl(product.id)`. |
| Robots | Index/follow only when `product.status === "active"`. |

If the product identifier is missing, no resource metadata is generated. If
loading fails, the page emits generic unavailable metadata and `noindex,
nofollow`; it does not leak an internal error or make a false availability
claim.

### Profile metadata selection

| Metadata field | Source/fallback |
|---|---|
| Title | Store name, then generic ASOL profile title; capped at 100 characters. |
| Description | Store description, then the ASOL default description; capped at 180 characters. |
| Image | Cover image, then avatar image, then `/logo.png`. |
| Canonical URL | `buildProfileShareUrl(uid)`. |

If profile loading fails, the page emits generic profile metadata and
`noindex,nofollow`.

Whitespace is normalized before metadata is emitted. Long strings are
truncated with an ellipsis so the card remains bounded.

### Server data reuse

The public page loads the same record used by metadata and passes it as initial
data to the normal product/profile component. React `cache()` deduplicates the
server loader during the render where Next.js requests both metadata and page
content.

This has two purposes:

1. the visible page and the social card describe the same source record;
2. the browser does not need an avoidable second initial request before showing
   the public resource.

Normal client services remain responsible for subsequent refreshes. Sharing
does not introduce a parallel product or profile repository.

## Public web route versus Capacitor route

The normal internal routes remain statically exportable:

```text
/product
/profile
```

The public crawler routes require server-side data and metadata:

```text
/s/product
/s/profile
```

`scripts/build-static.ts` removes both `app/s` and `app/.well-known` only from
its temporary source tree before generating the Capacitor `out/` directory.
It does not delete them from the main source tree.

This separation is mandatory:

- the deployed Next.js web application serves `/s/*` and `/.well-known/*`;
- the Capacitor bundle contains the internal static pages;
- `out/s` and `out/.well-known` must not exist after `npm run build:static`;
- `public/asol-web-manifest.json` must not list either server-only path.

Adding a server dependency directly to the internal `/product` or `/profile`
page can break the static mobile build. Resource metadata therefore belongs on
the thin `/s/*` wrappers.

## Header install prompt

`useOpenInAsolHeaderPrompt()` owns route, runtime, and store selection.
`OpenInAsolHeaderPrompt` is rendered inside `AppHeader` as a second header row
on product views and profile previews. It is not a floating page overlay.

Behavior:

| Runtime | Result |
|---|---|
| Native Capacitor | Hidden; the user is already in ASOL. |
| Android web | Google Play link for `hgh.asol.app`. |
| Desktop/non-iOS web | Google Play link. |
| iPhone/iPad web with App Store URL configured | Configured App Store link. |
| iPhone/iPad web without App Store URL | Hidden; an iOS user is never sent to Google Play. |

iPadOS desktop-mode detection also checks `MacIntel` with touch points. The
shell sets `--asol-header-install-height` only while the prompt has a valid
destination, and `--asol-app-header-height` includes that row. Page content
therefore starts below the expanded header instead of being covered by it.

## Android App Links

The Android manifest declares one `android:autoVerify="true"` HTTPS intent
filter for:

```text
host: gova-swart.vercel.app
paths: /s/product, /s/profile
```

The deployed web application must serve:

```text
GET /.well-known/assetlinks.json
Content-Type: application/json
```

The association delegates `common.handle_all_urls` to:

```text
package: hgh.asol.app
```

The route contains:

- the verified Google Play App Signing SHA-256 certificate fingerprint;
- the local release-signing SHA-256 certificate fingerprint;
- any valid additional/rotated fingerprints configured through
  `ASOL_ANDROID_APP_LINK_CERT_SHA256`.

Configured fingerprints may be separated with commas or semicolons. The route
removes punctuation, validates exactly 64 hexadecimal characters, normalizes
the value to uppercase colon-separated bytes, drops invalid entries, and
deduplicates the final list.

Changing the web origin alone is insufficient. The HTTPS host must agree in all
of these places:

1. `NEXT_PUBLIC_ASOL_PUBLIC_WEB_ORIGIN`;
2. `android/app/src/main/AndroidManifest.xml`;
3. `assetlinks.json` served by that host;
4. the deployed share URL received by the device.

A manifest change is a native-surface change and requires a new store shell; it
cannot be delivered to already-installed shells by web-only OTA.

## iOS Universal Links

The iOS entitlement declares:

```text
applinks:gova-swart.vercel.app
```

The deployed web application serves the extensionless endpoint:

```text
GET /.well-known/apple-app-site-association
Content-Type: application/json
```

When `ASOL_IOS_TEAM_ID` is a valid ten-character uppercase alphanumeric Apple
Team ID, the response includes:

```text
appID: <ASOL_IOS_TEAM_ID>.<ASOL_IOS_BUNDLE_ID>
paths: /s/product, /s/profile
```

`ASOL_IOS_BUNDLE_ID` defaults to `hgh.asol.app`. When the Team ID is missing or
invalid, `details` is intentionally empty, so the deployment does not claim an
association with an unknown Apple identity.

Before an iOS release, configure the real Team ID and App Store URL, deploy the
web association, validate the endpoint from the public internet, and build the
native application with the associated-domain entitlement. An entitlement or
associated-domain change requires a native release.

## Cold and warm native launches

Both launch paths are required:

| State | Source | Handling |
|---|---|---|
| App not running | Capacitor `App.getLaunchUrl()` | `app.launchUrl()` during controller mount. |
| App already running/backgrounded | Capacitor `appUrlOpen` event | `app.onDeepLink()` subscription. |

`ShareDeepLinkController` is mounted once from the root layout. It unsubscribes
on unmount and prevents an asynchronous subscription from surviving disposal.
Valid public links are converted to internal routes with `router.replace()` so
the external URL is not left as an unnecessary history entry.

## Deep-link security boundary

`internalRouteFromPublicShareUrl()` is a strict parser, not a generic redirect.
It returns `null` unless all required conditions hold:

1. the input is an absolute valid URL;
2. its origin exactly equals `PUBLIC_SHARE_ORIGIN`;
3. its path is exactly `/s/product` or `/s/profile`;
4. the required identifier exists and is not whitespace.

The function reconstructs the internal route from the allowed identifier and
encodes it with `encodeURIComponent()`. It does not pass an external pathname,
fragment, arbitrary destination, nested redirect, or attacker-controlled route
to the application router. Extra public query parameters are ignored rather
than copied to the internal route.

Examples:

| Input | Result |
|---|---|
| Correct origin + `/s/product` + `productId` | Internal product view route. |
| Correct origin + `/s/profile` + `uid` | Internal profile preview route. |
| Different origin | Rejected. |
| Correct origin + `/settings` | Rejected. |
| Missing identifier | Rejected. |
| Relative or malformed URL | Rejected. |

## Privacy and storage

The sharing module performs no database writes and requires no database schema
change. In particular, it does not create:

- share rows or short-link rows;
- click or visit records;
- seller or sharer attribution;
- social destination history;
- cookies, local-storage attribution, or persisted prompt state;
- UTM or referrer query parameters.

The existing product/profile services read only the public information needed
to render the target page and metadata. Platform providers such as WhatsApp,
Facebook, Instagram, Apple, Google, the browser, and the operating system may
apply their own independent policies outside ASOL; this module does not claim
to control third-party logging.

## Configuration

### Client-safe variables

| Variable | Required | Default | Purpose |
|---|---:|---|---|
| `NEXT_PUBLIC_ASOL_PUBLIC_WEB_ORIGIN` | Recommended | `https://gova-swart.vercel.app` | Absolute public origin used for canonical share URLs and metadata. |
| `NEXT_PUBLIC_ASOL_APP_STORE_URL` | Required for iOS header prompt | Empty | Public ASOL App Store listing. Empty hides the prompt on iOS. |

These values are embedded in client code and are not secrets.

### Server/build variables

| Variable | Required | Default | Purpose |
|---|---:|---|---|
| `ASOL_ANDROID_APP_LINK_CERT_SHA256` | No | Empty | Additional or rotated Android signing fingerprints. |
| `ASOL_IOS_TEAM_ID` | Required to activate Universal Links | Empty | Ten-character Apple Team ID. |
| `ASOL_IOS_BUNDLE_ID` | No | `hgh.asol.app` | Bundle ID used in the AASA `appID`. |

Changing association variables requires rebuilding/redeploying the web
application because the well-known routes are statically generated. Do not put
private signing keys or keystore passwords in any sharing variable.

## Cache headers and deployment behavior

Both well-known association routes return:

```text
Cache-Control: public, max-age=3600, s-maxage=86400
```

This permits one hour of browser freshness and one day of shared/CDN freshness.
Certificate, Team ID, bundle ID, domain, or path changes may therefore take time
to propagate unless the deployment/CDN cache is invalidated.

Rich previews also have third-party caches. Updating product data or metadata
does not guarantee that Facebook or WhatsApp immediately refreshes a card they
already scraped.

## Public deployment checklist

Before considering public sharing ready on a deployed environment:

1. Set `NEXT_PUBLIC_ASOL_PUBLIC_WEB_ORIGIN` to the exact HTTPS production
   origin.
2. Deploy the server-rendered `/s/product` and `/s/profile` routes.
3. Confirm a real public product/profile URL returns HTTP 200 without login.
4. Inspect the initial HTML for canonical, Open Graph, and Twitter tags.
5. Confirm every `og:image` URL is absolute, publicly reachable, and returns an
   image content type.
6. Confirm `/.well-known/assetlinks.json` returns the production package and all
   currently valid signing fingerprints.
7. On Android, confirm the manifest host/path pair exactly matches the public
   URLs.
8. Before iOS release, configure the Team ID, bundle ID, App Store URL, and
   validate the AASA response.
9. Test cold launch and warm launch on actual devices.
10. Test the public web fallback with the application not installed.
11. Check that no tracking parameters appear in generated URLs.
12. Run the automated checks below.

## Automated verification

### Focused module test

```bash
npm run test:sharing
```

The focused test verifies:

- product URL origin, path, mode, and identifier;
- profile URL path, mode, and identifier;
- absence of `utm_source`;
- deterministic title/text/URL message composition;
- WhatsApp message encoding;
- Facebook canonical URL selection;
- valid public-to-internal product/profile routing;
- rejection of an untrusted origin;
- rejection of an unsupported path.

The focused test is included in the full `npm test` chain.

### Required surrounding checks

```bash
npm run typecheck
npm run architecture:check
npm run test:native-platform
npm run test:sharing
npm run build:static
npx next build
```

After the static build, verify:

```text
out/s does not exist
out/.well-known does not exist
public/asol-web-manifest.json contains neither path
```

When Android native declarations change, also process the release manifest and
inspect the merged output for `android:autoVerify`, the host, and both paths.

## Manual test matrix

| Scenario | Expected result |
|---|---|
| Product share button | One centralized menu opens with five actions. |
| Profile share button | The same menu and action behavior are used. |
| WhatsApp | Composer opens with title, text, and canonical URL; public deployments can render the OG card. |
| Facebook | Sharer opens with the canonical public URL and reads the OG card. |
| Instagram | Instagram opens and the composed text/link is copied. |
| Other Share on native | Android/iOS system share sheet opens. |
| Other Share without native support | URL is copied and localized feedback appears. |
| Share-sheet cancellation | No error and no clipboard fallback. |
| Copy Link | Canonical `/s/*` URL is copied. |
| Public product URL | Full page renders; metadata exists in initial HTML. |
| Public profile URL | Full page renders; metadata exists in initial HTML. |
| App not installed | Public web page remains usable and offers the correct store. |
| Android app installed, cold | Verified URL opens the internal resource. |
| Android app installed, warm | URL event replaces the current route with the internal resource. |
| Invalid external origin | Application ignores it. |
| Missing resource | Generic non-indexable metadata; no internal stack trace. |

## Failure behavior

| Failure | Behavior |
|---|---|
| Invalid configured public origin | Use the known production fallback origin. |
| Native share unavailable | Copy the public URL. |
| Unexpected native share error | Attempt clipboard fallback. |
| Clipboard/action failure | Keep the menu open and show localized failure feedback. |
| User cancels share sheet | No error and no forced copy. |
| Product/profile metadata read fails | Emit generic `noindex,nofollow` metadata. |
| iOS App Store URL missing | Hide the iOS header prompt. |
| iOS Team ID missing/invalid | Serve an empty AASA `details` list. |
| Invalid extra Android fingerprint | Ignore it rather than publishing malformed association data. |
| Untrusted or unsupported deep link | Ignore it. |

The visible resource page owns its own data-service error presentation. For
example, optional product reviews degrade to an empty reviews result when that
secondary service cannot load; a reviews failure must not make the shared
product entry point unusable.

In `next dev`, the Service Bridge keeps product and review reads on the local
Business API. This is required because the server-rendered public page reads the
local SQLite product database; redirecting browser reads to a deployed products
service would mix two datasets and report `productNotFound` for valid local
products. Deployed web, static, and Capacitor builds retain the read-service
split.

## Adding a new shareable resource

Do not add destination code directly to the new feature page. Use this sequence:

1. Add the new resource kind to `ShareResourceKind` only if the type is useful
   to shared behavior.
2. Add one canonical public URL builder to `share-links.ts`.
3. Add one thin server-rendered `/s/<resource>` route.
4. Add a server loader and metadata builder to `share-metadata.server.ts`.
5. Export server APIs only through `index.server.ts`.
6. Reuse the normal resource page component and pass server initial data when
   possible.
7. Supply `ShareContent` and the existing trigger to `ShareMenu`.
8. Add the new public path to the strict deep-link parser only if it should open
   natively.
9. If native opening is required, update Android App Links, iOS Universal
   Links, and both well-known association responses together.
10. Add the server route to the static-build exclusion contract.
11. Extend focused tests with accepted and rejected cases.
12. Run web, static, native-platform, and real-device verification.

Adding a new social destination follows a different rule: add its action once
in `share-actions.client.ts`, add the destination vocabulary in
`share-content.ts`, and add one menu entry in `ShareMenu`. Feature pages must
remain unchanged.

## Maintenance rules

- Do not hard-code `gova-swart.vercel.app` in product/profile components.
- Do not call `navigator.share`, `navigator.clipboard`, or Capacitor plugins from
  feature pages.
- Do not accept a caller-provided redirect target in a public share URL.
- Do not build Open Graph metadata from arbitrary social-share query values.
- Do not move server loaders into the client barrel.
- Do not put `/s/*` server routes into the Capacitor output.
- Do not claim Android/iOS link verification until both the native declaration
  and the public well-known association agree.
- Do not remove an old signing fingerprint while a distributed build still uses
  it.
- Do not silently send iOS users to Google Play.
- Do not add analytics or attribution without a separate, explicit privacy and
  product decision.

## Troubleshooting

### WhatsApp or Facebook shows only a plain link

Check the deployed public URL, not localhost:

1. Confirm it returns HTTP 200 to an unauthenticated request.
2. Inspect the raw first HTML response for `og:title`, `og:description`,
   `og:image`, and `og:url`.
3. Open the `og:image` URL directly and confirm it is publicly reachable.
4. Verify the canonical host matches `NEXT_PUBLIC_ASOL_PUBLIC_WEB_ORIGIN`.
5. Account for the social provider's cached scrape.

Client-rendered title/image state cannot repair metadata that was absent from
the crawler's initial response.

### Android opens the browser instead of ASOL

Check:

- the installed package is `hgh.asol.app`;
- its signing certificate is present in `assetlinks.json`;
- the manifest has `autoVerify` for the exact HTTPS host and path;
- the public association endpoint is reachable without redirects or login;
- the installed build actually contains the updated manifest;
- Android link-opening preferences were not disabled by the user.

An OTA web bundle cannot add an intent filter to an already-installed native
shell.

### iOS opens Safari instead of ASOL

Check:

- `ASOL_IOS_TEAM_ID` and `ASOL_IOS_BUNDLE_ID` form the installed app's exact
  `appID`;
- the AASA endpoint has no `.json` suffix and is publicly reachable;
- the app was signed with the associated-domain entitlement;
- the domain and `/s/*` paths match exactly;
- the installed native build includes the entitlement.

### The public page works but the static mobile build fails

Confirm the resource metadata was added to a thin `/s/*` wrapper and that the
server-only route is in `STATIC_ROUTE_IGNORELIST`. Do not make the internal
mobile page await server `searchParams` or import server repositories.

### The menu works but copying fails

Keep clipboard access behind the Native Platform abstraction. Browser clipboard
support can depend on a secure context and user gesture; the menu action already
provides the gesture, while native builds use the compiled platform adapter.

## Current limitations

- Instagram receives copied content rather than a direct link-post composer.
- Social-card refresh timing is controlled by each external platform's cache.
- iOS Universal Links remain inactive until a valid Team ID is configured and a
  matching native build is shipped.
- The header prompt is intentionally non-dismissible and remains visible while
  the user is on an eligible public product/profile surface.
- The module does not provide short links, QR codes, referral attribution,
  analytics, or share-count reporting.

These are explicit product boundaries, not missing database work.
