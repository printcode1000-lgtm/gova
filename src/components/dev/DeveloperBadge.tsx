'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fillRegistrationForm } from '@/lib/autofill/registration-autofill';
import { fillLoginForm } from '@/lib/autofill/login-autofill';
import { fillOnboardingRandomFixture } from '@/lib/autofill/onboarding-autofill';
import { isDevelopment } from '@/core/config';

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
  { path: '/seller', name: 'Seller' },
  { path: '/addseller', name: 'Add Seller' },
  { path: '/test1', name: 'Test1' },
  { path: '/dev/category-selector', name: 'Category Selector' },
  { path: '/dev/monitor', name: 'Operation Monitor' },
];

const SPLASH_NAV_TOGGLE_KEY = 'gova-dev-splash-nav-toggle';

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
    const stored = localStorage.getItem(SPLASH_NAV_TOGGLE_KEY);
    setIsSplashNavEnabled(stored !== 'false');
  }, []);

  const toggleSplashNav = () => {
    const newValue = !isSplashNavEnabled;
    setIsSplashNavEnabled(newValue);
    localStorage.setItem(SPLASH_NAV_TOGGLE_KEY, newValue.toString());
  };

  const handleAutofill = async () => {
    if (pathname === '/registration') {
      const result = await fillRegistrationForm();
      console.log('[Autofill Registration]:', result);
    } else if (pathname === '/login') {
      const result = await fillLoginForm();
      console.log('[Autofill Login]:', result);
    } else if (pathname === '/addseller') {
      const result = fillOnboardingRandomFixture();
      console.log('[Autofill AddSeller]:', result);
    } else {
      console.log('[Autofill] Not available on this page');
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y,
      });
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

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

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
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
      style={{
        left: position.x,
        top: position.y,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Badge
            variant="destructive"
            className="select-none pointer-events-auto"
          >
            GOVA DEV
          </Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>صفحات المشروع</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {pages.map((page) => (
            <div key={page.path} className="flex items-center justify-between px-2">
              <DropdownMenuItem asChild className="flex-1">
                <Link
                  href={page.path}
                  className={pathname === page.path ? 'bg-accent' : ''}
                >
                  {page.name}
                </Link>
              </DropdownMenuItem>
              {page.path === '/' && (
                <Button
                  variant={isSplashNavEnabled ? 'default' : 'destructive'}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSplashNav();
                  }}
                  className="ml-2 h-7 min-h-7 text-xs px-2"
                >
                  {isSplashNavEnabled ? 'ON' : 'OFF'}
                </Button>
              )}
            </div>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleAutofill}>
            ملء النموذج تلقائياً
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
