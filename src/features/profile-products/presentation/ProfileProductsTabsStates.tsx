import { Package } from "lucide-react";

import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { uiAttributes } from "@asol/ui-registry-core";

export function ProfileProductsTabsLoading({ id, size = "lg" }: { size?: "sm" | "lg" } & { id?: string }) {
  return (
    <div {...uiAttributes({ uid: "profile-products.profile-products-tabs-states.div-31MnZZ", id: "profile-products.profile-products-tabs-states.div" })} id={id} className="flex justify-center py-8">
      <LoadingSpinner ui={{ uid: "profile-products.profile-products-tabs-states.loading-spinner-5U5Fr8", id: "profile-products.profile-products-tabs-states.loading-spinner" }} size={size} />
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
    <div {...uiAttributes({ uid: "profile-products.profile-products-tabs-states.div.2-9oFXTk", id: "profile-products.profile-products-tabs-states.div.2" })} id={id} className="rounded-lg border border-dashed border-outline-variant py-8 text-center">
      <Package className={`mx-auto mb-2 ${iconSize} text-on-surface-variant`} />
      <p {...uiAttributes({ uid: "profile-products.profile-products-tabs-states.p-e9RT94", id: "profile-products.profile-products-tabs-states.p" })} className={`${textSize} text-on-surface-variant`}>
        {label}
      </p>
    </div>
  );
}
