import { Suspense } from "react";

import { ProfilePageContent } from "@/features/profile/ui";

function ProfilePageFallback() {
  return (
    <div id='app-profile-page-div-1-mlfetl' className="container px-4 py-8 text-sm text-on-surface-variant">
      جار تحميل الصفحة…
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfilePageFallback />}>
      <ProfilePageContent id='app-profile-page-profilepagecontent-2-ycxe39' />
    </Suspense>
  );
}
