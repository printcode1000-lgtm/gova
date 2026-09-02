"use client";

import {
  Bell,
  ChevronDown,
  Edit,
  Eye,
  FileText,
  Info,
  Languages,
  LogIn,
  LogOut,
  MessagesSquare,
  Moon,
  Settings2,
  Sun,
  X,
  User,
} from "lucide-react";
import Link from "next/link";
import NextImage from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRightFromBracket,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { FocusTrap } from "focus-trap-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/shared/utils";
import { useTranslation } from "@/shared/i18n";
import {
  useAppPreferences,
  useResolvedColorScheme,
  useThemePreferences,
} from "@/shared/preferences";
import { useSession } from "@/features/auth/ui";
import { useLogout } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import { formatSessionPhone } from "@/features/auth";
import { useStoreDetails } from "@/features/profile/ui";
import { useProfileStoreImages } from "@/features/profile/ui";
import { shouldUseUnoptimizedImage } from '@asol/storage-core';
import { Button } from "@/shared/ui/button";
import { isOutsideDismissExempt } from "@/shared/ui/overlay-chrome";

import { AppSidebarProps } from "./app-sidebar/AppSidebar.sidebar-model";
import {
  AppSidebarSuperAdminSection,
  COLLAPSED_SUPER_ADMIN_GROUPS,
  type SuperAdminGroupKey,
} from "./app-sidebar/AppSidebarSuperAdminSection";
import { executeSidebarLogout } from "./app-sidebar/AppSidebar.logout";
import { createAppSidebarStyles } from "./app-sidebar/AppSidebar.styles";

export const AppSidebar = React.memo(function AppSidebar({ id,
  isOpen,
  onClose,
}: AppSidebarProps & { id?: string }) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { t, isRTL } = useTranslation();
  const resolvedScheme = useResolvedColorScheme();
  const {
    preferences: themePreferences,
    updatePreferences: updateThemePreferences,
    resetPreferences: resetThemePreferences,
  } = useThemePreferences();
  const {
    preferences: appPreferences,
    updatePreferences: updateAppPreferences,
    resetPreferences: resetAppPreferences,
  } = useAppPreferences();
  const { isLoggedIn, session, setSession } = useSession();
  const { details: storeDetails } = useStoreDetails();
  const { storeImages } = useProfileStoreImages();
  const profileIdentityLabel = isLoggedIn
    ? storeDetails.storeName.trim() || formatSessionPhone(session?.phone ?? "")
    : "";
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const showSuperAdmin = isSuperAdmin(session);
  const [superAdminOpen, setSuperAdminOpen] = useState(false);
  const [superAdminGroupsOpen, setSuperAdminGroupsOpen] = useState<
    Record<SuperAdminGroupKey, boolean>
  >({ ...COLLAPSED_SUPER_ADMIN_GROUPS });
  const [settingsGroupOpen, setSettingsGroupOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const logout = useLogout();
  const [mounted, setMounted] = useState(false);
  const isProfilePage = pathname === "/profile";
  const [activeProfileMode, setActiveProfileMode] = useState<string | null>(
    null,
  );
  const isProfilePreviewActive = activeProfileMode === "preview";
  const isProfileEditActive = activeProfileMode === "edit";
  const {
    sidebarActiveTone,
    sidebarControlClass,
    sidebarIconClass,
    sidebarPressSurface,
    sidebarSmallIconClass,
    sidebarSurface,
    sidebarTone,
  } = createAppSidebarStyles(resolvedScheme);

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
      if (isOutsideDismissExempt(event.target)) return;
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

    setLogoutDialogOpen(false);
    executeSidebarLogout({
      clearQueryCache: () => queryClient.clear(),
      closeSidebar: onClose,
      logout: () => logout.mutateAsync(),
      replaceRoute: (href) => router.replace(href),
    });
  }, [logout, onClose, queryClient, router]);

  const handleSettingsGroupToggle = useCallback(() => {
    setSettingsGroupOpen((open) => !open);
  }, []);

  const handleToggleLanguage = useCallback(() => {
    updateAppPreferences({
      locale: appPreferences.locale === "ar" ? "en" : "ar",
    });
  }, [appPreferences.locale, updateAppPreferences]);

  const handleToggleTheme = useCallback(() => {
    updateThemePreferences({
      themeMode: themePreferences.themeMode === "dark" ? "light" : "dark",
    });
  }, [themePreferences.themeMode, updateThemePreferences]);

  const handleSuperAdminToggle = useCallback(() => {
    setSuperAdminOpen((open) => {
      const next = !open;
      if (next) setSuperAdminGroupsOpen({ ...COLLAPSED_SUPER_ADMIN_GROUPS });
      return next;
    });
  }, []);

  const handleSuperAdminGroupToggle = useCallback(
    (group: SuperAdminGroupKey) => {
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
    setSuperAdminGroupsOpen({ ...COLLAPSED_SUPER_ADMIN_GROUPS });
  }, [pathname]);

  if (!mounted) return null;

  return (
    <>
      <div id={id ? `${id}-div-1-s9pbao` : undefined}
        className={`fixed inset-0 z-[60] overflow-hidden ${isOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!isOpen}
      >
        <div id={id ? `${id}-div-2-ujntnc` : undefined}
          className={cn(
            "absolute inset-0 asol-overlay-dim transition-opacity duration-300",
            isOpen ? "opacity-100" : "opacity-0",
          )}
        />

        <FocusTrap
          active={isOpen}
          focusTrapOptions={{
            allowOutsideClick: (event) => isOutsideDismissExempt(event.target),
            clickOutsideDeactivates: false,
          }}
        >
          <div id={id ? `${id}-div-3-nezeae` : undefined}
            ref={sidebarRef}
            role="dialog"
            aria-modal={isOpen}
            aria-label={t("sidebar.menu")}
            className={cn(
              "fixed top-0 inset-inline-start-0 z-[61] flex h-dvh max-h-dvh w-[min(20rem,calc(100vw-0.75rem))] flex-col border-e transition-transform duration-300 ease-out sm:w-80",
              resolvedScheme === "dark" ? "asol-drawer-panel" : "bg-[#F8FBFF]",
              isOpen
                ? "translate-x-0"
                : isRTL
                  ? "translate-x-full"
                  : "-translate-x-full",
            )}
            dir={isRTL ? "rtl" : "ltr"}
          >
            <div id={id ? `${id}-div-4-aq48ad` : undefined} className="flex shrink-0 items-center justify-between border-b border-outline-variant/30 asol-section-tonal-primary px-3 pb-3 pt-[calc(0.75rem+var(--asol-safe-area-top))]">
              <span id={id ? `${id}-text-5-kwl5vy` : undefined} className="text-sm font-semibold text-on-primary-container px-2">
                {t("sidebar.menu")}
              </span>
              <button id={id ? `${id}-button-6-vlf1bu` : undefined}
                type="button"
                className={cn(
                  "asol-control-icon flex items-center justify-center rounded-full active:opacity-80",
                  sidebarTone,
                  sidebarPressSurface,
                )}
                onClick={onClose}
                aria-label={t("sidebar.close")}
              >
                <X id='shared-layouts-appsidebar-x-7-4uxir2' className="w-5 h-5" />
              </button>
            </div>

            <div id={id ? `${id}-div-8-nsyyay` : undefined} className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-3 pt-2 pb-[calc(0.75rem+var(--asol-safe-area-bottom))] [scrollbar-width:thin] [&>*]:shrink-0">
              {isLoggedIn ? (
                <>
                  <div id={id ? `${id}-div-9-i4rngy` : undefined}
                    className={cn(
                      "asol-control space-y-2 rounded-2xl border p-2.5",
                      resolvedScheme === "dark"
                        ? "border-outline-variant/30"
                        : "border-outline-variant/20",
                      sidebarSurface,
                    )}
                  >
                    <div id={id ? `${id}-div-10-ykjfiy` : undefined}
                      className={cn(
                        "px-1.5 py-1 text-xs font-semibold flex items-center gap-2",
                        sidebarTone,
                      )}
                    >
                      <span id={id ? `${id}-text-11-oqb7zl` : undefined}
                        className={cn(
                          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full",
                          storeImages.avatarUrl ? "h-14 w-14" : "h-7 w-7",
                          resolvedScheme === "dark"
                            ? "bg-primary/15 text-primary"
                            : "bg-primary-container text-on-primary-container",
                        )}
                      >
                        {storeImages.avatarUrl ? (
                          <NextImage id='shared-layouts-appsidebar-nextimage-12-zglt85'
                            src={storeImages.avatarUrl}
                            alt=""
                            fill
                            sizes="56px"
                            className="object-cover"
                            unoptimized={shouldUseUnoptimizedImage(storeImages.avatarUrl)}
                          />
                        ) : (
                          <User id='shared-layouts-appsidebar-user-13-tj1git' className={sidebarSmallIconClass} />
                        )}
                      </span>
                      <div id={id ? `${id}-div-14-niaevb` : undefined} className="min-w-0 flex-1">
                        <p id={id ? `${id}-text-15-svc3ah` : undefined}>{t("nav.profile")}</p>
                        {profileIdentityLabel ? (
                          <p id={id ? `${id}-text-16-fianqm` : undefined}
                            dir="auto"
                            className="truncate text-start font-normal opacity-70"
                          >
                            {profileIdentityLabel}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div id={id ? `${id}-div-17-oo7czn` : undefined} className="flex gap-1 px-1.5 py-1">
                      <div id={id ? `${id}-div-18-dluscd` : undefined}
                        className={cn(
                          "flex w-full rounded-xl p-1",
                          resolvedScheme === "dark"
                            ? "bg-surface-container-high"
                            : "bg-blue-50",
                        )}
                      >
                        <Link id='shared-layouts-appsidebar-link-19-sujzys'
                          href="/profile?mode=preview"
                          onClick={onClose}
                          className="flex-1"
                        >
                          <button id={id ? `${id}-button-20-vxdhpj` : undefined}
                            type="button"
                            className={cn(
                              "w-full flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-sm font-medium transition-all",
                              isProfilePreviewActive
                                ? sidebarActiveTone
                                : cn(sidebarTone, sidebarPressSurface),
                            )}
                          >
                            <Eye id='shared-layouts-appsidebar-eye-21-lgnvdp' className="w-4 h-4" />
                            {t("sidebar.preview")}
                          </button>
                        </Link>
                        <Link id='shared-layouts-appsidebar-link-22-bfs3m7'
                          href="/profile?mode=edit"
                          onClick={onClose}
                          className="flex-1"
                        >
                          <button id={id ? `${id}-button-23-yiyz0d` : undefined}
                            type="button"
                            className={cn(
                              "w-full flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-sm font-medium transition-all",
                              isProfileEditActive
                                ? sidebarActiveTone
                                : cn(sidebarTone, sidebarPressSurface),
                            )}
                          >
                            <Edit id='shared-layouts-appsidebar-edit-24-3tws23' className="w-4 h-4" />
                            {t("sidebar.edit")}
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>

                  {showSuperAdmin ? (
                    <AppSidebarSuperAdminSection id={id ? `${id}-app-sidebar-super-admin-section-877dd9` : undefined}
                      resolvedScheme={resolvedScheme}
                      sidebarControlClass={sidebarControlClass}
                      sidebarIconClass={sidebarIconClass}
                      sidebarSmallIconClass={sidebarSmallIconClass}
                      sidebarSurface={sidebarSurface}
                      sidebarTone={sidebarTone}
                      sidebarPressSurface={sidebarPressSurface}
                      superAdminOpen={superAdminOpen}
                      superAdminGroupsOpen={superAdminGroupsOpen}
                      onClose={onClose}
                      onToggle={handleSuperAdminToggle}
                      onGroupToggle={handleSuperAdminGroupToggle}
                    />
                  ) : null}
                </>
              ) : (
                <Link id='shared-layouts-appsidebar-link-25-legggw' href="/login" onClick={onClose}>
                  <button id={id ? `${id}-button-26-nkz7vf` : undefined} type="button" className={sidebarControlClass}>
                    <LogIn id='shared-layouts-appsidebar-login-27-vkuisb' className={sidebarIconClass} />
                    {t("sidebar.login")}
                  </button>
                </Link>
              )}

              <div id={id ? `${id}-div-28-xgxn3g` : undefined}
                className={cn(
                  "asol-control overflow-hidden rounded-2xl border",
                  resolvedScheme === "dark"
                    ? "border-outline-variant/30"
                    : "border-outline-variant/20",
                  sidebarSurface,
                )}
              >
                <button id={id ? `${id}-button-29-bvndog` : undefined}
                  type="button"
                  onClick={handleSettingsGroupToggle}
                  aria-expanded={settingsGroupOpen}
                  className={cn(sidebarControlClass, "rounded-none")}
                >
                  <Settings2 id='shared-layouts-appsidebar-settings2-30-vhetsf' className={sidebarIconClass} />
                  {t("sidebar.settings")}
                  <ChevronDown id='shared-layouts-appsidebar-chevrondown-31-5mzx2k'
                    className={cn(
                      "ms-auto h-4 w-4 transition-transform",
                      settingsGroupOpen && "rotate-180",
                    )}
                  />
                </button>
                {settingsGroupOpen && (
                  <div id={id ? `${id}-div-32-chgu3k` : undefined} className="flex flex-wrap justify-center gap-2 px-2 pb-2 pt-1">
                    <button id={id ? `${id}-button-33-fswgms` : undefined}
                      type="button"
                      onClick={handleToggleLanguage}
                      aria-label={t("settings.languageLabel")}
                      className={cn(
                        "flex w-fit min-w-0 flex-col items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-medium leading-5",
                        sidebarTone,
                        sidebarPressSurface,
                      )}
                    >
                      <Languages id='shared-layouts-appsidebar-languages-34-haam8r' className={sidebarIconClass} />
                      <span id={id ? `${id}-text-35-t6ueuo` : undefined}>
                        {appPreferences.locale === "ar"
                          ? t("common.arabic")
                          : t("common.english")}
                      </span>
                    </button>
                    <button id={id ? `${id}-button-36-f55p74` : undefined}
                      type="button"
                      onClick={handleToggleTheme}
                      aria-label={t("settings.visualTheme")}
                      className={cn(
                        "flex w-fit min-w-0 flex-col items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-medium leading-5",
                        sidebarTone,
                        sidebarPressSurface,
                      )}
                    >
                      {themePreferences.themeMode === "dark" ? (
                        <Moon id='shared-layouts-appsidebar-moon-37-atkpo8' className={sidebarIconClass} />
                      ) : (
                        <Sun id='shared-layouts-appsidebar-sun-38-na4lwk' className={sidebarIconClass} />
                      )}
                      <span id={id ? `${id}-text-39-abz1zz` : undefined}>
                        {themePreferences.themeMode === "dark"
                          ? t("theme.dark")
                          : t("theme.light")}
                      </span>
                    </button>
                    <Link id='shared-layouts-appsidebar-link-40-vfa4jk'
                      href="/settings/notifications"
                      onClick={onClose}
                      aria-label={t("sidebar.browserNotifications")}
                      className={cn(
                        "flex w-fit min-w-0 flex-col items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-medium leading-5",
                        sidebarTone,
                        sidebarPressSurface,
                      )}
                    >
                      <Bell id='shared-layouts-appsidebar-bell-41-tesc9c' className={sidebarIconClass} />
                      <span id={id ? `${id}-text-42-zm81y4` : undefined}>{t("sidebar.browserNotifications")}</span>
                    </Link>
                  </div>
                )}
              </div>

              <Link id='shared-layouts-appsidebar-link-43-vyixw0' href="/contact-us" onClick={onClose}>
                <button id={id ? `${id}-button-44-0ow0s5` : undefined} type="button" className={sidebarControlClass}>
                  <MessagesSquare id='shared-layouts-appsidebar-messagessquare-45-n96kqt' className={sidebarIconClass} />
                  {t("sidebar.contactUs")}
                </button>
              </Link>
              <Link id='shared-layouts-appsidebar-link-46-je36hb' href="/privacy-policy" onClick={onClose}>
                <button id={id ? `${id}-button-47-yrfvya` : undefined} type="button" className={sidebarControlClass}>
                  <FileText id='shared-layouts-appsidebar-filetext-48-hbv4m2' className={sidebarIconClass} />
                  {t("sidebar.privacyPolicy")}
                </button>
              </Link>
              <Link id='shared-layouts-appsidebar-link-49-iit5xg' href="/settings" onClick={onClose}>
                <button id={id ? `${id}-button-50-cth6bl` : undefined} type="button" className={sidebarControlClass}>
                  <Info id='shared-layouts-appsidebar-info-51-xxua9t' className={sidebarIconClass} />
                  {t("sidebar.about")}
                </button>
              </Link>

              {isLoggedIn ? (
                <button id={id ? `${id}-button-52-owqeli` : undefined}
                  type="button"
                  onClick={handleLogout}
                  disabled={logout.isPending}
                  className={cn(sidebarControlClass, "disabled:opacity-60")}
                >
                  <LogOut id='shared-layouts-appsidebar-logout-53-btwcji' className={sidebarIconClass} />
                  {t("sidebar.logout")}
                </button>
              ) : null}
            </div>
          </div>
        </FocusTrap>
      </div>

      {logoutDialogOpen && (
        <div id={id ? `${id}-div-54-u8cjkv` : undefined} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div id={id ? `${id}-div-55-qja5lt` : undefined} className="bg-white rounded-xl p-5 max-w-sm w-full shadow-xl">
            <div id={id ? `${id}-div-56-1zus5k` : undefined} className="flex items-center gap-3 mb-3">
              <div id={id ? `${id}-div-57-2k5r3r` : undefined} className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <FontAwesomeIcon id='shared-layouts-appsidebar-fontawesomeicon-58-91lccw'
                  icon={faTriangleExclamation}
                  className="text-red-600 text-lg"
                />
              </div>
              <h2 id={id ? `${id}-heading-59-t6w0rp` : undefined} className="text-base font-semibold text-right">
                {t("sidebar.logoutConfirmTitle")}
              </h2>
            </div>
            <p id={id ? `${id}-text-60-gbpi4j` : undefined} className="text-gray-600 mb-4 text-sm text-right">
              {t("sidebar.logoutConfirmMessage")}
            </p>
            <div id={id ? `${id}-div-61-2ylicr` : undefined} className="flex gap-2 flex-row-reverse">
              <button id={id ? `${id}-button-62-2y1egl` : undefined}
                onClick={confirmLogout}
                disabled={logout.isPending}
                className="flex-1 bg-red-600 text-white py-2 px-3 rounded-lg disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon id='shared-layouts-appsidebar-fontawesomeicon-63-6bsc5p' icon={faRightFromBracket} />
                {logout.isPending
                  ? t("sidebar.logoutting")
                  : t("sidebar.logoutConfirm")}
              </button>
              <button id={id ? `${id}-button-64-coixhp` : undefined}
                onClick={() => setLogoutDialogOpen(false)}
                disabled={logout.isPending}
                className="flex-1 border border-gray-300 py-2 px-3 rounded-lg disabled:opacity-50 text-sm"
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
