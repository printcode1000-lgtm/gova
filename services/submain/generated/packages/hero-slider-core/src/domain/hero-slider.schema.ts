import { z } from "zod";

import { HOME_HERO_TRANSITIONS } from "./hero-slider.entity";

export const homeHeroTransitionSchema = z.enum(HOME_HERO_TRANSITIONS);

export const homeHeroSlideSchema = z.object({
  id: z.string().trim().min(1).optional(),
  priority: z.number().int(),
  image: z.string().trim(),
  imageKey: z.string().trim().optional(),
  title: z.string().trim(),
  subtitle: z.string(),
  duration: z.number().int().min(1000).max(120_000),
  transition: homeHeroTransitionSchema,
  transitionDuration: z.number().int().min(0).max(3000),
  action: z.string(),
});

export const homeHeroConfigSchema = z.object({
  autoPlay: z.boolean(),
  loop: z.boolean(),
  slides: z.array(homeHeroSlideSchema).min(0).max(50),
});

export const homeHeroSeedSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  config: z.unknown(),
});
