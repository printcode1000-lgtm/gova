# App Sidebar Navigation

Source: `src/components/layouts/AppSidebar.tsx`
Props contract: `src/components/layouts/app-sidebar/AppSidebar.sidebar-model.tsx`
Super Admin section: `src/components/layouts/app-sidebar/AppSidebarSuperAdminSection.tsx`

## Card surfaces

Every collapsible block in the sidebar (profile card, super admin section, settings)
uses the same shell: `asol-control`, `rounded-2xl`, a single hairline border
(`border-outline-variant/20`, `/30` in dark) and the sidebar surface color.
Shadows are not used anywhere in the sidebar; depth comes from the border only.
Collapsible shells add `overflow-hidden` and their header button renders with
`rounded-none` so the header fills the card edge to edge.

The sidebar body is a flex column with `overflow-y-auto`; it applies
`[&>*]:shrink-0` so a card that grows (super admin, settings) never squeezes the
cards above it. Growth is absorbed by scrolling, not by shrinking siblings.

## Super admin section

- Visible only when `isSuperAdmin(session)` is true.
- The section shell matches the settings card exactly (same border, radius, no shadow).
- Opening the section always resets every inner group to the collapsed state
  (`COLLAPSED_SUPER_ADMIN_GROUPS`); no group is expanded by default.
- A destination that is the only entry of its topic is rendered as a direct link
  card instead of a collapsible group, styled with the same header class
  (`groupButtonClass`) so it sits flush with the collapsible cards around it.
  No such entry exists today — `حسابات التخزين السحابي` was one until it moved
  to `/dev/cloud-accounts`; the pattern stays documented for the next one.
- Navigating to any `/super-admin/*` route expands the section itself and keeps
  all groups collapsed — the route no longer auto-expands a matching group.
- The expanded panel stays in normal document flow: it grows inside the card and
  pushes the entries below it down. It is never sticky, never positioned, and never
  overlays the entries above it; the scroll area handles any overflow.

### Entry labels

Labels are literal Arabic strings in the component (not i18n keys) and are named
after the role each destination performs.

| Group | Entry | Route |
| --- | --- | --- |
| واجهة المتجر والعروض | سلايدر الواجهة الرئيسية | `/super-admin/hero-slider` |
| واجهة المتجر والعروض | شريط المنتجات المميزة | `/super-admin/featured-marquee` |
| واجهة المتجر والعروض | الشريط الإخباري المتحرك | `/super-admin/trending-ribbon` |
| الإشعارات والبث | بث إشعار لكل المستخدمين | `/super-admin/notifications-broadcast` |
| النظام وحسابات المستخدمين | سجل أحداث النظام | `/super-admin/logs` |
| النظام وحسابات المستخدمين | إدارة حسابات المستخدمين | `/super-admin/users` |

Development-only surfaces are deliberately absent. `/dev/cloud-accounts` and
`/dev/notification-tests` moved out of `/super-admin` so they stay out of the
mobile bundle, `out/`, and production — see
[super-admin-cloud-accounts.md](../06-super-admin-and-operations/super-admin-cloud-accounts.md).

The section trigger itself is labeled `لوحة تحكم السوبر أدمن`. Its header button
uses the same `sidebarControlClass` stack as the settings card (icon, label, and
chevron inherit `sidebarTone` from the outer shell).

### Inner container surfaces

When the section is expanded, each inner wrapper (`SuperAdminGroup` shell or the
direct-link card for cloud accounts) gets a distinct background so the four blocks
read as separate cards inside the shared outer shell. Borders stay a single hairline
(`border-outline-variant/25` in light, `/35` in dark) on `rounded-xl` shells;
depth comes from surface tint, not shadow.

| Inner block | Background token |
| --- | --- |
| واجهة المتجر والعروض | `bg-surface-container-low` |
| الإشعارات والبث | `bg-secondary-container/20` |
| النظام وحسابات المستخدمين | `bg-tertiary-container/15` |

`SuperAdminGroup` accepts a `shellClass` prop (base border/radius plus one of the
tokens above). Interactive rows inside still use `sidebarPressSurface` on buttons
and links so `:active` feedback remains visible on each tinted surface. Tokens
resolve through the theme (`src/theme/tokens.css`) so light and dark schemes stay
harmonious without per-scheme class branches in the component.

## Guardrails

`/dev` tools (data health, dev cloud backup, catalog studio) must never be linked
from this component; `npm run test:release-commands` and `npm run test:catalog-studio`
assert their absence from the sidebar source.
