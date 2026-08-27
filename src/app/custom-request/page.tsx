import { Suspense } from "react";

import { CustomRequestPageContent } from "@/features/profile/ui";

function CustomRequestPageFallback() {
  return (
    <div id="custom-request.page.div" className="container px-4 py-8 text-sm text-on-surface-variant">
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
