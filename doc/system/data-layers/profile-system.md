# Profile System

Extended profile data lives in a separate database from auth users.

## Databases

| Environment | Users/Auth | Profile |
|-------------|------------|---------|
| Development | `public/sync_data/sync_sqlite/allusers.db` | `public/sync_data/sync_sqlite/profile.db` |
| Production | Turso `TURSO_DATABASE_URL` | Turso `TURSO_PROFILE_DATABASE_URL` |

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
  -> profileDbClient
  -> profile.db | Turso profile
```

Basic registration credentials stay in the users/auth database. Profile display, search, contacts, locations, shipping, returns, working hours, follows, and seller category indexes stay in the profile database.

Shipping mode `by_location` stores no estimated numeric location value. It starts the buyer-approved quote flow in the marketplace-orders database. Special-vehicle fees are evaluated per seller cart group and apply only when at least one included product requires a transport vehicle.

## Store Details

Store details are split across real columns and tables. Store name, description, story, rating settings, custom request state, and trending label live directly on `user_profiles`. Featured products, trending items, and working hours live in dedicated tables.

Working hours are normalized by `src/features/profile-working-hours` and saved through the regular profile editor flow. They are stored in `profile_working_hours` and do not have a separate save button.

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

## Migration

The structural migration is:

```text
src/core/database/profile/migrations/0010_profile_structured_search.sql
```

Existing local and Turso databases are rebuilt with:

```bash
npx tsx scripts/migrate-profile-structured-search.ts
npx tsx scripts/migrate-profile-structured-search.ts --cloud
```

After migration, run:

```bash
npm run db:schema:sync
```

## Environment

```env
TURSO_PROFILE_DATABASE_URL=
TURSO_PROFILE_AUTH_TOKEN=
TURSO_PRODUCT_DATABASE_URL=
TURSO_PRODUCT_AUTH_TOKEN=
```

The product Turso credentials are used by the migration script to populate profile product counts in the cloud.
