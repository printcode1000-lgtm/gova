"use client";

import {
  ChevronDown,
  DatabaseBackup,
  DatabaseZap,
  Edit,
  Eye,
  Image as ImageIcon,
  LibraryBig,
  LogIn,
  LogOut,
  MessagesSquare,
  Megaphone,
  ScrollText,
  Settings,
  ShieldCheck,
  Sliders,
  Sparkles,
  TestTube2,
  TrendingUp,
  X,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRightFromBracket,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { FocusTrap } from "focus-trap-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import {
  useAppPreferences,
  useResolvedColorScheme,
  useThemePreferences,
} from "@/lib/preferences";
import { clearAllClientStorage } from "@/lib/storage/client-storage";
import { useSession } from "@/features/auth/components/SessionProvider";
import { queueLogoutSuccessToast } from "@/features/auth/components/LoginSuccessToast";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { notifications } from "@/features/notifications";
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
import { clearImageUploadClientState } from "@/features/storage/services/image-upload-client-lifecycle";
import { isNativePlatform } from "@/native-platform/core/platform";

import { AppSidebarProps } from "./app-sidebar/AppSidebar.sidebar-model";

export const AppSidebar = React.memo(function AppSidebar({
  isOpen,
  onClose,
}: AppSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { t, isRTL } = useTranslation();
  const resolvedScheme = useResolvedColorScheme();
  const { resetPreferences: resetThemePreferences } = useThemePreferences();
  const { resetPreferences: resetAppPreferences } = useAppPreferences();
  const { isLoggedIn, session, setSession } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
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
  const [catalogStudioDesktopWeb, setCatalogStudioDesktopWeb] = useState(false);
  // Capacitor serves production assets from localhost too, so hostname is not
  // proof of development. A compile-time development build plus a non-native
  // runtime is the only client-side condition allowed to reveal release tools.
  const showLocalDevelopmentTools =
    publicEnv.developmentBuild && !isNativePlatform();
  const showCatalogStudio = showLocalDevelopmentTools && catalogStudioDesktopWeb;
  const isProfilePage = pathname === "/profile";
  const [activeProfileMode, setActiveProfileMode] = useState<string | null>(
    null,
  );
  const isProfilePreviewActive = activeProfileMode === "preview";
  const isProfileEditActive = activeProfileMode === "edit";
  const sidebarTone =
    resolvedScheme === "dark"
      ? "text-primary font-normal hover:text-primary"
      : "text-blue-900 font-normal hover:text-blue-900";
  const sidebarActiveTone =
    "asol-nav-pill-active shadow-sm ring-1 ring-primary/20";
  const sidebarSurface =
    resolvedScheme === "dark" ? "bg-surface-bright" : "bg-[#F8FBFF]";
  const sidebarHoverSurface =
    resolvedScheme === "dark"
      ? "hover:bg-surface-container-high active:bg-surface-variant"
      : "hover:bg-blue-100/70 active:bg-blue-200";
  const sidebarControlClass = cn(
    "asol-control w-full min-w-0 flex items-center justify-start gap-3 rounded-lg text-sm font-medium leading-5 active:opacity-90",
    sidebarSurface,
    sidebarTone,
    sidebarHoverSurface,
  );
  const sidebarIconClass = "w-5 h-5 shrink-0";
  const sidebarSmallIconClass = "h-4 w-4 shrink-0";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const update = () => {
      setCatalogStudioDesktopWeb(
        !isNativePlatform() && window.matchMedia("(min-width: 1024px)").matches,
      );
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
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

  const confirmLogout = useCallback(() => {
    if (logout.isPending) return;

    const exitingSession = session;
    void clearImageUploadClientState();
    setLogoutDialogOpen(false);
    onClose();
    queueLogoutSuccessToast();
    router.replace("/home");
    setSession(null);
    queryClient.clear();

    void (async () => {
      try {
        if (exitingSession) {
          try {
            await notifications.unregisterDevice({
              uid: exitingSession.uid,
              phone: exitingSession.phone,
            });
          } catch (error) {
            console.warn(
              "[AppSidebar] Failed to unregister notification device during logout.",
              error,
            );
          }
        }

        await logout.mutateAsync();
        resetThemePreferences();
        resetAppPreferences();
        await clearAllClientStorage();
      } catch (error) {
        console.warn("[AppSidebar] Logout cleanup failed.", error);
        try {
          await clearAllClientStorage();
        } catch (cleanupError) {
          console.warn(
            "[AppSidebar] Local logout cleanup failed.",
            cleanupError,
          );
        }
      }
    })();
  }, [
    logout,
    onClose,
    queryClient,
    resetAppPreferences,
    resetThemePreferences,
    router,
    session,
    setSession,
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
      pathname.includes("/catalog") ||
      pathname.includes("/google-play-store-assets")
    ) {
      setSuperAdminGroupsOpen((current) => ({ ...current, data: true }));
      return;
    }

    if (
      pathname.includes("/notifications-broadcast") ||
      pathname.includes("/notification-tests")
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
    const itemClass = cn(
      "flex min-w-0 items-center gap-2 rounded-md px-3 py-2 text-sm leading-5 break-words",
      sidebarTone,
      sidebarHoverSurface,
    );
    const groupButtonClass = cn(
      "flex w-full min-w-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold leading-5 break-words",
      sidebarTone,
      sidebarHoverSurface,
    );
    const groupPanelClass =
      "ms-2 space-y-1 border-s border-outline-variant/40 ps-2";
    return (
      <div className={cn("rounded-lg", sidebarSurface)}>
        <button
          type="button"
          onClick={handleSuperAdminToggle}
          aria-expanded={superAdminOpen}
          className={sidebarControlClass}
        >
          <ShieldCheck className={sidebarIconClass} />
          {t("sidebar.superAdmin")}
          <ChevronDown
            className={cn(
              "ms-auto h-4 w-4 transition-transform",
              superAdminOpen && "rotate-180",
            )}
          />
        </button>
        {superAdminOpen && (
          <div className="space-y-2 px-2 pb-3 sm:px-3 sm:pe-3 sm:ps-11">
            <div className="rounded-md border border-outline-variant/30 bg-background/40">
              <button
                type="button"
                onClick={() => handleSuperAdminGroupToggle("content")}
                aria-expanded={superAdminGroupsOpen.content}
                className={groupButtonClass}
              >
                <Sliders className={sidebarSmallIconClass} />
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
                  <Link
                    href="/super-admin/hero-slider"
                    onClick={onClose}
                    className={itemClass}
                  >
                    <Sliders className={sidebarSmallIconClass} />
                    {t("sidebar.heroSlider")}
                  </Link>
                  <Link
                    href="/super-admin/featured-marquee"
                    onClick={onClose}
                    className={itemClass}
                  >
                    <Sparkles className={sidebarSmallIconClass} />
                    {t("sidebar.featuredMarquee")}
                  </Link>
                  <Link
                    href="/super-admin/trending-ribbon"
                    onClick={onClose}
                    className={itemClass}
                  >
                    <TrendingUp className={sidebarSmallIconClass} />
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
                <DatabaseZap className={sidebarSmallIconClass} />
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
                  <Link
                    href="/super-admin/data-health"
                    onClick={onClose}
                    className={itemClass}
                  >
                    <DatabaseZap className={sidebarSmallIconClass} />
                    فحص سلامة البيانات
                  </Link>
                  <Link
                    href="/super-admin/dev-cloud-backup"
                    onClick={onClose}
                    className={itemClass}
                  >
                    <DatabaseBackup className={sidebarSmallIconClass} />
                    نسخ سحابة التطوير
                  </Link>
                  {showCatalogStudio ? (
                    <Link
                      href="/super-admin/catalog"
                      onClick={onClose}
                      className={itemClass}
                    >
                      <LibraryBig className={sidebarSmallIconClass} />
                      <span className="min-w-0 flex-1">
                        {t("sidebar.catalogStudio")}
                      </span>
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                        DEV
                      </span>
                    </Link>
                  ) : null}
                  {showLocalDevelopmentTools ? (
                    <Link
                      href="/super-admin/google-play-store-assets"
                      onClick={onClose}
                      className={itemClass}
                    >
                      <ImageIcon className={sidebarSmallIconClass} />
                      {t("releaseConsole.title")}
                    </Link>
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
                <Megaphone className={sidebarSmallIconClass} />
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
                  <Link
                    href="/super-admin/notification-tests"
                    onClick={onClose}
                    className={itemClass}
                  >
                    <TestTube2 className={sidebarSmallIconClass} />
                    اختبارات الإشعارات
                  </Link>
                  <Link
                    href="/super-admin/notifications-broadcast"
                    onClick={onClose}
                    className={itemClass}
                  >
                    <Megaphone className={sidebarSmallIconClass} />
                    إرسال إشعار جماعي
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
                <ShieldCheck className={sidebarSmallIconClass} />
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
                  <Link
                    href="/super-admin/logs"
                    onClick={onClose}
                    className={itemClass}
                  >
                    <ScrollText className={sidebarSmallIconClass} />
                    سجل النظام
                  </Link>
                  <Link
                    href="/super-admin/users"
                    onClick={onClose}
                    className={itemClass}
                  >
                    <Users className={sidebarSmallIconClass} />
                    بحث المستخدمين
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }, [
    showSuperAdmin,
    showLocalDevelopmentTools,
    showCatalogStudio,
    superAdminOpen,
    superAdminGroupsOpen,
    handleSuperAdminToggle,
    handleSuperAdminGroupToggle,
    t,
    onClose,
    sidebarControlClass,
    sidebarHoverSurface,
    sidebarIconClass,
    sidebarSmallIconClass,
    sidebarSurface,
    sidebarTone,
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
              "fixed top-0 inset-inline-start-0 z-[61] flex h-dvh max-h-dvh w-[min(20rem,calc(100vw-0.75rem))] flex-col border-e transition-transform duration-300 ease-out sm:w-80",
              resolvedScheme === "dark" ? "asol-drawer-panel" : "bg-[#F8FBFF]",
              isOpen
                ? "translate-x-0"
                : "rtl:translate-x-full ltr:-translate-x-full",
            )}
            dir={isRTL ? "rtl" : "ltr"}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-outline-variant/30 asol-section-tonal-primary px-3 pb-3 pt-[calc(0.75rem+var(--asol-safe-area-top))]">
              <span className="text-sm font-semibold text-on-primary-container px-2">
                {t("sidebar.menu")}
              </span>
              <button
                type="button"
                className={cn(
                  "asol-control-icon flex items-center justify-center rounded-full active:opacity-80",
                  sidebarTone,
                  sidebarHoverSurface,
                )}
                onClick={onClose}
                aria-label={t("sidebar.close")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-3 pt-2 pb-[calc(0.75rem+var(--asol-safe-area-bottom))] [scrollbar-width:thin]">
              {isLoggedIn ? (
                <>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={logout.isPending}
                    className={cn(sidebarControlClass, "disabled:opacity-60")}
                  >
                    <LogOut className={sidebarIconClass} />
                    {t("sidebar.logout")}
                  </button>

                  <div
                    className={cn(
                      "asol-control rounded-lg p-2",
                      sidebarSurface,
                    )}
                  >
                    <div
                      className={cn(
                        "px-2 py-1 text-xs font-semibold flex items-center gap-2",
                        sidebarTone,
                      )}
                    >
                      <User className={sidebarSmallIconClass} />
                      {t("nav.profile")}
                    </div>
                    <div className="flex gap-1 px-2 py-1">
                      <div
                        className={cn(
                          "flex w-full rounded-lg p-1",
                          resolvedScheme === "dark"
                            ? "bg-surface-container-high"
                            : "bg-blue-50",
                        )}
                      >
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
                                ? sidebarActiveTone
                                : cn(sidebarTone, sidebarHoverSurface),
                            )}
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
                                ? sidebarActiveTone
                                : cn(sidebarTone, sidebarHoverSurface),
                            )}
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
                  <button type="button" className={sidebarControlClass}>
                    <LogIn className={sidebarIconClass} />
                    {t("sidebar.login")}
                  </button>
                </Link>
              )}

              <Link href="/settings" onClick={onClose}>
                <button type="button" className={sidebarControlClass}>
                  <Settings className={sidebarIconClass} />
                  {t("sidebar.settings")}
                </button>
              </Link>
              <Link href="/contact-us" onClick={onClose}>
                <button type="button" className={sidebarControlClass}>
                  <MessagesSquare className={sidebarIconClass} />
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
