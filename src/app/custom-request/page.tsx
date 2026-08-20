import { Suspense } from "react";

import { CustomRequestPageContent } from "@/features/profile/presentation/CustomRequestPageContent";

function CustomRequestPageFallback() {
  return (
    <div className="container px-4 py-8 text-sm text-on-surface-variant">
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
