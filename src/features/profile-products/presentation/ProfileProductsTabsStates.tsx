import { Package } from "lucide-react";

import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";

export function ProfileProductsTabsLoading({ id, size = "lg" }: { size?: "sm" | "lg" } & { id?: string }) {
  return (
    <div id={id} className="flex justify-center py-8">
      <LoadingSpinner size={size} />
    </div>
  );
}

export function ProfileProductsTabsEmpty({ id,
  label,
  iconSize = "h-8 w-8",
  textSize = "text-sm",
}: {
  label: string;
  iconSize?: string;
  textSize?: string;
} & { id?: string }) {
  return (
    <div id={id} className="rounded-lg border border-dashed border-outline-variant py-8 text-center">
      <Package className={`mx-auto mb-2 ${iconSize} text-on-surface-variant`} />
      <p className={`${textSize} text-on-surface-variant`}>
        {label}
      </p>
    </div>
  );
}
