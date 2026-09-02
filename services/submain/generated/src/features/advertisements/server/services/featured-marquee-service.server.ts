import "server-only";

import { isSuperAdminIdentity } from "@asol/auth-core/server";
import { featuredMarqueeRepository } from "@asol/data-core/advertisements";
import { createFeaturedMarqueeService } from "@asol/featured-marquee-core/server";

export const featuredMarqueeService = createFeaturedMarqueeService({
  repository: featuredMarqueeRepository,
  auth: { isSuperAdminIdentity },
});
