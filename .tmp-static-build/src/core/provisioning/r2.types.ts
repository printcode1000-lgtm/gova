export type R2CorsMethod = 'GET' | 'PUT' | 'POST' | 'DELETE' | 'HEAD';

export interface R2CorsRule {
  allowed: {
    origins: string[];
    methods: R2CorsMethod[];
    headers?: string[];
  };
  exposeHeaders?: string[];
  maxAgeSeconds?: number;
  id?: string;
}

export interface R2CorsPolicy {
  rules: R2CorsRule[];
}

export interface R2ObjectRef {
  key: string;
  bucket?: string;
}

export interface R2UploadResult {
  key: string;
  etag?: string;
  publicUrl: string;
}

export interface R2ListResult {
  keys: string[];
  isTruncated: boolean;
}
