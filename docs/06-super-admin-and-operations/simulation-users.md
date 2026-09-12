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
| Seller 03 | Seller | `usr_sim_seller_03` | `متجر المحاكاة 03` | `+201100009003` | `gnagnahesham@gmail.com` || Provider 01 | Service provider | `usr_sim_provider_01` | `مقدم توصيل المحاكاة 01` | `+201200009001` | `tenderx10@gmail.com` |
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

Plaintext passwords live only in the git-ignored `.env.local`. Turso stores only normal `scrypt$...` password hashes compatible with `packages/auth-core/src/server/password.ts`.For each actor, `.env.local` contains:

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
- primary simulation phone/email contact points: `PROFILE_CONTACT_DATABASE_URL`.## Verified state

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