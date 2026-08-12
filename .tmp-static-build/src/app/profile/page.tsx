import { Suspense } from "react";

import { ProfilePageContent } from "@/components/profile/ProfilePageContent";

function ProfilePageFallback() {
  return (
    <div className="container px-4 py-8 text-sm text-on-surface-variant">
      جار تحميل الصفحة…
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfilePageFallback />}>
      <ProfilePageContent />
    </Suspense>
  );
}
