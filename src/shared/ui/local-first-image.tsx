"use client";

import { useEffect, useRef, useState } from "react";
import NextImage, { type ImageProps } from "next/image";

type LocalFirstImageProps = ImageProps & {
  onSourceUnavailable?: () => void;
};
import {
  invalidateLocalFirstStorageImage,
  isRemoteStorageImageUrl,
  LOCAL_FIRST_IMAGE_PLACEHOLDER,
  shouldRetryFailedLocalFirstImage,
  useLocalFirstStorageImageSource,
} from "@asol/storage-image-manager-core/image-cache";

export default function LocalFirstImage({
  onSourceUnavailable,
  ...props
}: LocalFirstImageProps) {
  const sourceUrl = typeof props.src === "string" ? props.src : null;
  const remote = isRemoteStorageImageUrl(sourceUrl);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const retryStartedRef = useRef(false);
  const unavailableReportedRef = useRef<string | null>(null);
  const cached = useLocalFirstStorageImageSource(sourceUrl, {
    refreshToken: retryAttempt,
  });
  const resolvedSrc = remote ? cached.src ?? LOCAL_FIRST_IMAGE_PLACEHOLDER : props.src;

  useEffect(() => {
    retryStartedRef.current = false;
    unavailableReportedRef.current = null;
    setRetryAttempt(0);
  }, [sourceUrl]);

  useEffect(() => {
    if (!sourceUrl || !remote || cached.isResolving || cached.cacheSource !== "fallback") {
      return;
    }
    const signature = `${sourceUrl}:${retryAttempt}`;
    if (unavailableReportedRef.current === signature) return;
    unavailableReportedRef.current = signature;
    onSourceUnavailable?.();
  }, [cached.cacheSource, cached.isResolving, onSourceUnavailable, remote, retryAttempt, sourceUrl]);

  return (
    <NextImage
      {...props}
      src={resolvedSrc}
      unoptimized={remote ? true : props.unoptimized}
      onLoad={(event) => {
        if (remote && (cached.isResolving || resolvedSrc === LOCAL_FIRST_IMAGE_PLACEHOLDER)) {
          return;
        }
        props.onLoad?.(event);
      }}
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
