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
import { uiAttributes } from '@asol/ui-registry-core';

import { AppSidebar } from './AppSidebar';

export function AppHeader({
  installPrompt,
}: {
  installPrompt: AsolInstallPrompt | null;
}) {
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
      <header {...uiAttributes({ uid: 'app.header-D7X3uK', id: 'app.header', kind: 'region', part: 'top' })} className={cn(
        "fixed top-0 w-full z-50 pt-[var(--asol-app-header-inset)] shadow-sm border-b border-outline-variant rounded-b-2xl",
        resolvedScheme === 'dark' ? 'asol-surface-neutral' : 'bg-[#F8FBFF]'
      )}>
        {/* Row height is driven by the shared variable so the content padding
            in `.asol-shell-main` can never drift out of sync with it. */}
        <div {...uiAttributes({ uid: "shared.layouts.app-header.div.4-6hf0TD", id: "shared.layouts.app-header.div.4" })} id="shared.layouts.app-header.div" className="flex justify-between items-center h-[var(--asol-header-bar-height)] w-full max-w-7xl mx-auto px-2">
          <div {...uiAttributes({ uid: "shared.layouts.app-header.div.5-MR0az3", id: "shared.layouts.app-header.div.5" })} id="shared.layouts.app-header.div.2" className="flex items-center gap-3">
            <button
              {...uiAttributes({ uid: 'app.header.menu-xS4nIG', id: 'app.header.menu', kind: 'action', action: 'open-sidebar', part: 'menu' })}
              type="button"
              id="header-menu-button"
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
              <Menu id="shared.layouts.app-header.menu" className="w-5 h-5" />
            </button>

            {/* Saving belongs next to the menu: it is about the page the user
                is on, not about navigating away from it. */}
            <PageSaveHeaderButton />
          </div>

          <div {...uiAttributes({ uid: "shared.layouts.app-header.div.6-6hPZRx", id: "shared.layouts.app-header.div.6" })} id="shared.layouts.app-header.div.3" className="flex items-center gap-2">
            <SpecialtyRequestComposer />

            <Link {...uiAttributes({ uid: 'home-search-r8SiS9', id: 'home-search', kind: 'action', action: 'navigate-search', part: 'search', interaction: { type: 'tap' }, simulation: { kind: 'event', id: 'home-search' } })}
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
              <Search id="shared.layouts.app-header.search" className="w-5 h-5" />
            </Link>

            <Link {...uiAttributes({ uid: 'nav-cart-a5OnHB', id: 'nav-cart', kind: 'action', action: 'navigate-cart', part: 'cart', interaction: { type: 'tap' }, simulation: { kind: 'event', id: 'nav-cart' } })}
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
              <ShoppingCart id="shared.layouts.app-header.shopping-cart" className="w-5 h-5" />
              {totalQuantity > 0 ? (
                <span id="shared.layouts.app-header.span"
                  key={flashToken} {...uiAttributes({ uid: "shared.layouts.app-header.span.2-m5jRMH", id: "shared.layouts.app-header.span.2" })}
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

      <AppSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </>
  );
}
