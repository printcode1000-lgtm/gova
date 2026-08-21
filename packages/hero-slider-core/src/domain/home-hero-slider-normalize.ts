import {
  DEFAULT_HOME_HERO_TRANSITION,
  DEFAULT_HOME_HERO_TRANSITION_DURATION,
  HOME_HERO_TRANSITIONS,
  type HomeHeroConfig,
  type HomeHeroSlide,
  type HomeHeroTransition,
} from "./hero-slider.entity";
import { homeHeroConfigSchema } from "./hero-slider.schema";

function isHomeHeroTransition(value: unknown): value is HomeHeroTransition {
  return (
    typeof value === "string" &&
    (HOME_HERO_TRANSITIONS as readonly string[]).includes(value)
  );
}

function coerceSlide(
  raw: unknown,
  legacyTransition: HomeHeroTransition,
  legacyTransitionDuration: number,
): HomeHeroSlide | null {
  if (!raw || typeof raw !== "object") return null;
  const slide = raw as Record<string, unknown>;
  const transition = isHomeHeroTransition(slide.transition)
    ? slide.transition
    : legacyTransition;
  const transitionDuration =
    typeof slide.transitionDuration === "number"
      ? slide.transitionDuration
      : legacyTransitionDuration;

  return {
    priority: Number(slide.priority ?? 0),
    image: String(slide.image ?? ""),
    imageKey:
      typeof slide.imageKey === "string" ? slide.imageKey : undefined,
    title: String(slide.title ?? ""),
    subtitle: String(slide.subtitle ?? ""),
    duration: Number(slide.duration ?? 4000),
    transition,
    transitionDuration,
    action: String(slide.action ?? ""),
  };
}

/** Upgrades legacy global transition fields to per-slide transition config. */
export function normalizeHomeHeroConfig(raw: unknown): HomeHeroConfig {
  const parsed = homeHeroConfigSchema.safeParse(raw);
  if (parsed.success) return parsed.data;

  const input =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const legacyTransition = isHomeHeroTransition(input.transition)
    ? input.transition
    : DEFAULT_HOME_HERO_TRANSITION;
  const legacyTransitionDuration =
    typeof input.transitionDuration === "number"
      ? input.transitionDuration
      : DEFAULT_HOME_HERO_TRANSITION_DURATION;
  const rawSlides = Array.isArray(input.slides) ? input.slides : [];

  const migrated: HomeHeroConfig = {
    autoPlay: Boolean(input.autoPlay),
    loop: Boolean(input.loop),
    slides: rawSlides
      .map((slide) =>
        coerceSlide(slide, legacyTransition, legacyTransitionDuration),
      )
      .filter((slide): slide is HomeHeroSlide => slide !== null),
  };

  return homeHeroConfigSchema.parse(migrated);
}
