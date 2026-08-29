import { Suspense } from "react";

import { CustomRequestPageContent } from "@/features/profile/ui";
import { uiAttributes } from "@asol/ui-registry-core";

function CustomRequestPageFallback() {
  return (
    <div {...uiAttributes({ uid: "custom-request.page.div.2-1DIblg", id: "custom-request.page.div.2" })} id="custom-request.page.div" className="container px-4 py-8 text-sm text-on-surface-variant">
      جار تحميل الصفحة…
    </div>
  );
}

export default function CustomRequestPage() {
  return (
    <Suspense fallback={<CustomRequestPageFallback />}>
      <CustomRequestPageContent />
    </Suspense>
  );
}
