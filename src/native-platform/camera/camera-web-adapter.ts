/**
 * Browser camera adapter.
 *
 * Single responsibility: obtain images through a hidden file input and shape
 * them into `CameraImage`. `capture="environment"` asks mobile browsers for
 * the camera; desktop browsers fall back to the normal file dialog.
 */

import { detectImageFormat } from "../core/binary";
import { NativePlatformError } from "../core/errors";
import { hasDom } from "../core/platform";
import type {
  CameraImage,
  CapturePhotoOptions,
  PickImageOptions,
} from "./types";

const MODULE = "Camera";

interface FileInputOptions {
  multiple: boolean;
  capture?: "user" | "environment";
}

/**
 * Open a transient file input and resolve with the chosen files.
 * Resolves empty when the user dismisses the dialog.
 */
function openFileInput(options: FileInputOptions): Promise<File[]> {
  if (!hasDom()) {
    return Promise.reject(NativePlatformError.unavailable(MODULE));
  }

  return new Promise<File[]>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = options.multiple;
    if (options.capture) input.capture = options.capture;
    input.style.display = "none";

    let settled = false;
    const settle = (files: File[]) => {
      if (settled) return;
      settled = true;
      input.remove();
      window.removeEventListener("focus", onFocus);
      resolve(files);
    };

    // There is no cancel event on file inputs; regaining window focus without
    // a selection is the only reliable signal that the dialog was dismissed.
    const onFocus = () => {
      window.setTimeout(() => {
        if (!settled && (input.files?.length ?? 0) === 0) settle([]);
      }, 400);
    };

    input.addEventListener("change", () => settle([...(input.files ?? [])]));
    input.addEventListener("cancel", () => settle([]));
    window.addEventListener("focus", onFocus);

    document.body.appendChild(input);
    input.click();
  });
}

async function toCameraImage(
  file: File,
  source: "camera" | "gallery",
): Promise<CameraImage> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectImageFormat(bytes);
  const format = detected ?? (file.type.split("/")[1] || "bin");
  return {
    file,
    source,
    format,
    mimeType: file.type || "application/octet-stream",
    byteSize: file.size,
  };
}

export async function webCapturePhoto(
  options: CapturePhotoOptions,
): Promise<CameraImage> {
  const files = await openFileInput({
    multiple: false,
    capture: options.direction === "front" ? "user" : "environment",
  });
  const file = files[0];
  if (!file) throw NativePlatformError.cancelled(MODULE);
  return toCameraImage(file, "camera");
}

export async function webPickImages(
  options: PickImageOptions,
): Promise<CameraImage[]> {
  const files = await openFileInput({ multiple: options.multiple ?? false });
  if (files.length === 0) throw NativePlatformError.cancelled(MODULE);
  const limited = options.limit ? files.slice(0, options.limit) : files;
  return Promise.all(limited.map((file) => toCameraImage(file, "gallery")));
}
