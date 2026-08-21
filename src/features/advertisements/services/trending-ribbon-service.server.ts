import "server-only";

import { isSuperAdminIdentity } from "@/features/auth/utils/super-admin";
import { trendingRibbonRepository } from "@asol/data-core/advertisements";
import { createTrendingRibbonService } from "@asol/trending-ribbon-core/server";

export const featuredTrendingRibbonService = createTrendingRibbonService({
  repository: trendingRibbonRepository,
  auth: { isSuperAdminIdentity },
});
