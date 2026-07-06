'use client';

import { Menu, Moon, Search, ShoppingCart, Sun } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useResolvedColorScheme, useThemePreferences } from '@/lib/preferences';
import { useTranslation } from '@/lib/i18n';

import { AppSidebar } from './AppSidebar';

export function AppHeader() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { preferences, toggleColorScheme, cycleThemeMode } = useThemePreferences();
  const resolvedScheme = useResolvedColorScheme();
  const { t } = useTranslation();
  const pathname = usePathname();

  // Reset sidebar state when route changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const toggleSidebar = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsSidebarOpen((prev) => !prev);
  };

  const themeLabel =
    preferences.themeMode === 'system'
      ? `${t('header.theme')}: ${t('theme.system')} (${resolvedScheme === 'dark' ? t('theme.dark') : t('theme.light')})`
      : preferences.themeMode === 'dark'
        ? `${t('header.theme')}: ${t('theme.dark')}`
        : `${t('header.theme')}: ${t('theme.light')}`;

  return (
    <>
      <header className="fixed top-0 w-full z-50 shadow-sm border-b border-outline-variant gova-surface-neutral rounded-b-2xl">
        <div className="flex justify-between items-center h-12 w-full max-w-7xl mx-auto px-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="header-menu-button"
              className="gova-control-icon flex items-center justify-center rounded-full text-primary transition-colors active:bg-surface-variant"
              aria-label={t('sidebar.menu')}
              onPointerDown={toggleSidebar}
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link
              id="header-brand-link"
              href="/home"
              className="font-bold text-primary text-xl transition-all active:scale-95"
            >
              {t('header.brand')}
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="header-theme-button"
              className="gova-control-icon flex items-center justify-center rounded-full text-on-surface-variant transition-colors active:bg-surface-variant"
              aria-label={themeLabel}
              title={themeLabel}
              onClick={toggleColorScheme}
              onContextMenu={(e) => {
                e.preventDefault();
                cycleThemeMode();
              }}
            >
              {resolvedScheme === 'dark' ? (
                <Sun className="w-5 h-5" aria-hidden />
              ) : (
                <Moon className="w-5 h-5" aria-hidden />
              )}
            </button>

            <button
              type="button"
              id="header-search-button"
              className="gova-control-icon flex items-center justify-center rounded-full text-on-surface-variant transition-colors active:bg-surface-variant"
              aria-label={t('header.search')}
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              type="button"
              id="header-cart-button"
              className="gova-control-icon flex items-center justify-center rounded-full relative text-on-surface-variant transition-colors active:bg-surface-variant"
              aria-label={t('header.cart')}
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute top-2 end-2 w-2 h-2 rounded-full bg-error border border-background animate-pulse-subtle" />
            </button>
          </div>
        </div>
      </header>

      <AppSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </>
  );
}
