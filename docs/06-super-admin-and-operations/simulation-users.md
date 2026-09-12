# Live Simulation Users

Gova has nine persistent simulation identities in the real Turso development data plane. They are not mocks and are not an in-memory seed. The accounts use the same users/auth database, profile shards, specialty indexes, and contact data used by ordinary application users.

Created and verified on 2026-09-12 for end-to-end marketplace simulation.

## Purpose

The fleet is intended for real application exercises: buyers create orders, sellers receive and act on them, and service providers participate in delivery/service flows. The UIDs are deliberately stable so the same identities can be reused across scenarios.

## Account registry

| Actor | Role | UID | Alias | Virtual phone | Cloud-account email |
| --- | --- | --- | --- | --- | --- |
| Buyer 01 | Buyer | `usr_sim_buyer_01` | `مشتري المحاكاة 01` | `+201000009001` | `print.code.1000@gmail.com` |
| Buyer 02 | Buyer | `usr_sim_buyer_02` | `مشتري المحاكاة 02` | `+201000009002` | `tenderxcontractors@gmail.com` |
| Buyer 03 | Buyer | `usr_sim_buyer_03` | `مشتري المحاكاة 03` | `+201000009003` | `groupstenderximages@gmail.com` |
| Seller 01 | Seller | `usr_sim_seller_01` | `متجر المحاكاة 01` | `+201100009001` | `tenderx.engineer100@gmail.com` |
| Seller 02 | Seller | `usr_sim_seller_02` | `متجر المحاكاة 02` | `+201100009002` | `bs.bid.story@gmail.com` |
| Seller 03 | Seller | `usr_sim_seller_03` | `متجر المحاكاة 03` | `+201100009003` | `gnagnahesham@gmail.com` |
| Provider 01 | Service provider | `usr_sim_provider_01` | `مقدم توصيل المحاكاة 01` | `+201200009001` | `tenderx10@gmail.com` |
| Provider 02 | Service provider | `usr_sim_provider_02` | `مقدم خدمات المحاكاة 02` | `+201200009002` | `hesham10125@gmail.com` |
| Provider 03 | Service provider | `usr_sim_provider_03` | `مقدم خدمات المحاكاة 03` | `+201200009003` | `hesham.gaber@gmail.com` |

The phone numbers are fixed simulation login identities. No ownership of the external telephone numbers is implied, and provisioning has no SMS dependency.

## Account mode and specialties

Buyers have `provider_account_enabled = 0`. Sellers and service providers have `provider_account_enabled = 1` so the provider editing surfaces and marketplace capabilities are available.

- Seller 01: Women's clothing, category/subcategory `1:1`.
- Seller 02: Restaurants, `2:14`.
- Seller 03: Smartphones/tablets, `3:1`.
- Provider 01: Delivery Services, direct category `46`.
- Provider 02: Delivery Services plus vehicle maintenance `7:5`.
- Provider 03: Delivery Services plus development/software `3:4`.

All three service providers therefore qualify as real delivery candidates while still allowing non-delivery service scenarios.

## Credentials

Plaintext passwords live only in the git-ignored `.env.local`. Turso stores only normal `scrypt$...` password hashes compatible with `packages/auth-core/src/server/password.ts`.

For each actor, `.env.local` contains:

```text
SIM_<ACTOR>_UID
SIM_<ACTOR>_ROLE
SIM_<ACTOR>_ALIAS
SIM_<ACTOR>_PHONE
SIM_<ACTOR>_EMAIL
SIM_<ACTOR>_PASSWORD
```

`<ACTOR>` is `BUYER_01` through `BUYER_03`, `SELLER_01` through `SELLER_03`, or `PROVIDER_01` through `PROVIDER_03`. `SIMULATION_USERS_ENABLED=true` marks the environment as provisioned.

Never copy plaintext `SIM_*_PASSWORD` values into Git, logs, screenshots, or documentation.

## Turso placement

The live records are distributed through the same cloud databases used by Gova:

- users/auth identities and password hashes: `TURSO_DATABASE_URL`.
- aliases, primary identity data, and `user_specialties`: `PROFILE_CORE_DATABASE_URL`.
- searchable specialty rows: `PROFILE_CATALOG_DATABASE_URL`.
- primary simulation phone/email contact points: `PROFILE_CONTACT_DATABASE_URL`.

## Verified state

Initial provisioning verification returned:

- 9 users.
- 9 profile identities.
- contact rows present for all 9 users.
- 8 searchable specialty rows across the three sellers and three service providers.
- 3 buyers, 3 sellers, and 3 service providers.
- every stored password is in the expected `scrypt$...` format.

These are durable test actors, not disposable database rows. Future simulation cleanup must target the fixed `usr_sim_*` namespace and must never broaden deletion to ordinary users.

The cloud-account email addresses are intentionally reused as requested for this controlled simulation fleet. They are application identity values here; this document does not imply that every external mailbox is used for password recovery testing.

## Login verification

`npx tsx scripts/verify-simulation-users.ts` performs real HTTP logins against the local Gova `/api/auth/login` route using the credentials from `.env.local` without printing passwords or session tokens.

On initial provisioning, all nine actors returned HTTP `200` with their exact fixed UIDs. Buyers returned `providerAccountEnabled=false`; all sellers/providers returned `true`; and the expected seller/provider specialty selections were returned by the login response.
## Live Simulation Mode

`npm run dev` now starts the development simulation gateway. Normal development remains on `http://127.0.0.1:3001` and Simulation Mode starts OFF.

The fixed actor origins are:

| Origin | Actor |
| --- | --- |
| `3002` | Buyer 01 |
| `3003` | Buyer 02 |
| `3004` | Buyer 03 |
| `3005` | Seller 01 |
| `3006` | Seller 02 |
| `3007` | Seller 03 |
| `3008` | Provider 01 |
| `3009` | Provider 02 |
| `3010` | Provider 03 |
| `3011` | Super Admin |

Each origin owns its own browser storage, Service Worker, and Web Push subscription. The internal Next.js backend runs on `3199`; it is not a user-facing actor origin.

### Operating the mode

The Super Admin `ASOL DEV` menu contains the Simulation Mode switch. Turning it ON records the normal route and opens the Super Admin actor origin. The fixed toolbar then switches actors by full cross-origin navigation and restores each actor's last safe route. Turning the Super Admin toolbar switch OFF returns to the normal `3001` origin without deleting actor storage.

Actor sessions are created only by development-only server routes. The gateway supplies the actor identity from the listening port, the nine users authenticate through the ordinary login service, and Super Admin receives the canonical signed Super Admin session. Plaintext credentials never enter client bundles.

While Live Simulation Mode is active, the Super Admin DOM attribute inspector is exposed on every actor origin, including all buyers, sellers, service providers, and the Super Admin actor. Outside Simulation Mode, the inspector keeps its normal Super Admin-only authorization.

For an Android device connected by ADB, bind normal development plus all ten actor origins with:

```text
npm run dev:simulation:adb
```

Remove only these simulation reverses with:

```text
npm run dev:simulation:adb:remove
```

The helper binds `3001` through `3011` individually and does not require Wi-Fi or a hotspot. `npm run dev:simulation:smoke` verifies the gateway and all actor ports without leaving the internal Next.js process running.
