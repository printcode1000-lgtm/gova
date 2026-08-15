import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { cameraAdapter } from "../adapters/camera.adapter";
import type { CameraImage, PhotoOptions, PickImagesOptions } from "../domain/camera/types";
import { photoOptionsSchema, pickImagesOptionsSchema } from "../validation/camera.schema";
import { parseInput } from "../validation/helpers";

const MODULE = "Camera";

export const cameraApi = {
  async takePhoto(options?: PhotoOptions): Promise<Result<CameraImage, NativeCoreError>> {
    const valid = parseInput(photoOptionsSchema, options, MODULE);
    if (!valid.ok) return valid;

    try {
      const image = await cameraAdapter.takePhoto(valid.value);
      return ok(image);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async pickImages(options?: PickImagesOptions): Promise<Result<CameraImage[], NativeCoreError>> {
    const valid = parseInput(pickImagesOptionsSchema, options, MODULE);
    if (!valid.ok) return valid;

    try {
      const images = await cameraAdapter.pickImages(valid.value);
      return ok(images);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
