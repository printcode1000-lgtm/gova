/**
 * Location module contract.
 *
 * Single responsibility: describe location inputs and the normalized fix.
 * Background/continuous-in-background tracking is deliberately absent.
 */

export const LocationAccuracies = {
  /** Network/coarse positioning — fastest, lowest battery. */
  Low: "low",
  /** Balanced. */
  Balanced: "balanced",
  /** Full GPS precision. */
  High: "high",
} as const;

export type LocationAccuracy =
  (typeof LocationAccuracies)[keyof typeof LocationAccuracies];

export interface LocationOptions {
  accuracy?: LocationAccuracy;
  /** Abort after this many milliseconds. Default 15000. */
  timeout?: number;
  /** Accept a cached fix younger than this. Default 0 (always fresh). */
  maximumAge?: number;
}

/** Normalized position — identical on every platform. */
export interface LocationFix {
  latitude: number;
  longitude: number;
  /** Horizontal accuracy in metres, when the device reports it. */
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  /** Epoch milliseconds. */
  timestamp: number;
}

export interface WatchHandle {
  /** Stop this watch. Safe to call more than once. */
  stop: () => Promise<void>;
}

export type LocationListener = (fix: LocationFix) => void;
export type LocationErrorListener = (error: unknown) => void;

export const ACCURACY_REQUIRES_HIGH: Record<LocationAccuracy, boolean> = {
  low: false,
  balanced: false,
  high: true,
};

export const DEFAULT_TIMEOUT_MS = 15_000;
