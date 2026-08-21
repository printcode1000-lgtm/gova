"use client";

import * as React from "react";
import type { StorageImageManagerHandle } from "@/features/storage/components/StorageImageManager";

export function useHeroSliderEditorUploadState({
  ref,
  onPendingChange,
}: {
  ref: React.ForwardedRef<StorageImageManagerHandle>;
  onPendingChange?: (pending: boolean) => void;
}) {
  const managerRefs = React.useRef<Array<StorageImageManagerHandle | null>>([]);
  const [pendingSlots, setPendingSlots] = React.useState<Set<number>>(
    () => new Set(),
  );

  React.useEffect(() => {
    onPendingChange?.(pendingSlots.size > 0);
  }, [onPendingChange, pendingSlots]);

  React.useImperativeHandle(
    ref,
    () => ({
      hasPending: () =>
        managerRefs.current.some((manager) => manager?.hasPending()),
      uploadPending: async () => {
        for (const manager of managerRefs.current) {
          if (manager?.hasPending() && !(await manager.uploadPending())) {
            return false;
          }
        }
        return true;
      },
    }),
    [],
  );

  return { managerRefs, setPendingSlots };
}
