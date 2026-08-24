export interface QrCodePngOptions {
  value: string;
  fileName: string;
  width?: number;
  margin?: number;
  foreground?: string;
  background?: string;
}

export interface QrCodePngArtifact {
  blob: Blob;
  fileName: string;
  mimeType: "image/png";
}
