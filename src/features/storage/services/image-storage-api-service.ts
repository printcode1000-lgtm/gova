import { govaApi, GOVA_API_ROUTES } from '@/core/api';
import type {
  ImageUploadResult,
  StorageProfileClientView,
} from '@/core/storage/types/storage-profile.types';
import type { IImageStorageApiAdapter } from './image-storage-api-service.interface';

/** HTTP adapter — talks to Business API only. */
export class ImageStorageApiService implements IImageStorageApiAdapter {
  async getProfile(storageProfileId: string): Promise<StorageProfileClientView> {
    const route = GOVA_API_ROUTES.storage.profile(storageProfileId);
    return govaApi.get<StorageProfileClientView>(route);
  }

  async uploadImage(
    storageProfileId: string,
    file: Blob,
    replaceImageKey?: string | null
  ): Promise<ImageUploadResult> {
    const formData = new FormData();
    formData.append('file', file, 'image.webp');
    formData.append('storageProfileId', storageProfileId);
    if (replaceImageKey) {
      formData.append('replaceImageKey', replaceImageKey);
    }
    return govaApi.postForm<ImageUploadResult>(GOVA_API_ROUTES.storage.upload, formData);
  }

  async deleteImage(storageProfileId: string, imageKey: string): Promise<void> {
    const route = GOVA_API_ROUTES.storage.deleteImage(imageKey);
    await govaApi.delete<void>(`${route}?storageProfileId=${encodeURIComponent(storageProfileId)}`);
  }
}

export const imageStorageApiService = new ImageStorageApiService();
