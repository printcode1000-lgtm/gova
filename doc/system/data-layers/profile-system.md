# Profile System

Extended contact data (phones, emails, social links, websites) lives in a **separate database** from auth users.

## Databases

| Environment | Users (auth) | Profile (contacts) |
|-------------|--------------|-------------------|
| Development | `public/sync_data/sync_sqlite/allusers.db` | `public/sync_data/sync_sqlite/profile.db` |
| Production | Turso `TURSO_DATABASE_URL` | Turso `TURSO_PROFILE_DATABASE_URL` |

Logical link: `user_profiles.uid` → `users.uid` (no cross-file foreign key).

## Table: `user_profiles`

| Column | Type | Notes |
|--------|------|--------|
| `uid` | TEXT PK | Same uid as session / users table |
| `phones_json` | TEXT | JSON array |
| `emails_json` | TEXT | JSON array |
| `social_links_json` | TEXT | JSON array |
| `websites_json` | TEXT | JSON array |
| `location_json` | TEXT | JSON object with address, latitude, longitude |

JSON shape matches `ContactInfoCard` / `ProfileContactsData`.

## Data flow

```
ProfileContactsCard → useProfileContacts → ProfileApiService → GovaApiClient
  → GET/PUT /api/profile/contacts → ProfileService → Query/Command → ProfileRepository
  → profileDbClient → profile.db (dev) | Turso profile (prod)
```

Basic registration (phone, email, password) stays in **IDB session** + `allusers.db` via `/api/auth/profile`.

## Scripts

- `npm run db:create:profile` — create `profile.db` from Drizzle migrations
- `npm run db:ensure` — ensure both SQLite files exist (runs before build)
- `npm run db:schema:sync` — sync `allusers.db` → users Turso, `profile.db` → profile Turso
- `npm run db:provision:turso` — provision **both** Turso databases via Platform API

## Environment

```env
TURSO_PROFILE_DATABASE_URL=
TURSO_PROFILE_AUTH_TOKEN=
```

Provision with `npm run db:provision:turso` after setting `TURSO_API_TOKEN` and `TURSO_ORGANIZATION`.

For Vercel deploys, push all four Turso runtime vars to the project:

```bash
npm run db:push:vercel-env
```

Then redeploy (or push to `main` to trigger Git integration).
