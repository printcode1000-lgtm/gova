"use client";

import * as React from "react";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/components/SessionProvider";
import type { UserSession } from "@/features/auth/entities/session.entity";
import { sessionService } from "@/features/auth/services/session-service";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import {
  asolDbDeleteSuperAdminOriginalSession,
  asolDbGetSuperAdminOriginalSession,
} from "@asol/data-core/browser";

/** Height published to the layout so the header is pushed below the banner. */
const TOP_OVERLAY_VAR = "--asol-top-overlay-height";

export function SuperAdminImpersonationBanner() {
  const { session, setSession } = useSession();
  const [original, setOriginal] = React.useState<UserSession | null>(null);
  const bannerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let active = true;
    void asolDbGetSuperAdminOriginalSession<UserSession>().then((stored) => {
      if (active) setOriginal(stored);
    });
    return () => {
      active = false;
    };
  }, [session?.uid]);

  React.useLayoutEffect(() => {
    const banner = bannerRef.current;
    const root = document.documentElement;
    if (!banner) {
      root.style.removeProperty(TOP_OVERLAY_VAR);
      return;
    }
    // The measured height already includes the top safe area the banner pads
    // for, so the layout takes `max(safe area, this)` rather than summing them.
    // Written synchronously so it also lands while the document is hidden.
    const publishHeight = () => {
      root.style.setProperty(TOP_OVERLAY_VAR, `${banner.offsetHeight}px`);
    };

    publishHeight();
    const observer = new ResizeObserver(publishHeight);
    observer.observe(banner);

    return () => {
      observer.disconnect();
      root.style.removeProperty(TOP_OVERLAY_VAR);
    };
  }, [original, session]);

  const stop = async () => {
    if (!original) return;
    const restored = await sessionService.saveSession(original);
    await asolDbDeleteSuperAdminOriginalSession();
    setOriginal(null);
    setSession(restored);
    window.location.assign("/super-admin/users");
  };

  if (!original || !session || isSuperAdmin(session)) return null;

  return (
    <div
      ref={bannerRef}
      className="fixed inset-x-0 top-0 z-[90] border-b border-amber-300 bg-amber-100 px-3 pb-2 pt-[calc(0.5rem+var(--asol-safe-area-top))] text-amber-950 shadow-sm"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          <span>
            أنت الآن داخل حساب {session.phone || session.uid} بصلاحيات كاملة.
          </span>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={stop}>
          إنهاء الانتحال والعودة للسوبر أدمن
        </Button>
      </div>
    </div>
  );
}
