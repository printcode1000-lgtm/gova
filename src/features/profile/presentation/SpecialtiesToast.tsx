"use client";

import { BOTTOM_NAV_CLEARANCE } from "@/shared/layouts/bottom-nav-layout";
import { uiAttributes } from "@asol/ui-registry-core";

export function SpecialtiesToast({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div {...uiAttributes({ uid: "profile.specialties-toast.div.2-crIgf7", id: "profile.specialties-toast.div.2" })} id="profile.specialties-toast.div"
      className="fixed right-4 z-[100] animate-in fade-in slide-in-from-bottom-4 rounded-lg bg-red-600 px-4 py-3 text-white shadow-lg duration-300"
      style={{ bottom: BOTTOM_NAV_CLEARANCE }}
    >
      <p {...uiAttributes({ uid: "profile.specialties-toast.p.2-fO4hP0", id: "profile.specialties-toast.p.2" })} id="profile.specialties-toast.p" className="text-sm font-medium">{message}</p>
    </div>
  );
}
