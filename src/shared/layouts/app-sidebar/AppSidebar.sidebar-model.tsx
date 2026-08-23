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
import { cn } from "@/shared/utils";
import { useTranslation } from "@/shared/i18n";
import {
  useAppPreferences,
  useResolvedColorScheme,
  useThemePreferences,
} from "@/shared/preferences";
import { clearAllClientStorage } from '@/features/app-reset';
import { useSession } from "@/features/auth/ui";
import { queueLogoutSuccessToast } from "@/features/auth/ui";
import { useLogout } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { publicEnv } from "@/core/config/public-env";
import { clearImageUploadClientState } from "@/features/storage";
import { isNativePlatform } from '@asol/native-core';

export interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}
