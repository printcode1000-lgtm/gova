'use client';

import { Menu, Moon, Search, ShoppingCart, Sun } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useResolvedColorScheme, useThemePreferences } from '@/lib/preferences';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useCart } from '@/features/cart/use-cart';
import { SpecialtyRequestComposer } from '@/features/specialty-chat';

import { AppSidebar } from './AppSidebar';

export function AppHeader() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { preferences, toggleColorScheme, cycleThemeMode } = useThemePreferences();
  const resolvedScheme = useResolvedColorScheme();
  const { t } = useTranslation();
  const pathname = usePathname();
  const { totalQuantity, flashToken } = useCart();
  const isHomeActive = pathname === '/home';
  const isSearchActive = pathname === '/search' || pathname.startsWith('/search/');
  const isCartActive = pathname === '/cart' || pathname.startsWith('/cart/');

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
    preferences.themeMode === 'dark'
      ? `${t('header.theme')}: ${t('theme.dark')}`
      : `${t('header.theme')}: ${t('theme.light')}`;

  return (
    <>
      <header className={cn(
        "fixed top-0 w-full z-50 shadow-sm border-b border-outline-variant rounded-b-2xl",
        resolvedScheme === 'dark' ? 'asol-surface-neutral' : 'bg-[#F8FBFF]'
      )}>
        <div className="flex justify-between items-center h-12 w-full max-w-7xl mx-auto px-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="header-menu-button"
              className={cn(
                "asol-control-icon flex items-center justify-center rounded-full transition-all duration-200",
                isSidebarOpen
                  ? 'bg-primary-container text-on-primary-container shadow-sm ring-1 ring-primary/20'
                  : resolvedScheme === 'dark'
                    ? 'text-primary hover:bg-surface-container-high active:bg-surface-variant'
                    : 'text-blue-900 hover:bg-blue-100/70 active:bg-blue-200'
              )}
              aria-pressed={isSidebarOpen}
              aria-label={t('sidebar.menu')}
              onPointerDown={toggleSidebar}
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link
              id="header-brand-link"
              href="/home"
              className={cn(
                "rounded-2xl px-2 py-1 text-xl font-bold no-underline transition-all active:scale-95",
                isHomeActive
                  ? 'bg-primary-container text-on-primary-container shadow-sm ring-1 ring-primary/20'
                  : resolvedScheme === 'dark'
                    ? 'text-primary hover:bg-surface-container-high'
                    : 'text-blue-900 hover:bg-blue-100/70'
              )}
              aria-current={isHomeActive ? 'page' : undefined}
            >
              {t('header.brand')}
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <SpecialtyRequestComposer />
            <button
              type="button"
              id="header-theme-button"
              className={cn(
                "asol-control-icon flex items-center justify-center rounded-full transition-all duration-200",
                resolvedScheme === 'dark'
                  ? 'text-primary hover:bg-surface-container-high active:bg-surface-variant'
                  : 'text-blue-900 hover:bg-blue-100/70 active:bg-blue-200'
              )}
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

            <Link
              href="/search"
              id="header-search-button"
              className={cn(
                "asol-control-icon flex items-center justify-center rounded-full transition-all duration-200",
                isSearchActive
                  ? 'bg-primary-container text-on-primary-container shadow-sm ring-1 ring-primary/20'
                  : resolvedScheme === 'dark'
                    ? 'text-primary hover:bg-surface-container-high active:bg-surface-variant'
                    : 'text-blue-900 hover:bg-blue-100/70 active:bg-blue-200'
              )}
              aria-current={isSearchActive ? 'page' : undefined}
              aria-label={t('header.search')}
            >
              <Search className="w-5 h-5" />
            </Link>

            <Link
              href="/cart"
              id="header-cart-button"
              className={cn(
                "asol-control-icon relative flex items-center justify-center rounded-full transition-all duration-200",
                isCartActive
                  ? 'bg-primary-container text-on-primary-container shadow-sm ring-1 ring-primary/20'
                  : resolvedScheme === 'dark'
                    ? 'text-primary hover:bg-surface-container-high active:bg-surface-variant'
                    : 'text-blue-900 hover:bg-blue-100/70 active:bg-blue-200'
              )}
              aria-current={isCartActive ? 'page' : undefined}
              aria-label={t('header.cart')}
            >
              <ShoppingCart className="w-5 h-5" />
              {totalQuantity > 0 ? (
                <span
                  key={flashToken}
                  className="absolute top-2 end-2 w-2 h-2 rounded-full bg-error border border-background animate-pulse-subtle data-[flash=true]:animate-[ping_0.65s_ease-out_1]"
                  data-flash={flashToken > 0}
                />
              ) : null}
            </Link>
          </div>
        </div>
      </header>

      <AppSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </>
  );
}
