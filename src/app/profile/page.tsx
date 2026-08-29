import { Suspense } from "react";

import { ProfilePageContent } from "@/features/profile/ui";
import { uiAttributes } from "@asol/ui-registry-core";

function ProfilePageFallback() {
  return (
    <div {...uiAttributes({ uid: "profile.page.div.2-WBUdm6", id: "profile.page.div.2" })} id="profile.page.div" className="container px-4 py-8 text-sm text-on-surface-variant">
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
