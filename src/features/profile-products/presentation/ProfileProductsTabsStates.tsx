import { Package } from "lucide-react";

import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { createOpaqueUiInstanceId, uiAttributes, type UiInstanceId } from "@asol/ui-registry-core";

export function ProfileProductsTabsLoading({ id, size = "lg", instance }: { size?: "sm" | "lg"; instance?: UiInstanceId } & { id?: string }) {
  const resolvedInstance = id ? createOpaqueUiInstanceId("tabs-loading", id) : (instance ?? createOpaqueUiInstanceId("tabs-loading", size));
  return (
    <div {...uiAttributes({ uid: "profile-products.profile-products-tabs-states.div-31MnZZ", id: "profile-products.profile-products-tabs-states.div", instance: resolvedInstance })} id={id} className="flex justify-center py-8">
      <LoadingSpinner ui={{ uid: "profile-products.profile-products-tabs-states.loading-spinner-5U5Fr8", id: "profile-products.profile-products-tabs-states.loading-spinner", instance: resolvedInstance }} size={size} />
    </div>
  );
}

export function ProfileProductsTabsEmpty({ id,
  label,
  iconSize = "h-8 w-8",
  textSize = "text-sm",
  instance,
}: {
  label: string;
  iconSize?: string;
  textSize?: string;
  instance?: UiInstanceId;
} & { id?: string }) {
  const resolvedInstance = id ? createOpaqueUiInstanceId("tabs-empty", id) : (instance ?? createOpaqueUiInstanceId("tabs-empty", textSize));
  return (
    <div {...uiAttributes({ uid: "profile-products.profile-products-tabs-states.div.2-9oFXTk", id: "profile-products.profile-products-tabs-states.div.2", instance: resolvedInstance })} id={id} className="rounded-lg border border-dashed border-outline-variant py-8 text-center">
      <Package className={`mx-auto mb-2 ${iconSize} text-on-surface-variant`} />
      <p {...uiAttributes({ uid: "profile-products.profile-products-tabs-states.p-e9RT94", id: "profile-products.profile-products-tabs-states.p", instance: resolvedInstance })} className={`${textSize} text-on-surface-variant`}>
        {label}
      </p>
    </div>
  );
}
