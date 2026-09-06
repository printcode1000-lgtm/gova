"use client";

import NextImage, { type ImageProps } from "next/image";
import {
  isRemoteStorageImageUrl,
  LOCAL_FIRST_IMAGE_PLACEHOLDER,
  useLocalFirstStorageImageSource,
} from "@asol/storage-image-manager-core/image-cache";

export default function LocalFirstImage(props: ImageProps) {
  const sourceUrl = typeof props.src === "string" ? props.src : null;
  const remote = isRemoteStorageImageUrl(sourceUrl);
  const cached = useLocalFirstStorageImageSource(sourceUrl);
  const resolvedSrc = remote ? cached.src ?? LOCAL_FIRST_IMAGE_PLACEHOLDER : props.src;

  return (
    <NextImage
      {...props}
      src={resolvedSrc}
      unoptimized={remote ? true : props.unoptimized}
    />
  );
}
