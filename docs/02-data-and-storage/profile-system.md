# Profile System

## Purpose

Preserved operational and architectural detail, relocated here during the 2026-08 architecture reconstruction. Agents use this for implementation guidance.

## Scope

See sections below. Architectural relationships defer to [docs/01-architecture/README.md](../01-architecture/README.md) where applicable.

---

Extended profile data lives in a separate database from auth users.

## Databases

| Environment | Users/Auth | Profile |
|-------------|------------|---------|
| Development | `public/sync_data/sync_sqlite/allusers.db` | profile shard files in `public/sync_data/sync_sqlite` |
| Production | Turso `TURSO_DATABASE_URL` | profile shard Turso databases |

Logical link: `user_profiles.uid` points to `users.uid`. There is no cross-database foreign key.

## Table: `user_profiles`

`user_profiles` stores searchable profile data in real columns. Profile search no longer depends on JSON columns.

| Column group | Columns |
|--------------|---------|
| Identity | `uid`, `store_name`, `store_description`, `store_story` |
| Search text | `store_name_search`, `store_description_search` |
| Primary contact | `primary_phone`, `primary_phone_normalized`, `primary_whatsapp`, `primary_whatsapp_normalized`, `primary_email` |
| Primary location | `primary_address`, `primary_governorate`, `primary_city`, `primary_area`, `primary_latitude`, `primary_longitude` |
| Rating cache | `rating_enabled`, `rating_mode`, `rating_average`, `rating_count` |
| Shipping | `shipping_pricing_mode`, `shipping_flat_rate`, legacy `shipping_location_base_rate` (always zero and unused), `shipping_special_vehicle_fee`, `shipping_free_shipping_threshold`, `shipping_notes` |
| Returns | `returns_enabled`, `return_window_days`, `return_shipping_payer`, `return_policy_text` |
| Profile display | `custom_request_enabled`, `trending_label` |

Removed profile JSON columns:

- `phones_json`
- `emails_json`
- `social_links_json`
- `websites_json`
- `location_json`
- `cover_image_keys_json`
- `store_details_json`
- `specialties_json`
- `rating_settings_json`
- `fulfillment_settings_json`

These names describe removed migration-era storage only. Runtime code must not
read, write, or fall back to any of them. Store images have one canonical
contract: ordered rows in `profile_images` (`avatar` or `cover`).

## Structured Tables

| Table | Purpose |
|-------|---------|
| `profile_contact_points` | Phone, WhatsApp, email, website, and social links. |
| `profile_locations` | One or more searchable profile locations with latitude and longitude. |
| `profile_images` | Avatar and cover images. |
| `profile_featured_products` | Products shown in the profile featured section. |
| `profile_trending_items` | Text items shown in the profile trending ribbon. |
| `profile_working_hours` | Weekly opening periods. |
| `profile_delivery_carriers` | Delivery service providers linked to a seller. |
| `profile_search_categories` | Search index derived from selected specialties and category IDs. |
| `profile_category_product_counts` | Per-seller product counts by category/subcategory. Fixed pharmacy starter products are excluded. |
| `follows` | Store, product, and category follows. |

`profile_type` is intentionally not stored. Seller type is derived from `user_specialties`, `profile_search_categories`, and the category module.

## Data Flow

```text
Profile UI
  -> Profile hooks
  -> ProfileApiService
  -> AsolApiClient
  -> /api/profile/*
  -> ProfileService
  -> Query/Command
  -> ProfileRepository
  -> profilesDataSource
  -> profile shards | Turso profile shards
```

Basic registration credentials stay in the users/auth database. Profile display, search, contacts, locations, shipping, returns, working hours, follows, and seller category indexes stay in the profile database.

The fulfillment editor searches delivery providers by store name and never
renders a UID as a provider title. Its carrier badge and duplicate linked-list
label are intentionally omitted. The return-policy enabled state uses the same
accessible switch control as notification preferences, keeps the switch beside
its label, and changes the label between available and unavailable with state.
The public fulfillment preview follows the same identity rule: it renders a
linked provider only after a non-empty store name resolves and never falls back
to a UID while loading or when profile data is incomplete.

Shipping mode `by_location` stores no estimated numeric location value. It starts the buyer-approved quote flow in the marketplace-orders database. Special-vehicle fees are evaluated per seller cart group and apply only when at least one included product requires a transport vehicle.

## Store Details

Store details are split across real columns and tables. Store name, description, story, rating settings, custom request state, and trending label live directly on `user_profiles`. Featured products, trending items, and working hours live in dedicated tables.

Working hours are normalized by `src/features/profile-working-hours` and saved through the regular profile editor flow. They are stored in `profile_working_hours` and do not have a separate save button.

## Profile edit workspace navigation

`/profile?mode=edit` uses a horizontal snap carousel for main tabs. Tab order
(starting after **Registration**): Specialties, **Store identity**, Products,
Contact, Working hours, Shipping/returns, Offers.

`profile.edit.activeTab` is restored from page snapshots. The tab strip and
carousel scroll positions are **not** restored from snapshots — they always
resync to `activeTab` on return so the visible panel, wave indicator, and
`inert` state stay aligned (prevents a frozen inactive panel from appearing
on screen).

Product category main/sub tab rows inside the Products panel use the same
`snap-x snap-mandatory` treatment.

The working-hours editor deliberately shows the day and period controls only;
its surrounding profile tab owns the section title. The former duplicate inner
title, explanatory sentence, and copy-first-day shortcut are not part of the
editor surface.

## Search

Profile search should use:

- `store_name_search`
- `store_description_search`
- `primary_phone_normalized`
- `profile_locations.latitude`
- `profile_locations.longitude`
- `profile_search_categories`
- `profile_category_product_counts`
- `rating_average`
- `rating_count`

Search must not parse profile JSON because those columns no longer exist.

## Product Counts

`profile_category_product_counts` is refreshed from the product database whenever products are created, updated, deleted, or when the structured migration script is run.

Fixed pharmacy starter products are excluded from these counts. Only real saved products in `products` are counted.

## Profile Specialties UI

`src/features/profile/presentation/SpecialtiesCard.tsx` owns the interactive
specialties UI and save controller. Selection normalization and subcategory
eligibility live in
`src/features/profile/presentation/specialties-selection.ts`, so the UI does not
embed catalog-selection rules directly.

## Migration

The structural migration is:

```text
packages/data-core/src/core/database/profile/migrations/0010_profile_structured_search.sql
```

Existing local shards and Turso schemas are refreshed with:

```bash
npm run db:ensure
npm run db:schema:sync
```

## Environment

```env
PROFILE_CORE_DATABASE_URL=
PROFILE_CORE_DATABASE_AUTH_TOKEN=
TURSO_PRODUCT_DATABASE_URL=
TURSO_PRODUCT_AUTH_TOKEN=
```

The product Turso credentials are used by the migration script to populate profile product counts in the cloud.
