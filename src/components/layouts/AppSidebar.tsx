"use client";

import {
  ChevronDown,
  CloudDownload,
  DatabaseBackup,
  DatabaseZap,
  Edit,
  Eye,
  Image as ImageIcon,
  LogIn,
  LogOut,
  MessagesSquare,
  Megaphone,
  ScrollText,
  Settings,
  ShieldCheck,
  KeyRound,
  ShoppingBag,
  Sliders,
  Sparkles,
  TrendingUp,
  X,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRightFromBracket,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { FocusTrap } from "focus-trap-react";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import {
  useAppPreferences,
  useResolvedColorScheme,
  useThemePreferences,
} from "@/lib/preferences";
import { clearAllClientStorage } from "@/lib/storage/client-storage";
import { useSession } from "@/features/auth/components/SessionProvider";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { specialtyChatClient } from "@/features/specialty-chat";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { notificationDeviceTokenService } from "@/features/notifications/application/device-token-service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { publicEnv } from "@/core/config";

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppSidebar = React.memo(function AppSidebar({
  isOpen,
  onClose,
}: AppSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { t, isRTL } = useTranslation();
  const resolvedScheme = useResolvedColorScheme();
  const { resetPreferences: resetThemePreferences } = useThemePreferences();
  const { resetPreferences: resetAppPreferences } = useAppPreferences();
  const { isLoggedIn, session } = useSession();
  const pathname = usePathname();
  const showSuperAdmin = isSuperAdmin(session);
  const [superAdminOpen, setSuperAdminOpen] = useState(false);
  const [superAdminGroupsOpen, setSuperAdminGroupsOpen] = useState({
    content: true,
    data: false,
    notifications: false,
    system: false,
  });
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const logout = useLogout();
  const [mounted, setMounted] = useState(false);
  const showLocalDevelopmentTools =
    publicEnv.mode === "development" ||
    (mounted &&
      typeof window !== "undefined" &&
      ["localhost", "127.0.0.1"].includes(window.location.hostname));
  const isProfilePage = pathname === "/profile";
  const [activeProfileMode, setActiveProfileMode] = useState<string | null>(null);
  const isProfilePreviewActive = activeProfileMode === "preview";
  const isProfileEditActive = activeProfileMode === "edit";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setActiveProfileMode(
      isProfilePage && typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("mode")
        : null,
    );
  }, [isOpen, isProfilePage, pathname]);

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
      if (event.key === "Escape") {
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
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";

      return () => {
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const handleLogout = useCallback(() => {
    setLogoutDialogOpen(true);
  }, []);

  const confirmLogout = useCallback(async () => {
    if (logout.isPending) return;

    try {
      if (session) {
        try {
          await specialtyChatClient.preference(session, true).catch((error) => {
            console.warn("[AppSidebar] Failed to reset specialty chat preference during logout.", error);
          });
          await notificationDeviceTokenService.unregister(
            session.uid,
            session.phone,
          );
        } catch (error) {
          console.warn("[AppSidebar] Failed to unregister notification device during logout.", error);
        }
      }

      await logout.mutateAsync();
      setLogoutDialogOpen(false);
      onClose();
      resetThemePreferences();
      resetAppPreferences();
      await clearAllClientStorage();
      window.location.assign("/login");
    } catch (error) {
      console.error("[AppSidebar] Logout cleanup failed.", error);
      setLogoutDialogOpen(false);
      onClose();
      resetThemePreferences();
      resetAppPreferences();
      await clearAllClientStorage();
      window.location.assign("/login");
    }
  }, [
    logout,
    onClose,
    resetAppPreferences,
    resetThemePreferences,
    session,
  ]);

  const handleSuperAdminToggle = useCallback(() => {
    setSuperAdminOpen((open) => !open);
  }, []);

  const handleSuperAdminGroupToggle = useCallback(
    (group: keyof typeof superAdminGroupsOpen) => {
      setSuperAdminGroupsOpen((current) => ({
        ...current,
        [group]: !current[group],
      }));
    },
    [],
  );

  useEffect(() => {
    if (!pathname.startsWith("/super-admin")) return;
    setSuperAdminOpen(true);

    if (
      pathname.includes("/hero-slider") ||
      pathname.includes("/featured-marquee") ||
      pathname.includes("/trending-ribbon")
    ) {
      setSuperAdminGroupsOpen((current) => ({ ...current, content: true }));
      return;
    }

    if (
      pathname.includes("/data-health") ||
      pathname.includes("/dev-cloud-backup") ||
      pathname.includes("/google-play-console") ||
      pathname.includes("/google-play-store-assets")
    ) {
      setSuperAdminGroupsOpen((current) => ({ ...current, data: true }));
      return;
    }

    if (
      pathname.includes("/notifications-broadcast") ||
      pathname.includes("/vapid")
    ) {
      setSuperAdminGroupsOpen((current) => ({
        ...current,
        notifications: true,
      }));
      return;
    }

    setSuperAdminGroupsOpen((current) => ({ ...current, system: true }));
  }, [pathname]);

  // Memoize super admin content
  const superAdminContent = useMemo(() => {
    if (!showSuperAdmin) return null;
    const itemClass =
      "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-on-surface-variant hover:bg-primary/10 hover:text-primary";
    const groupButtonClass =
      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-on-surface hover:bg-primary/10";
    const groupPanelClass =
      "ms-2 space-y-1 border-s border-outline-variant/40 ps-2";
    return (
      <div className="rounded-lg asol-surface-neutral">
        <button
          type="button"
          onClick={handleSuperAdminToggle}
          aria-expanded={superAdminOpen}
          className="asol-control w-full flex items-center justify-start gap-3 rounded-lg text-sm font-medium text-on-surface asol-surface-neutral active:opacity-90"
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
          <>
          <div className="space-y-2 px-3 pb-3 pe-3 ps-11">
            <div className="rounded-md border border-outline-variant/30 bg-background/40">
              <button
                type="button"
                onClick={() => handleSuperAdminGroupToggle("content")}
                aria-expanded={superAdminGroupsOpen.content}
                className={groupButtonClass}
              >
                <Sliders className="h-4 w-4 text-primary" />
                المحتوى والعروض
                <ChevronDown
                  className={cn(
                    "ms-auto h-4 w-4 transition-transform",
                    superAdminGroupsOpen.content && "rotate-180",
                  )}
                />
              </button>
              {superAdminGroupsOpen.content && (
                <div className={groupPanelClass}>
                  <Link href="/super-admin/hero-slider" onClick={onClose} className={itemClass}>
                    <Sliders className="h-4 w-4" />
                    {t("sidebar.heroSlider")}
                  </Link>
                  <Link href="/super-admin/featured-marquee" onClick={onClose} className={itemClass}>
                    <Sparkles className="h-4 w-4" />
                    {t("sidebar.featuredMarquee")}
                  </Link>
                  <Link href="/super-admin/trending-ribbon" onClick={onClose} className={itemClass}>
                    <TrendingUp className="h-4 w-4" />
                    {t("sidebar.trendingRibbon")}
                  </Link>
                </div>
              )}
            </div>

            <div className="rounded-md border border-outline-variant/30 bg-background/40">
              <button
                type="button"
                onClick={() => handleSuperAdminGroupToggle("data")}
                aria-expanded={superAdminGroupsOpen.data}
                className={groupButtonClass}
              >
                <DatabaseZap className="h-4 w-4 text-primary" />
                البيانات والنسخ
                <ChevronDown
                  className={cn(
                    "ms-auto h-4 w-4 transition-transform",
                    superAdminGroupsOpen.data && "rotate-180",
                  )}
                />
              </button>
              {superAdminGroupsOpen.data && (
                <div className={groupPanelClass}>
                  <Link href="/super-admin/data-health" onClick={onClose} className={itemClass}>
                    <DatabaseZap className="h-4 w-4" />
                    فحص سلامة البيانات
                  </Link>
                  <Link href="/super-admin/dev-cloud-backup" onClick={onClose} className={itemClass}>
                    <DatabaseBackup className="h-4 w-4" />
                    نسخ سحابة التطوير
                  </Link>
                  {showLocalDevelopmentTools ? (
                    <>
                      <Link href="/super-admin/google-play-console" onClick={onClose} className={itemClass}>
                        <ShoppingBag className="h-4 w-4" />
                        Google Play Console
                      </Link>
                      <Link href="/super-admin/google-play-store-assets" onClick={onClose} className={itemClass}>
                        <ImageIcon className="h-4 w-4" />
                        بيانات متجر Google Play
                      </Link>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            <div className="rounded-md border border-outline-variant/30 bg-background/40">
              <button
                type="button"
                onClick={() => handleSuperAdminGroupToggle("notifications")}
                aria-expanded={superAdminGroupsOpen.notifications}
                className={groupButtonClass}
              >
                <Megaphone className="h-4 w-4 text-primary" />
                الإشعارات
                <ChevronDown
                  className={cn(
                    "ms-auto h-4 w-4 transition-transform",
                    superAdminGroupsOpen.notifications && "rotate-180",
                  )}
                />
              </button>
              {superAdminGroupsOpen.notifications && (
                <div className={groupPanelClass}>
                  <Link href="/super-admin/notifications-broadcast" onClick={onClose} className={itemClass}>
                    <Megaphone className="h-4 w-4" />
                    إرسال إشعار جماعي
                  </Link>
                  <Link href="/super-admin/vapid" onClick={onClose} className={itemClass}>
                    <KeyRound className="h-4 w-4" />
                    إدارة VAPID
                  </Link>
                </div>
              )}
            </div>

            <div className="rounded-md border border-outline-variant/30 bg-background/40">
              <button
                type="button"
                onClick={() => handleSuperAdminGroupToggle("system")}
                aria-expanded={superAdminGroupsOpen.system}
                className={groupButtonClass}
              >
                <ShieldCheck className="h-4 w-4 text-primary" />
                النظام والصلاحيات
                <ChevronDown
                  className={cn(
                    "ms-auto h-4 w-4 transition-transform",
                    superAdminGroupsOpen.system && "rotate-180",
                  )}
                />
              </button>
              {superAdminGroupsOpen.system && (
                <div className={groupPanelClass}>
                  <Link href="/super-admin/logs" onClick={onClose} className={itemClass}>
                    <ScrollText className="h-4 w-4" />
                    سجل النظام
                  </Link>
                  <Link href="/super-admin/users" onClick={onClose} className={itemClass}>
                    <Users className="h-4 w-4" />
                    بحث المستخدمين
                  </Link>
                  <Link href="/super-admin/ota-releases" onClick={onClose} className={itemClass}>
                    <CloudDownload className="h-4 w-4" />
                    {t("sidebar.otaReleases")}
                  </Link>
                </div>
              )}
            </div>
          </div>
          <div className="hidden">
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
              href="/super-admin/ota-releases"
              onClick={onClose}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-on-surface-variant hover:bg-primary/10 hover:text-primary"
            >
              <CloudDownload className="h-4 w-4" />
              {t("sidebar.otaReleases")}
            </Link>
            <Link
              href="/super-admin/logs"
              onClick={onClose}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-on-surface-variant hover:bg-primary/10 hover:text-primary"
            >
              <ScrollText className="h-4 w-4" />
              سجل النظام
            </Link>
            <Link
              href="/super-admin/users"
              onClick={onClose}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-on-surface-variant hover:bg-primary/10 hover:text-primary"
            >
              <Users className="h-4 w-4" />
              بحث المستخدمين
            </Link>
            <Link
              href="/super-admin/data-health"
              onClick={onClose}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-on-surface-variant hover:bg-primary/10 hover:text-primary"
            >
              <DatabaseZap className="h-4 w-4" />
              فحص سلامة البيانات
            </Link>
            <Link
              href="/super-admin/dev-cloud-backup"
              onClick={onClose}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-on-surface-variant hover:bg-primary/10 hover:text-primary"
            >
              <DatabaseBackup className="h-4 w-4" />
              نسخ سحابة التطوير
            </Link>
            {showLocalDevelopmentTools ? (
              <>
                <Link
                  href="/super-admin/google-play-console"
                  onClick={onClose}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-on-surface-variant hover:bg-primary/10 hover:text-primary"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Google Play Console
                </Link>
                <Link
                  href="/super-admin/google-play-store-assets"
                  onClick={onClose}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-on-surface-variant hover:bg-primary/10 hover:text-primary"
                >
                  <ImageIcon className="h-4 w-4" />
                  بيانات متجر Google Play
                </Link>
              </>
            ) : null}
            <Link
              href="/super-admin/vapid"
              onClick={onClose}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-on-surface-variant hover:bg-primary/10 hover:text-primary"
            >
              <KeyRound className="h-4 w-4" />
              إدارة VAPID
            </Link>
            <Link
              href="/super-admin/notifications-broadcast"
              onClick={onClose}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-on-surface-variant hover:bg-primary/10 hover:text-primary"
            >
              <Megaphone className="h-4 w-4" />
              إرسال إشعار جماعي
            </Link>
          </div>
          </>
        )}
      </div>
    );
  }, [
    showSuperAdmin,
    showLocalDevelopmentTools,
    superAdminOpen,
    superAdminGroupsOpen,
    handleSuperAdminToggle,
    handleSuperAdminGroupToggle,
    t,
    onClose,
  ]);

  if (!mounted) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] ${isOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!isOpen}
      >
        <div
          className={cn(
            "absolute inset-0 asol-overlay-dim transition-opacity duration-300",
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
              "fixed top-0 inset-inline-start-0 z-[61] flex h-dvh w-72 flex-col border-e transition-transform duration-300 ease-out",
              resolvedScheme === "dark" ? "asol-drawer-panel" : "bg-[#F8FBFF]",
              isOpen
                ? "translate-x-0"
                : "rtl:translate-x-full ltr:-translate-x-full",
            )}
            dir={isRTL ? "rtl" : "ltr"}
          >
            <div className="flex items-center justify-between p-3 asol-section-tonal-primary border-b border-outline-variant/30">
              <span className="text-sm font-semibold text-on-primary-container px-2">
                {t("sidebar.menu")}
              </span>
              <button
                type="button"
                className="asol-control-icon flex items-center justify-center rounded-full text-on-surface-variant active:opacity-80"
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
                    className="asol-control w-full flex items-center justify-start gap-3 rounded-lg text-sm font-medium text-on-surface asol-surface-neutral active:opacity-90 disabled:opacity-60"
                  >
                    <LogOut className="w-5 h-5 shrink-0 text-primary" />
                    {t("sidebar.logout")}
                  </button>

                  <div className="asol-control rounded-lg asol-surface-neutral p-2">
                    <div className="px-2 py-1 text-xs font-semibold flex items-center gap-2 text-blue-600">
                      <User className="w-4 h-4 text-blue-600" />
                      {t("nav.profile")}
                    </div>
                    <div className="flex gap-1 px-2 py-1">
                      <div className="flex w-full bg-gray-100 rounded-lg p-1">
                        <Link
                          href="/profile?mode=preview"
                          onClick={onClose}
                          className="flex-1"
                        >
                          <button
                            type="button"
                            className={cn(
                              "w-full flex items-center justify-center gap-2 rounded-md py-2 px-3 text-sm font-medium transition-all",
                              isProfilePreviewActive
                                ? "shadow-sm"
                                : "text-gray-600 hover:text-gray-900",
                            )}
                            style={
                              isProfilePreviewActive
                                ? { backgroundColor: "#2563eb", color: "white" }
                                : undefined
                            }
                          >
                            <Eye className="w-4 h-4" />
                            {t("sidebar.preview")}
                          </button>
                        </Link>
                        <Link
                          href="/profile?mode=edit"
                          onClick={onClose}
                          className="flex-1"
                        >
                          <button
                            type="button"
                            className={cn(
                              "w-full flex items-center justify-center gap-2 rounded-md py-2 px-3 text-sm font-medium transition-all",
                              isProfileEditActive
                                ? "shadow-sm"
                                : "text-gray-600 hover:text-gray-900",
                            )}
                            style={
                              isProfileEditActive
                                ? { backgroundColor: "#2563eb", color: "white" }
                                : undefined
                            }
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
                    className="asol-control w-full flex items-center justify-start gap-3 rounded-lg text-sm font-medium text-on-surface asol-surface-neutral active:opacity-90"
                  >
                    <LogIn className="w-5 h-5 shrink-0 text-primary" />
                    {t("sidebar.login")}
                  </button>
                </Link>
              )}

              <Link href="/settings" onClick={onClose}>
                <button
                  type="button"
                  className="asol-control w-full flex items-center justify-start gap-3 rounded-lg text-sm font-medium text-on-surface asol-surface-neutral active:opacity-90"
                >
                  <Settings className="w-5 h-5 shrink-0 text-primary" />
                  {t("sidebar.settings")}
                </button>
              </Link>
              <Link href="/contact-us" onClick={onClose}>
                <button
                  type="button"
                  className="asol-control w-full flex items-center justify-start gap-3 rounded-lg text-sm font-medium text-on-surface asol-surface-neutral active:opacity-90"
                >
                  <MessagesSquare className="w-5 h-5 shrink-0 text-primary" />
                  {t("sidebar.contactUs")}
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
                <FontAwesomeIcon
                  icon={faTriangleExclamation}
                  className="text-red-600 text-lg"
                />
              </div>
              <h2 className="text-base font-semibold text-right">
                {t("sidebar.logoutConfirmTitle")}
              </h2>
            </div>
            <p className="text-gray-600 mb-4 text-sm text-right">
              {t("sidebar.logoutConfirmMessage")}
            </p>
            <div className="flex gap-2 flex-row-reverse">
              <button
                onClick={confirmLogout}
                disabled={logout.isPending}
                className="flex-1 bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faRightFromBracket} />
                {logout.isPending
                  ? t("sidebar.logoutting")
                  : t("sidebar.logoutConfirm")}
              </button>
              <button
                onClick={() => setLogoutDialogOpen(false)}
                disabled={logout.isPending}
                className="flex-1 border border-gray-300 py-2 px-3 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
              >
                {t("sidebar.logoutCancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
