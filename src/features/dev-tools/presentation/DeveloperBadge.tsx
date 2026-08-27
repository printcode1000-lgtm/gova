'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { isDevelopment } from '@/core/config';
import { OVERLAY_CHROME_ATTRIBUTE } from '@/shared/ui/overlay-chrome';
import { OverlayChromeBranch } from '@/shared/ui/overlay-chrome-branch';
import { asolDbGet, asolDbSet, ASOL_DB_STORES } from '@asol/data-core/browser';

const pages = [
  { path: '/', name: 'شاشة البداية' },
  { path: '/dev/category-selector', name: 'محدد الأقسام' },
  { path: '/dev/monitor', name: 'مراقب العمليات' },
  { path: '/dev/catalog-studio', name: 'استوديو الكتالوج' },
  { path: '/dev/data-health', name: 'صحة البيانات' },
  { path: '/dev/dev-cloud-backup', name: 'النسخ السحابي للتطوير' },
  { path: '/dev/release-console', name: 'وحدة الإصدار' },
  { path: '/dev/deploy-all', name: 'تشغيل Deploy' },
  { path: '/dev/cloud-accounts', name: 'الحسابات السحابية' },
  { path: '/dev/notification-tests', name: 'اختبارات الإشعارات' },
];

const SPLASH_NAV_TOGGLE_KEY = 'asol-dev-splash-nav-toggle';

export function DeveloperBadge() {
  const pathname = usePathname();
  const [position, setPosition] = useState({ x: 16, y: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSplashNavEnabled, setIsSplashNavEnabled] = useState(true);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    setPosition({ x: 16, y: window.innerHeight - 60 });

    const loadSplashNav = async () => {
      const stored = await asolDbGet<boolean>(
        ASOL_DB_STORES.APP_SETTINGS,
        SPLASH_NAV_TOGGLE_KEY,
      );
      setIsSplashNavEnabled(stored !== false);
    };

    void loadSplashNav();
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: event.clientX - dragStartRef.current.x,
        y: event.clientY - dragStartRef.current.y,
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleTouchMove = (event: TouchEvent) => {
      if (!isDragging) return;
      const touch = event.touches[0];
      setPosition({
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y,
      });
    };

    const handleTouchEnd = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  const toggleSplashNav = async () => {
    const newValue = !isSplashNavEnabled;
    setIsSplashNavEnabled(newValue);
    await asolDbSet<boolean>(
      ASOL_DB_STORES.APP_SETTINGS,
      SPLASH_NAV_TOGGLE_KEY,
      newValue,
    );
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    };
  };

  if (!isDevelopment || !isMounted) {
    return null;
  }

  return (
    <OverlayChromeBranch id="dev-tools.developer-badge.overlay-chrome-branch"
      ref={badgeRef}
      className="fixed z-[140] active:opacity-90"
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <DropdownMenu>
        <DropdownMenuTrigger id="dev-tools.developer-badge.dropdown-menu-trigger" asChild>
          <Badge id="dev-tools.developer-badge.badge" variant="destructive" className="select-none pointer-events-auto">
            ASOL DEV
          </Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-64 max-h-[80vh] overflow-y-auto"
          {...{ [OVERLAY_CHROME_ATTRIBUTE]: 'true' }}
        >
          <DropdownMenuLabel id="dev-tools.developer-badge.dropdown-menu-label">صفحات المشروع</DropdownMenuLabel>
          <DropdownMenuSeparator id="dev-tools.developer-badge.dropdown-menu-separator" />
          {pages.map((page) => (
            <div key={page.path} className="flex items-center justify-between px-2">
              <DropdownMenuItem asChild className="flex-1">
                <Link href={page.path} className={pathname === page.path ? 'bg-accent' : ''}>
                  {page.name}
                </Link>
              </DropdownMenuItem>
              {page.path === '/' && (
                <Button ui={{ uid: 'dev.developer-badge.toggle-splash-nav-lTk8oE', id: 'dev.developer-badge.toggle-splash-nav', kind: 'action', action: 'toggle-splash-nav', part: 'menu' }}
                  variant={isSplashNavEnabled ? 'default' : 'destructive'}
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    void toggleSplashNav();
                  }}
                  className="ml-2 h-7 min-h-7 text-xs px-2"
                >
                  {isSplashNavEnabled ? 'ON' : 'OFF'}
                </Button>
              )}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </OverlayChromeBranch>
  );
}
