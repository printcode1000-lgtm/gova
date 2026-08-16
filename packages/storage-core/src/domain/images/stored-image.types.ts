/** Client-side image reference after upload (UI display only). */
export interface StoredImage {
  imageKey: string;
  url: string;
  isUploading?: boolean;
  error?: string;
}
