import { SuperAdminCloudAccountsPage } from "@/features/super-admin/presentation/SuperAdminCloudAccountsPage";

/**
 * Deliberately not `force-dynamic`.
 *
 * The account tables are derived from `@asol/account-declarations` and
 * `@asol/storage-core` — compile-time constants, not request-time data — so
 * per-request rendering buys nothing, and the page cannot drift from the
 * repository without a rebuild that re-derives it.
 *
 * It also cannot be dynamic: this route is part of `output: "export"`, and
 * `build:static` fails outright on a force-dynamic page.
 */
export default function Page() {
  return <SuperAdminCloudAccountsPage />;
}
