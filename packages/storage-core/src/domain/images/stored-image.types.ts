/** Client-side image reference after upload (UI display only). */
export interface StoredImage {
  imageKey: string;
  url: string;
  /** When omitted, readers treat the object as living on product-default. */
  storageProfileId?: string;
  isUploading?: boolean;
  error?: string;
}
