"use client";

import {
  ChevronDown,
  Edit,
  Eye,
  LogIn,
  LogOut,
  ScrollText,
  Settings,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
  X,
  User,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FocusTrap } from "focus-trap-react";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { useSession } from "@/features/auth/components/SessionProvider";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppSidebar = React.memo(function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { t, isRTL } = useTranslation();
  const { isLoggedIn, session } = useSession();
  const showSuperAdmin = isSuperAdmin(session);
  const [superAdminOpen, setSuperAdminOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [profileMode, setProfileMode] = useState<'preview' | 'edit'>('preview');
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

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Save scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        document.body.style.overflow = "";
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const handleLogout = useCallback(() => {
    setLogoutDialogOpen(true);
  }, []);

  const confirmLogout = useCallback(() => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setLogoutDialogOpen(false);
        onClose();
      },
    });
  }, [logout, onClose]);

  const handleProfileModeChange = useCallback((mode: 'preview' | 'edit') => {
    setProfileMode(mode);
    // Small delay to allow state update before closing
    setTimeout(() => onClose(), 100);
  }, [onClose]);

  const handleSuperAdminToggle = useCallback(() => {
    setSuperAdminOpen((open) => !open);
  }, []);

  // Memoize super admin content
  const superAdminContent = useMemo(() => {
    if (!showSuperAdmin) return null;
    return (
      <div className="rounded-lg gova-surface-neutral">
        <button
          type="button"
          onClick={handleSuperAdminToggle}
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
          <div className="space-y-1 px-3 pb-3 pe-3 ps-11">
            <Link
              href="/super-admin/hero-slider"
              onClick={onClose}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-on-surface-variant hover:bg-primary/10 hover:text-primary"
            >
              <Sliders className="h-4 w-4" />
              {t("sidebar.heroSlider")}
            </Link>
            <Link
              href="/super-admin/featured-marquee"
              onClick={onClose}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-on-surface-variant hover:bg-primary/10 hover:text-primary"
            >
              <Sparkles className="h-4 w-4" />
              {t("sidebar.featuredMarquee")}
            </Link>
            <Link
              href="/super-admin/trending-ribbon"
              onClick={onClose}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-on-surface-variant hover:bg-primary/10 hover:text-primary"
            >
              <TrendingUp className="h-4 w-4" />
              {t("sidebar.trendingRibbon")}
            </Link>
            <Link
              href="/super-admin/logs"
              onClick={onClose}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-on-surface-variant hover:bg-primary/10 hover:text-primary"
            >
              <ScrollText className="h-4 w-4" />
              سجل النظام
            </Link>
          </div>
        )}
      </div>
    );
  }, [showSuperAdmin, superAdminOpen, handleSuperAdminToggle, t, onClose]);

  return (
    <>
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

        <FocusTrap active={isOpen}>
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
                  <div className="px-2 py-1 text-xs font-semibold flex items-center gap-2 text-blue-600">
                    <User className="w-4 h-4 text-blue-600" />
                    {t("nav.profile")}
                  </div>
                  <div className="flex gap-1 px-2 py-1">
                    <div className="flex w-full bg-gray-100 rounded-lg p-1">
                      <Link href="/profile?mode=preview" onClick={() => handleProfileModeChange('preview')} className="flex-1">
                        <button
                          type="button"
                          className={cn(
                            "w-full flex items-center justify-center gap-2 rounded-md py-2 px-3 text-sm font-medium transition-all",
                            profileMode === 'preview'
                              ? "shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          )}
                          style={profileMode === 'preview' ? { backgroundColor: '#2563eb', color: 'white' } : undefined}
                        >
                          <Eye className="w-4 h-4" />
                          {t("sidebar.preview")}
                        </button>
                      </Link>
                      <Link href="/profile?mode=edit" onClick={() => handleProfileModeChange('edit')} className="flex-1">
                        <button
                          type="button"
                          className={cn(
                            "w-full flex items-center justify-center gap-2 rounded-md py-2 px-3 text-sm font-medium transition-all",
                            profileMode === 'edit'
                              ? "shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          )}
                          style={profileMode === 'edit' ? { backgroundColor: '#2563eb', color: 'white' } : undefined}
                        >
                          <Edit className="w-4 h-4" />
                          {t("sidebar.edit")}
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>

                {superAdminContent}
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
        </FocusTrap>
      </div>

      {logoutDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-600 text-lg" />
              </div>
              <h2 className="text-base font-semibold text-right">تأكيد تسجيل الخروج</h2>
            </div>
            <p className="text-gray-600 mb-4 text-sm text-right">هل أنت متأكد من أنك تريد تسجيل الخروج؟</p>
            <div className="flex gap-2 flex-row-reverse">
              <button
                onClick={confirmLogout}
                disabled={logout.isPending}
                className="flex-1 bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faRightFromBracket} />
                {logout.isPending ? "جاري الخروج..." : "نعم، تسجيل الخروج"}
              </button>
              <button
                onClick={() => setLogoutDialogOpen(false)}
                disabled={logout.isPending}
                className="flex-1 border border-gray-300 py-2 px-3 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
