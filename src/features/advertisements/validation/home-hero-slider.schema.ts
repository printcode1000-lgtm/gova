import { z } from "zod";

export const homeHeroSlideSchema = z.object({
  priority: z.number().int(),
  image: z.string().trim(),
  imageKey: z.string().trim().optional(),
  title: z.string().trim(),
  subtitle: z.string(),
  duration: z.number().int().min(1000).max(120_000),
  action: z.string(),
});

export const homeHeroConfigSchema = z.object({
  transition: z.enum(["Fade", "SlideLeft", "SlideRight", "Zoom", "Parallax"]),
  transitionDuration: z.number().int().min(100).max(3000),
  autoPlay: z.boolean(),
  loop: z.boolean(),
  slides: z.array(homeHeroSlideSchema).min(0).max(50),
});

export const homeHeroSeedSchema = z.object({
  schemaVersion: z.literal(1),
  config: homeHeroConfigSchema,
});
