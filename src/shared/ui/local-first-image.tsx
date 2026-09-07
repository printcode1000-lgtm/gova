"use client";

import { useEffect, useRef, useState } from "react";
import NextImage, { type ImageProps } from "next/image";
import {
  invalidateLocalFirstStorageImage,
  isRemoteStorageImageUrl,
  LOCAL_FIRST_IMAGE_PLACEHOLDER,
  shouldRetryFailedLocalFirstImage,
  useLocalFirstStorageImageSource,
} from "@asol/storage-image-manager-core/image-cache";

export default function LocalFirstImage(props: ImageProps) {
  const sourceUrl = typeof props.src === "string" ? props.src : null;
  const remote = isRemoteStorageImageUrl(sourceUrl);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const retryStartedRef = useRef(false);
  const cached = useLocalFirstStorageImageSource(sourceUrl, {
    refreshToken: retryAttempt,
  });
  const resolvedSrc = remote ? cached.src ?? LOCAL_FIRST_IMAGE_PLACEHOLDER : props.src;

  useEffect(() => {
    retryStartedRef.current = false;
    setRetryAttempt(0);
  }, [sourceUrl]);

  return (
    <NextImage
      {...props}
      src={resolvedSrc}
      unoptimized={remote ? true : props.unoptimized}
      onError={(event) => {
        if (
          sourceUrl &&
          !retryStartedRef.current &&
          shouldRetryFailedLocalFirstImage({
            remote,
            isResolving: cached.isResolving,
            cacheSource: cached.cacheSource,
            retryAttempt,
          })
        ) {
          retryStartedRef.current = true;
          void invalidateLocalFirstStorageImage(sourceUrl)
            .then(() => setRetryAttempt(1))
            .catch(() => {
              retryStartedRef.current = false;
              props.onError?.(event);
            });
          return;
        }
        props.onError?.(event);
      }}
    />
  );
}
