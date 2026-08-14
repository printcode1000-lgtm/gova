# Follow System

The Follow System is a reusable module for following ASOL entities such as stores, products, and categories. It is designed as a real database-backed feature from the start, not a browser-only preference.

## Scope

Supported targets:

- `store`
- `product`
- `category`

The first UI integration is the public profile preview page. Product and category integrations can use the same module and UI component later without changing the data model.

## Architecture

```text
UI component
  -> followApiService
  -> /api/follow, /api/follow/status
  -> FollowService
  -> FollowRepository
  -> profile database: follows
```

Files:

- `src/features/follow`
- `src/components/ui/follow`
- `src/app/api/follow`
- `src/modules/data-access/core/database/profile/profile.schema.ts`
- `src/modules/data-access/core/database/profile/migrations/0009_follows.sql`

## Database

Follow records live in the profile database because follows are user/profile social relationships.

Table: `follows`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | Stable follow row id |
| `follower_uid` | TEXT | The user who follows |
| `target_type` | TEXT | `store`, `product`, or `category` |
| `target_id` | TEXT | Store uid, product id, or category id |
| `target_owner_uid` | TEXT | Owner uid when available |
| `created_at` | TEXT | ISO timestamp |

Indexes:

- `follows_follower_idx`
- `follows_target_idx`
- `follows_target_owner_idx`
- `follows_unique_target`

The unique index prevents the same user from following the same target twice.

## API

`GET /api/follow/status`

Query parameters:

- `targetType`
- `targetId`
- `viewerUid`
- `targetOwnerUid`

Returns:

```json
{
  "targetType": "store",
  "targetId": "usr_...",
  "followerCount": 12,
  "isFollowing": true,
  "canFollow": true
}
```

`POST /api/follow`

Creates a follow.

`DELETE /api/follow`

Deletes a follow using query parameters.

## UI

`FollowButton` is the shared UI component.

It supports:

- Normal visitor follow/unfollow.
- Follower count display.
- Login-required dialog.
- Follow confirmation dialog.
- Unfollow confirmation dialog.
- Owner or super-admin actions dialog.
- Follower-notification composer with title/body limits, audience count, real
  push/notification-center delivery, and delivered/unavailable results.

Example:

```tsx
<FollowButton
  targetType="store"
  targetId={sellerUid}
  targetOwnerUid={sellerUid}
  viewerUid={session?.uid}
  isOwner={session?.uid === sellerUid}
  isSuperAdmin={isSuperAdmin(session)}
  targetLabel="مقدم الخدمة"
/>
```

## Notifications

Follower broadcasts are live for store owners and super-admins:

```text
FollowButton composer
  -> followApiService.notifyFollowers
  -> POST /api/follow/notifications + signed session header
  -> FollowService verifies actor/ownership and reloads follower uids
  -> NotificationGrantCollector signs the exact audience and content
  -> browser notification bridge
  -> isolated notifications Vercel service
  -> Web Push / FCM and the local notification center
```

The audience is read on the server at send time; the browser never supplies the
follower list. The signed session must match the identity and the store owner,
unless the actor is the configured super-admin. Title and body are limited to
120 and 1,000 characters, request ids are validated, duplicate follower ids are
removed, and one actor may send at most three follower broadcasts per minute.

The UI does not claim that an issued grant was delivered. It awaits the browser
bridge and shows requested, actually delivered, and unavailable recipient
counts. A follower without a current notification token is reported as
unavailable. The notification links back to the store preview.

## Security Rules

- Guests can view follower counts.
- Guests cannot follow until they sign in.
- A user cannot follow their own target when `targetOwnerUid` matches `viewerUid`.
- Super-admin and owners see management actions instead of the normal follow/unfollow action.
- Notification sends require the signed session token in
  `x-asol-session-token`; an actor cannot target another owner's follower list.

## Future Extensions

- Add follower management pages.
- Add product and category follow buttons.
- Add follower analytics.
- Add privacy controls for hiding follower counts.
