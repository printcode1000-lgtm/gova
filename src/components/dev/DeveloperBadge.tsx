'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { isDevelopment } from '@/core/config';
import { fillLoginForm } from '@/lib/autofill/login-autofill';
import { fillRegistrationForm } from '@/lib/autofill/registration-autofill';
import { asolDbGet, asolDbSet, ASOL_DB_STORES } from '@/lib/asol-db';

const pages = [
  { path: '/', name: 'Splash' },
  { path: '/home', name: 'Home' },
  { path: '/login', name: 'Login' },
  { path: '/registration', name: 'Registration' },
  { path: '/forgot-password', name: 'Forgot Password' },
  { path: '/profile', name: 'Profile' },
  { path: '/settings', name: 'Settings' },
  { path: '/favorites', name: 'Favorites' },
  { path: '/notifications', name: 'Notifications' },
  { path: '/orders', name: 'Orders' },
  { path: '/test1', name: 'Test1' },
  { path: '/dev/category-selector', name: 'Category Selector' },
  { path: '/dev/monitor', name: 'Operation Monitor' },
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

  const handleAutofill = async () => {
    if (pathname === '/registration') {
      const result = await fillRegistrationForm();
      console.log('[Autofill Registration]:', result);
      return;
    }

    if (pathname === '/login') {
      const result = await fillLoginForm();
      console.log('[Autofill Login]:', result);
      return;
    }

    console.log('[Autofill] Not available on this page');
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
    <div
      ref={badgeRef}
      className="fixed z-50 cursor-grab active:cursor-grabbing"
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Badge variant="destructive" className="select-none pointer-events-auto">
            ASOL DEV
          </Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 max-h-[80vh] overflow-y-auto">
          <DropdownMenuLabel>صفحات المشروع</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {pages.map((page) => (
            <div key={page.path} className="flex items-center justify-between px-2">
              <DropdownMenuItem asChild className="flex-1">
                <Link href={page.path} className={pathname === page.path ? 'bg-accent' : ''}>
                  {page.name}
                </Link>
              </DropdownMenuItem>
              {page.path === '/' && (
                <Button
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
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void handleAutofill()}>
            ملء النموذج تلقائيًا
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
