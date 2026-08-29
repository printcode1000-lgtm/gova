"use client";

import * as React from "react";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { useSession } from "@/features/auth/ui";
import type { UserSession } from "@/features/auth";
import { markPendingAuthLoginCompleted } from "@/features/auth/ui";
import { sessionService } from "@/features/auth/ui";
import { clearImageUploadClientState } from "@/features/storage";
import { notifications } from "@/features/notifications";
import { isSuperAdmin } from "@/features/auth";
import {
  asolDbDeleteSuperAdminOriginalSession,
  asolDbGetSuperAdminOriginalSession,
} from "@asol/data-core/browser";
import { uiAttributes } from "@asol/ui-registry-core";

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
    if (!original || !session) return;
    const impersonatedSession = session;
    try {
      try {
        await notifications.unregisterDevice({
          uid: impersonatedSession.uid,
          phone: impersonatedSession.phone ?? "",
        });
      } catch {
        // Never block restore on push cleanup failure.
      }
      await clearImageUploadClientState();
      const restored = await sessionService.saveSession(original);
      await asolDbDeleteSuperAdminOriginalSession();
      await markPendingAuthLoginCompleted({
        uid: restored.uid,
        phone: restored.phone,
      });
      setOriginal(null);
      setSession(restored);
      window.location.assign("/super-admin/users");
    } catch {
      // Leave the banner visible so the operator can retry.
    }
  };

  if (!original || !session || isSuperAdmin(session)) return null;

  return (
    <div {...uiAttributes({ uid: "super-admin.super-admin-impersonation-banner.div.4-BukN0P", id: "super-admin.super-admin-impersonation-banner.div.4" })} id="super-admin.super-admin-impersonation-banner.div"
      ref={bannerRef}
      className="fixed inset-x-0 top-0 z-[90] border-b border-amber-300 bg-amber-100 px-3 pb-2 pt-[calc(0.5rem+var(--asol-safe-area-top))] text-amber-950 shadow-sm"
    >
      <div {...uiAttributes({ uid: "super-admin.super-admin-impersonation-banner.div.5-DneW1f", id: "super-admin.super-admin-impersonation-banner.div.5" })} id="super-admin.super-admin-impersonation-banner.div.2" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-sm">
        <div {...uiAttributes({ uid: "super-admin.super-admin-impersonation-banner.div.6-zr7eIY", id: "super-admin.super-admin-impersonation-banner.div.6" })} id="super-admin.super-admin-impersonation-banner.div.3" className="flex items-center gap-2">
          <ShieldAlert id="super-admin.super-admin-impersonation-banner.shield-alert" className="h-4 w-4" />
          <span {...uiAttributes({ uid: "super-admin.super-admin-impersonation-banner.span.2-SdYFP5", id: "super-admin.super-admin-impersonation-banner.span.2" })} id="super-admin.super-admin-impersonation-banner.span">
            أنت الآن داخل حساب {session.phone || session.uid} بصلاحيات كاملة.
          </span>
        </div>
        <Button id="super-admin.super-admin-impersonation-banner.button" ui={{ uid: "super-admin.impersonation.stop-n16Ir7", id: "super-admin.impersonation.stop", kind: "action", action: "stop-impersonation", part: "banner" }} type="button" size="sm" variant="outline" onClick={stop}>
          إنهاء الانتحال والعودة للسوبر أدمن
        </Button>
      </div>
    </div>
  );
}
