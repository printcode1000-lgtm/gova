import type { ReducedMotionPreference } from './types';

export function resolveReducedMotion(
  preference: ReducedMotionPreference,
  systemPrefersReduced = false,
): boolean {
  if (preference === 'on') return true;
  if (preference === 'off') return false;
  return systemPrefersReduced;
}

export function readSystemPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
