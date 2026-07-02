"use client";

import {
  ChevronDown,
  Edit,
  Eye,
  LogIn,
  LogOut,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { useSession } from "@/features/auth/components/SessionProvider";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { t, isRTL } = useTranslation();
  const { isLoggedIn, session } = useSession();
  const showSuperAdmin = isSuperAdmin(session);
  const [superAdminOpen, setSuperAdminOpen] = useState(false);
  const logout = useLogout();

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerOutside = (event: PointerEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerOutside);
    return () =>
      document.removeEventListener("pointerdown", handlePointerOutside);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <div
      className={`fixed inset-0 z-[60] ${isOpen ? "" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      <div
        className={cn(
          "absolute inset-0 gova-overlay-dim transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        ref={sidebarRef}
        role="dialog"
        aria-modal={isOpen}
        aria-label={t("sidebar.menu")}
        className={cn(
          "fixed top-0 inset-inline-start-0 z-[61] flex h-dvh w-72 flex-col border-e gova-drawer-panel transition-transform duration-300 ease-out",
          isOpen
            ? "translate-x-0"
            : "rtl:translate-x-full ltr:-translate-x-full",
        )}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="flex items-center justify-between p-3 gova-section-tonal-primary border-b border-outline-variant/30">
          <span className="text-sm font-semibold text-on-primary-container px-2">
            {t("sidebar.menu")}
          </span>
          <button
            type="button"
            className="gova-control-icon flex items-center justify-center rounded-full text-on-surface-variant active:opacity-80"
            onClick={onClose}
            aria-label={t("sidebar.close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 pt-2">
          {isLoggedIn ? (
            <>
              <button
                type="button"
                onClick={handleLogout}
                disabled={logout.isPending}
                className="gova-control w-full flex items-center justify-start gap-3 rounded-lg text-sm font-medium text-on-surface gova-surface-neutral active:opacity-90 disabled:opacity-60"
              >
                <LogOut className="w-5 h-5 shrink-0 text-primary" />
                {t("sidebar.logout")}
              </button>

              <div className="gova-control rounded-lg gova-surface-neutral p-2">
                <div className="px-2 py-1 text-xs font-semibold text-on-surface-variant">
                  {t("nav.profile")}
                </div>
                <div className="flex gap-1 px-2 py-1">
                  <Link href="/profile?mode=preview" onClick={onClose}>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-on-surface active:opacity-90"
                    >
                      <Eye className="w-4 h-4 shrink-0 text-primary" />
                      {t("sidebar.preview")}
                    </button>
                  </Link>
                  <Link href="/profile?mode=edit" onClick={onClose}>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-on-surface active:opacity-90"
                    >
                      <Edit className="w-4 h-4 shrink-0 text-primary" />
                      {t("sidebar.edit")}
                    </button>
                  </Link>
                </div>
              </div>

              {showSuperAdmin && (
                <div className="rounded-lg gova-surface-neutral">
                  <button
                    type="button"
                    onClick={() => setSuperAdminOpen((open) => !open)}
                    aria-expanded={superAdminOpen}
                    className="gova-control w-full flex items-center justify-start gap-3 rounded-lg text-sm font-medium text-on-surface gova-surface-neutral active:opacity-90"
                  >
                    <ShieldCheck className="w-5 h-5 shrink-0 text-primary" />
                    {t("sidebar.superAdmin")}
                    <ChevronDown
                      className={cn(
                        "ms-auto h-4 w-4 transition-transform",
                        superAdminOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {superAdminOpen && (
                    <div className="px-3 pb-3 ps-11">
                      <Link
                        href="/super-admin/hero-slider"
                        onClick={onClose}
                        className="block rounded-md px-3 py-2 text-sm text-on-surface-variant hover:bg-primary/10 hover:text-primary"
                      >
                        Hero Slider
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <Link href="/login" onClick={onClose}>
              <button
                type="button"
                className="gova-control w-full flex items-center justify-start gap-3 rounded-lg text-sm font-medium text-on-surface gova-surface-neutral active:opacity-90"
              >
                <LogIn className="w-5 h-5 shrink-0 text-primary" />
                {t("sidebar.login")}
              </button>
            </Link>
          )}

          <Link href="/settings" onClick={onClose}>
            <button
              type="button"
              className="gova-control w-full flex items-center justify-start gap-3 rounded-lg text-sm font-medium text-on-surface gova-surface-neutral active:opacity-90"
            >
              <Settings className="w-5 h-5 shrink-0 text-primary" />
              {t("sidebar.settings")}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
