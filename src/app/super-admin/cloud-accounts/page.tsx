import { SuperAdminCloudAccountsPage } from "@/features/super-admin/presentation/SuperAdminCloudAccountsPage";

/** Always re-evaluate: account tables are derived from sealed package declarations. */
export const dynamic = "force-dynamic";

export default function Page() {
  return <SuperAdminCloudAccountsPage />;
}
