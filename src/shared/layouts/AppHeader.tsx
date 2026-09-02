'use client';

import { Menu, Search, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useResolvedColorScheme } from '@/shared/preferences';
import { useTranslation } from '@/shared/i18n';
import { cn } from '@/shared/utils';
import { useCart } from '@/features/cart/ui';
import { SpecialtyRequestComposer } from '@/features/specialty-chat';
import {
  OpenInAsolHeaderPrompt,
  type AsolInstallPrompt,
} from '@/features/sharing';
import { PageSaveHeaderButton } from '@/features/page-save/ui';

import { AppSidebar } from './AppSidebar';

export function AppHeader({ id,
  installPrompt,
}: {
  installPrompt: AsolInstallPrompt | null;
} & { id?: string }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const resolvedScheme = useResolvedColorScheme();
  const { t, locale } = useTranslation();
  const pathname = usePathname();
  const { totalQuantity, flashToken } = useCart();
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

  return (
    <>
      <header id={id ? `${id}-header-1-uaolwp` : undefined} className={cn(
        "fixed top-0 w-full z-50 pt-[var(--asol-app-header-inset)] shadow-sm border-b border-outline-variant rounded-b-2xl",
        resolvedScheme === 'dark' ? 'asol-surface-neutral' : 'bg-[#F8FBFF]'
      )}>
        {/* Row height is driven by the shared variable so the content padding
            in `.asol-shell-main` can never drift out of sync with it. */}
        <div id={id ? `${id}-div-2-1yazbt` : undefined} className="flex justify-between items-center h-[var(--asol-header-bar-height)] w-full max-w-7xl mx-auto px-2">
          <div id={id ? `${id}-div-3-8w7vil` : undefined} className="flex items-center gap-3">
            <button
              type="button"
              id={id ? `${id}-header-menu-button` : undefined}
              className={cn(
                "asol-control-icon flex items-center justify-center rounded-full transition-all duration-200",
                isSidebarOpen
                  ? 'bg-primary-container text-on-primary-container shadow-sm ring-1 ring-primary/20'
                  : resolvedScheme === 'dark'
                    ? 'text-primary active:bg-surface-variant'
                    : 'text-blue-900 active:bg-blue-200'
              )}
              aria-pressed={isSidebarOpen}
              aria-label={t('sidebar.menu')}
              onPointerDown={toggleSidebar}
            >
              <Menu id='shared-layouts-appheader-menu-5-qvbs67' className="w-5 h-5" />
            </button>

            {/* Saving belongs next to the menu: it is about the page the user
                is on, not about navigating away from it. */}
            <PageSaveHeaderButton />
          </div>

          <div id={id ? `${id}-div-6-aoh3is` : undefined} className="flex items-center gap-2">
            <SpecialtyRequestComposer />

            <Link
              href="/search"
              id="header-search-button"
              className={cn(
                "asol-control-icon flex items-center justify-center rounded-full transition-all duration-200",
                isSearchActive
                  ? 'bg-primary-container text-on-primary-container shadow-sm ring-1 ring-primary/20'
                  : resolvedScheme === 'dark'
                    ? 'text-primary active:bg-surface-variant'
                    : 'text-blue-900 active:bg-blue-200'
              )}
              aria-current={isSearchActive ? 'page' : undefined}
              aria-label={t('header.search')}
            >
              <Search id='shared-layouts-appheader-search-8-hesiuz' className="w-5 h-5" />
            </Link>

            <Link
              href="/cart"
              id="header-cart-button"
              className={cn(
                "asol-control-icon relative flex items-center justify-center rounded-full transition-all duration-200",
                isCartActive
                  ? 'bg-primary-container text-on-primary-container shadow-sm ring-1 ring-primary/20'
                  : resolvedScheme === 'dark'
                    ? 'text-primary active:bg-surface-variant'
                    : 'text-blue-900 active:bg-blue-200'
              )}
              aria-current={isCartActive ? 'page' : undefined}
              aria-label={t('header.cart')}
            >
              <ShoppingCart id='shared-layouts-appheader-shoppingcart-10-okfpkd' className="w-5 h-5" />
              {totalQuantity > 0 ? (
                <span id={id ? `${id}-text-11-43en61` : undefined}
                  key={flashToken}
                  className="absolute top-2 end-2 w-2 h-2 rounded-full bg-error border border-background animate-pulse-subtle data-[flash=true]:animate-[ping_0.65s_ease-out_1]"
                  data-flash={flashToken > 0}
                />
              ) : null}
            </Link>
          </div>
        </div>
        {installPrompt ? (
          <OpenInAsolHeaderPrompt locale={locale} prompt={installPrompt} />
        ) : null}
      </header>

      <AppSidebar id={id ? `${id}-app-sidebar-5dbc38` : undefined} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </>
  );
}
