# Current Databases

GOVA uses **two logical databases** — each with local SQLite (dev) and a separate Turso DB (prod).

## Map

| Domain | SQLite (dev) | Turso (prod) | Database Client | Env |
|--------|--------------|--------------|-----------------|-----|
| Users (auth) | `allusers.db` | `gova-db` | `dbClient` | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` |
| Profile (contacts) | `profile.db` | `gova-profile` | `profileDbClient` | `TURSO_PROFILE_*` |

**Logical link:** `user_profiles.uid` ↔ `users.uid` (no cross-file FK).

---

## 1. Users — `allusers.db`

### Schema

`src/core/database/schema.ts` → table `users`

### Layers

| Layer | Files |
|-------|--------|
| API | `/api/auth/*` |
| Server Service | `auth-service.server.ts` |
| Operations | `CreateUserCommand`, `GetUserByPhoneQuery`, … |
| Repository | `user-repository.ts` → `dbClient` |

### Client

- Login/Register → `AuthApiService`
- Phone/email/password → `PUT /api/auth/profile`
- Session `{ uid, phone, email? }` → **IndexedDB** (not read from DB on client)

---

## 2. Profile — `profile.db`

### Schema

`src/core/database/profile/profile.schema.ts` → `user_profiles`

| Column | Content |
|--------|---------|
| `uid` | PK |
| `phones_json`, `emails_json`, `social_links_json`, `websites_json` | JSON arrays |

### Layers

| Layer | Files |
|-------|--------|
| API | `GET/PUT /api/profile/contacts` |
| Server Service | `profile-service.server.ts` |
| Operations | `GetProfileContactsQuery`, `UpsertProfileContactsCommand` |
| Repository | `profile-repository.ts` → `profileDbClient` |

### Client

- `ProfileContactsCard` → `useProfileContacts` → `ProfileApiService`

---

## Schema workflows

### Users

```bash
# Edit src/core/database/schema.ts
npx drizzle-kit generate
npm run dev
npm run build   # sync → gova-db
```

### Profile

```bash
# Edit src/core/database/profile/profile.schema.ts
npx drizzle-kit generate --config drizzle.profile.config.ts
npm run db:create:profile   # if needed
npm run build               # sync → gova-profile
```

---

## Setup commands

```bash
npm run db:ensure
npm run db:schema:sync
npm run db:provision:turso
npm run db:push:vercel-env
```

See [profile-system.md](../profile-system.md) and [20-schema-provisioning.md](./20-schema-provisioning.md).

---

## Adding a third database

1. `new.db` + schema + migrations + drizzle config
2. `newDbClient` in `src/core/database/`
3. `TURSO_NEW_*` env + provision + schema sync entry
4. Feature: Repository → Operations → Server Service → `/api/new/`
5. Client: `*-api-service.ts` + Hook + UI
