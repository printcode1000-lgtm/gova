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

export interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}
