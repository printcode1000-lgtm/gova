import "server-only";

import { imageStorageOrchestrator } from "@asol/storage-core/server";
import { isSuperAdminIdentity } from "@asol/auth-core/server";
import { homeHeroSliderRepository } from "@asol/data-core/advertisements";
import { createHomeHeroSliderService } from "@asol/hero-slider-core/server";

export const homeHeroSliderService = createHomeHeroSliderService({
  repository: homeHeroSliderRepository,
  imageStorage: imageStorageOrchestrator,
  auth: { isSuperAdminIdentity },
});
