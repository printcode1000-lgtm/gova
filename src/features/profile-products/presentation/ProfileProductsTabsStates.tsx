import { Package } from "lucide-react";

import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";

export function ProfileProductsTabsLoading({ size = "lg" }: { size?: "sm" | "lg" }) {
  return (
    <div className="flex justify-center py-8">
      <LoadingSpinner size={size} />
    </div>
  );
}

export function ProfileProductsTabsEmpty({
  label,
  iconSize = "h-8 w-8",
  textSize = "text-sm",
}: {
  label: string;
  iconSize?: string;
  textSize?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-outline-variant py-8 text-center">
      <Package className={`mx-auto mb-2 ${iconSize} text-on-surface-variant`} />
      <p className={`${textSize} text-on-surface-variant`}>
        {label}
      </p>
    </div>
  );
}
