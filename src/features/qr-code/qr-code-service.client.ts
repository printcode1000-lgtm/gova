"use client";

import QRCode from "qrcode";

import { nativePlatform } from "@/native-platform";
import type { QrCodePngArtifact, QrCodePngOptions } from "./types";

const PNG_MIME = "image/png" as const;

function pngDataUrlToBlob(dataUrl: string): Blob {
  const prefix = `data:${PNG_MIME};base64,`;
  if (!dataUrl.startsWith(prefix)) throw new Error("qrCodeGenerationFailed");
  const binary = atob(dataUrl.slice(prefix.length));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: PNG_MIME });
}

function normalizedOptions(options: QrCodePngOptions) {
  const value = options.value.trim();
  if (!value || value.length > 4096) throw new Error("qrCodeValueInvalid");

  const baseName = options.fileName
    .trim()
    .replace(/\.png$/i, "")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const width = Math.min(2048, Math.max(256, options.width ?? 1024));
  const margin = Math.min(16, Math.max(0, options.margin ?? 4));

  return {
    value,
    fileName: `${baseName || "asol-qr-code"}.png`,
    width,
    margin,
    foreground: options.foreground ?? "#111827",
    background: options.background ?? "#ffffff",
  };
}

export async function createQrCodePng(
  options: QrCodePngOptions,
): Promise<QrCodePngArtifact> {
  const normalized = normalizedOptions(options);
  const dataUrl = await QRCode.toDataURL(normalized.value, {
    type: PNG_MIME,
    width: normalized.width,
    margin: normalized.margin,
    errorCorrectionLevel: "H",
    color: {
      dark: normalized.foreground,
      light: normalized.background,
    },
  });
  const blob = pngDataUrlToBlob(dataUrl);
  if (blob.type !== PNG_MIME || blob.size === 0) {
    throw new Error("qrCodeGenerationFailed");
  }
  return { blob, fileName: normalized.fileName, mimeType: PNG_MIME };
}

export async function saveQrCodePng(
  options: QrCodePngOptions,
): Promise<QrCodePngArtifact> {
  const artifact = await createQrCodePng(options);
  await nativePlatform.files.user.saveToDevice(artifact.blob, {
    fileName: artifact.fileName,
    mimeType: artifact.mimeType,
  });
  return artifact;
}
