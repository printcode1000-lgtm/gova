"use client";

import * as React from "react";
import {
  LOCAL_FIRST_IMAGE_PLACEHOLDER,
  isRemoteStorageImageUrl,
  resolveLocalFirstStorageImage,
  type StorageImageCacheSource,
} from "../services/local-first-image-cache";

export interface LocalFirstStorageImageSource {
  src: string | null;
  isResolving: boolean;
  cacheSource: StorageImageCacheSource;
}

export function useLocalFirstStorageImageSource(
  sourceUrl: string | null | undefined,
  options: { cacheKey?: string; maxAgeMs?: number; refreshToken?: number } = {},
): LocalFirstStorageImageSource {
  const remote = isRemoteStorageImageUrl(sourceUrl);
  const [state, setState] = React.useState<LocalFirstStorageImageSource>(() => ({
    src: remote ? LOCAL_FIRST_IMAGE_PLACEHOLDER : sourceUrl ?? null,
    isResolving: remote,
    cacheSource: "local",
  }));

  React.useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    if (!sourceUrl || !isRemoteStorageImageUrl(sourceUrl)) {
      setState({ src: sourceUrl ?? null, isResolving: false, cacheSource: "local" });
      return () => {};
    }

    setState({
      src: LOCAL_FIRST_IMAGE_PLACEHOLDER,
      isResolving: true,
      cacheSource: "local",
    });
    void resolveLocalFirstStorageImage(sourceUrl, {
      ...(options.cacheKey ? { cacheKey: options.cacheKey } : {}),
      ...(options.maxAgeMs !== undefined ? { maxAgeMs: options.maxAgeMs } : {}),
    }).then((result) => {
      if (!active) return;
      if (result.blob) {
        objectUrl = URL.createObjectURL(result.blob);
        setState({ src: objectUrl, isResolving: false, cacheSource: result.source });
      } else {
        setState({
          src: result.fallbackUrl ?? LOCAL_FIRST_IMAGE_PLACEHOLDER,
          isResolving: false,
          cacheSource: result.source,
        });
      }
    }).catch(() => {
      if (!active) return;
      setState({
        src: LOCAL_FIRST_IMAGE_PLACEHOLDER,
        isResolving: false,
        cacheSource: "fallback",
      });
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sourceUrl, options.cacheKey, options.maxAgeMs, options.refreshToken]);

  return state;
}
