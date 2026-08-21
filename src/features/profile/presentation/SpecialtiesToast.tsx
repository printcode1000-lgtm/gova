"use client";

import { BOTTOM_NAV_CLEARANCE } from "@/components/layouts/bottom-nav-layout";

export function SpecialtiesToast({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div
      className="fixed right-4 z-[100] animate-in fade-in slide-in-from-bottom-4 rounded-lg bg-red-600 px-4 py-3 text-white shadow-lg duration-300"
      style={{ bottom: BOTTOM_NAV_CLEARANCE }}
    >
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
