"use client";

import * as React from "react";
import {
  StorageImageManager as CoreStorageImageManager,
  parseStorageImageManagerConfig,
  type StorageImageManagerConfig,
  type StorageImageManagerHandle,
  type StorageImageManagerProps as CoreStorageImageManagerProps,
} from "@asol/storage-image-manager-core";
import { useSession } from "@/features/auth/ui";
import { useTranslation } from "@/shared/i18n";
import "@/features/storage/application/services/image-storage-service";

export { parseStorageImageManagerConfig };
export type { StorageImageManagerConfig, StorageImageManagerHandle };

export type StorageImageManagerProps = Omit<
  CoreStorageImageManagerProps,
  "draftOwnerId" | "translate"
>;

export const StorageImageManager = React.forwardRef<
  StorageImageManagerHandle,
  StorageImageManagerProps
>(function StorageImageManager(props, ref) {
  const { t } = useTranslation();
  const { session, isLoading: isSessionLoading } = useSession();
  const draftOwnerId = isSessionLoading ? null : (session?.uid ?? "guest");

  return (
    <CoreStorageImageManager
      ref={ref}
      {...props}
      draftOwnerId={draftOwnerId}
      translate={t}
    />
  );
});
