export interface StorageImageDownloadRequest {
  url: string;
  etag?: string;
}

export type StorageImageDownloadResult =
  | {
      status: 'ok';
      blob: Blob;
      etag?: string;
    }
  | {
      status: 'not-modified';
      etag?: string;
    };

export interface StorageImageManagerCorePorts {
  downloadImage: (request: StorageImageDownloadRequest) => Promise<StorageImageDownloadResult>;
}

let ports: StorageImageManagerCorePorts | null = null;

export function configureStorageImageManagerCore(next: StorageImageManagerCorePorts): void {
  ports = next;
}

export async function downloadStorageImage(
  request: StorageImageDownloadRequest,
): Promise<StorageImageDownloadResult> {
  if (!ports) throw new Error('StorageImageManagerCore browser ports are not configured');
  return ports.downloadImage(request);
}
