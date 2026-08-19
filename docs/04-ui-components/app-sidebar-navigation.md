# App Sidebar Navigation

Source: `src/components/layouts/AppSidebar.tsx`
Props contract: `src/components/layouts/app-sidebar/AppSidebar.sidebar-model.tsx`

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
  `حسابات التخزين السحابي` is such an entry; it has no group toggle and no key in
  `COLLAPSED_SUPER_ADMIN_GROUPS`.
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
| — (direct entry, no group) | حسابات التخزين السحابي | `/super-admin/cloud-accounts` |

See [super-admin-cloud-accounts.md](../06-super-admin-and-operations/super-admin-cloud-accounts.md).
| الإشعارات والبث | اختبار إرسال الإشعارات | `/super-admin/notification-tests` |
| الإشعارات والبث | بث إشعار لكل المستخدمين | `/super-admin/notifications-broadcast` |
| النظام وحسابات المستخدمين | سجل أحداث النظام | `/super-admin/logs` |
| النظام وحسابات المستخدمين | إدارة حسابات المستخدمين | `/super-admin/users` |

The section trigger itself is labeled `لوحة تحكم السوبر أدمن`.

## Guardrails

`/dev` tools (data health, dev cloud backup, catalog studio) must never be linked
from this component; `npm run test:release-commands` and `npm run test:catalog-studio`
assert their absence from the sidebar source.
