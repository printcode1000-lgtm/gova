"use client";

import { BOTTOM_NAV_CLEARANCE } from "@/shared/layouts/bottom-nav-layout";

export function SpecialtiesToast({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div id='features-profile-presentation-specialtiestoast-div-1-h3x0bd'
      className="fixed right-4 z-[100] animate-in fade-in slide-in-from-bottom-4 rounded-lg bg-red-600 px-4 py-3 text-white shadow-lg duration-300"
      style={{ bottom: BOTTOM_NAV_CLEARANCE }}
    >
      <p id='features-profile-presentation-specialtiestoast-text-2-pzod2u' className="text-sm font-medium">{message}</p>
    </div>
  );
}
