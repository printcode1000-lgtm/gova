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
- `src/core/database/profile/profile.schema.ts`
- `src/core/database/profile/migrations/0009_follows.sql`

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
- Disabled "Send notification to followers" action marked as coming soon.

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

The system is prepared for follower notifications, but it does not send follower notifications yet.

`FollowService.listFollowerUids(targetType, targetId)` returns the follower uid audience. Future notification flows should pass that audience into the Notification System rather than coupling UI code directly to notification providers.

The current profile owner/super-admin action list shows "Send notification to followers" as a disabled future action through a dialog message.

## Security Rules

- Guests can view follower counts.
- Guests cannot follow until they sign in.
- A user cannot follow their own target when `targetOwnerUid` matches `viewerUid`.
- Super-admin and owners see management actions instead of the normal follow/unfollow action.

## Future Extensions

- Enable follower notification sending through `src/features/notifications`.
- Add follower management pages.
- Add product and category follow buttons.
- Add follower analytics.
- Add privacy controls for hiding follower counts.
