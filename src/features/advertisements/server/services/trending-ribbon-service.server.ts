import "server-only";

import { isSuperAdminIdentity } from "@asol/auth-core/server";
import { trendingRibbonRepository } from "@asol/data-core/advertisements";
import { createTrendingRibbonService } from "@asol/trending-ribbon-core/server";

export const featuredTrendingRibbonService = createTrendingRibbonService({
  repository: trendingRibbonRepository,
  auth: { isSuperAdminIdentity },
});
