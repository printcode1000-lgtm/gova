export type CameraDirection = "front" | "rear";
export type CameraQuality = "low" | "medium" | "high";

export interface PhotoOptions {
  direction?: CameraDirection;
  quality?: CameraQuality | number;
  correctOrientation?: boolean;
  saveToGallery?: boolean;
  allowEditing?: boolean;
}

export interface PickImagesOptions {
  quality?: CameraQuality | number;
  limit?: number;
  correctOrientation?: boolean;
}

export interface CameraImage {
  file: File;
  format: string;
  width?: number;
  height?: number;
  webPath?: string;
}

export interface PickedCameraImages {
  images: readonly CameraImage[];
}
