import { Suspense } from "react";

import { ProfilePageContent } from "@/features/profile/ui";

function ProfilePageFallback() {
  return (
    <div id="profile.page.div" className="container px-4 py-8 text-sm text-on-surface-variant">
      جار تحميل الصفحة…
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfilePageFallback />}>
      <ProfilePageContent id="profile.page.profile-page-content" />
    </Suspense>
  );
}
