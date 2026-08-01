/**
 * Camera module contract.
 *
 * Single responsibility: describe camera inputs and the normalized output.
 * Callers receive a browser `File` on every platform.
 */

export const CameraDirections = {
  Rear: "rear",
  Front: "front",
} as const;

export type CameraDirection =
  (typeof CameraDirections)[keyof typeof CameraDirections];

export const ImageQualityPresets = {
  /** Smallest payload — previews and avatars. */
  Low: "low",
  /** Balanced default. */
  Medium: "medium",
  /** Maximum fidelity the device offers. */
  High: "high",
} as const;

export type ImageQualityPreset =
  (typeof ImageQualityPresets)[keyof typeof ImageQualityPresets];

export interface CapturePhotoOptions {
  direction?: CameraDirection;
  quality?: ImageQualityPreset;
  /** Fix rotation from the device orientation sensor. Default `true`. */
  correctOrientation?: boolean;
  /** Persist the capture to the device gallery. Default `false`. */
  saveToGallery?: boolean;
}

export interface PickImageOptions {
  quality?: ImageQualityPreset;
  correctOrientation?: boolean;
  /** Allow more than one selection. Default `false`. */
  multiple?: boolean;
  /** Upper bound when `multiple` is true. */
  limit?: number;
}

/** Normalized camera output — identical shape on web, Android, and iOS. */
export interface CameraImage {
  file: File;
  /** Where the image came from. */
  source: "camera" | "gallery";
  /** Container detected from the actual bytes, not the reported format. */
  format: string;
  mimeType: string;
  byteSize: number;
}

export const QUALITY_VALUES: Record<ImageQualityPreset, number> = {
  low: 60,
  medium: 85,
  high: 100,
};
