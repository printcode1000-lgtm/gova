import {
  Camera,
  CameraDirection,
  CameraErrorCode,
  EncodingType,
  MediaTypeSelection,
  type MediaResult,
} from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';

const CANCELLED_ERROR_CODES = new Set<string>([
  CameraErrorCode.TakePhotoCancelled,
  CameraErrorCode.ChooseMediaCancelled,
]);

interface CameraPluginError extends Error {
  code?: string;
}

export function canUseNativeImageSource(): boolean {
  return Capacitor.isNativePlatform();
}

export async function captureSingleImage(): Promise<File | null> {
  if (!canUseNativeImageSource()) return null;

  try {
    const result = await Camera.takePhoto({
      cameraDirection: CameraDirection.Rear,
      correctOrientation: true,
      editable: 'no',
      encodingType: EncodingType.JPEG,
      includeMetadata: true,
      quality: 92,
      saveToGallery: false,
    });
    return mediaResultToFile(result, 'camera');
  } catch (error) {
    if (isCancelled(error)) return null;
    throw error;
  }
}

export async function chooseSingleImage(): Promise<File | null> {
  if (!canUseNativeImageSource()) return null;

  try {
    const { results } = await Camera.chooseFromGallery({
      allowMultipleSelection: false,
      correctOrientation: true,
      editable: 'no',
      includeMetadata: true,
      mediaType: MediaTypeSelection.Photo,
      quality: 100,
    });
    const result = results[0];
    return result ? mediaResultToFile(result, 'gallery') : null;
  } catch (error) {
    if (isCancelled(error)) return null;
    throw error;
  }
}

async function mediaResultToFile(result: MediaResult, source: 'camera' | 'gallery'): Promise<File> {
  const format = normalizeFormat(result.metadata?.format);
  const mimeType = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
  const base64 = await readFullImageBase64(result);
  const bytes = decodeBase64(base64);
  const extension = format === 'jpeg' ? 'jpg' : format;
  return new File([bytes], `${source}-${Date.now()}.${extension}`, { type: mimeType });
}

async function readFullImageBase64(result: MediaResult): Promise<string> {
  if (result.uri) {
    const file = await Filesystem.readFile({ path: result.uri });
    if (typeof file.data === 'string') return stripDataUrlPrefix(file.data);
    return blobToBase64(file.data);
  }

  if (result.thumbnail) return stripDataUrlPrefix(result.thumbnail);
  throw new Error('The selected image did not include readable image data.');
}

function decodeBase64(value: string): ArrayBuffer {
  const binary = atob(stripDataUrlPrefix(value));
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return buffer;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read the selected image.'));
    reader.onload = () => resolve(stripDataUrlPrefix(String(reader.result ?? '')));
    reader.readAsDataURL(blob);
  });
}

function stripDataUrlPrefix(value: string): string {
  const commaIndex = value.indexOf(',');
  return value.startsWith('data:') && commaIndex >= 0 ? value.slice(commaIndex + 1) : value;
}

function normalizeFormat(format?: string): string {
  const normalized = format?.toLowerCase().replace(/^image\//, '');
  if (normalized === 'jpeg' || normalized === 'jpg' || normalized === 'png' || normalized === 'webp') {
    return normalized;
  }
  return 'jpg';
}

function isCancelled(error: unknown): boolean {
  return error instanceof Error
    && typeof (error as CameraPluginError).code === 'string'
    && CANCELLED_ERROR_CODES.has((error as CameraPluginError).code as string);
}
