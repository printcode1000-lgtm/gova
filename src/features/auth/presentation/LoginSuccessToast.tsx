"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";

import { useTranslation } from "@/shared/i18n";
import { uiAttributes } from "@asol/ui-registry-core";

export const LOGIN_SUCCESS_TOAST_EVENT = "asol-login-success-toast";
const LOGIN_SUCCESS_TOAST_STORAGE_KEY = "asol-login-success-toast";
const LOGIN_SUCCESS_TOAST_DURATION_MS = 4000;
type AuthToastKind = "login" | "registration" | "logout";

export function queueLoginSuccessToast() {
  queueAuthSuccessToast("login");
}

export function queueRegistrationSuccessToast() {
  queueAuthSuccessToast("registration");
}

export function queueLogoutSuccessToast() {
  queueAuthSuccessToast("logout");
}

function queueAuthSuccessToast(kind: AuthToastKind) {
  try {
    sessionStorage.setItem(LOGIN_SUCCESS_TOAST_STORAGE_KEY, kind);
    window.dispatchEvent(new Event(LOGIN_SUCCESS_TOAST_EVENT));
  } catch {
    window.dispatchEvent(new Event(LOGIN_SUCCESS_TOAST_EVENT));
  }
}

export function LoginSuccessToast() {
  const { t } = useTranslation();
  const [visible, setVisible] = React.useState(false);
  const [kind, setKind] = React.useState<AuthToastKind>("login");
  const timeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const showToast = () => {
      try {
        const storedKind = sessionStorage.getItem(LOGIN_SUCCESS_TOAST_STORAGE_KEY);
        if (
          storedKind === "login" ||
          storedKind === "registration" ||
          storedKind === "logout"
        ) {
          setKind(storedKind);
          sessionStorage.removeItem(LOGIN_SUCCESS_TOAST_STORAGE_KEY);
        }
      } catch {
        // Session storage can be unavailable in restricted browsing contexts.
      }
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      setVisible(true);
      timeoutRef.current = window.setTimeout(() => {
        setVisible(false);
        timeoutRef.current = null;
      }, LOGIN_SUCCESS_TOAST_DURATION_MS);
    };

    try {
      const storedKind = sessionStorage.getItem(LOGIN_SUCCESS_TOAST_STORAGE_KEY);
      if (
        storedKind === "login" ||
        storedKind === "registration" ||
        storedKind === "logout"
      ) {
        setKind(storedKind);
        showToast();
      }
    } catch {
      // Session storage can be unavailable in restricted browsing contexts.
    }

    window.addEventListener(LOGIN_SUCCESS_TOAST_EVENT, showToast);
    return () => {
      window.removeEventListener(LOGIN_SUCCESS_TOAST_EVENT, showToast);
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!visible) return null;

  const title = kind === "logout"
    ? t("auth.logout.successTitle")
    : kind === "registration"
      ? t("auth.registration.ready")
      : t("auth.login.welcomeBack");
  const message = kind === "logout"
    ? t("auth.logout.successMessage")
    : kind === "registration"
      ? t("auth.registration.successMessage")
      : t("auth.login.successMessage");

  return (
    <div {...uiAttributes({ uid: "auth.login-success-toast.div.3-P41ZSz", id: "auth.login-success-toast.div.3" })} id="auth.login-success-toast.div"
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-1/2 z-[80] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 items-start gap-3 rounded-lg border border-success/30 bg-surface px-4 py-3 text-on-surface shadow-lg"
    >
      <CheckCircle2 id="auth.login-success-toast.check-circle2" className="mt-0.5 h-5 w-5 shrink-0 text-success" />
      <div {...uiAttributes({ uid: "auth.login-success-toast.div.4-HjyFa5", id: "auth.login-success-toast.div.4" })} id="auth.login-success-toast.div.2" className="min-w-0">
        <p {...uiAttributes({ uid: "auth.login-success-toast.p.3-ASC9yy", id: "auth.login-success-toast.p.3" })} id="auth.login-success-toast.p" className="text-sm font-bold">{title}</p>
        <p {...uiAttributes({ uid: "auth.login-success-toast.p.4-SI14NZ", id: "auth.login-success-toast.p.4" })} id="auth.login-success-toast.p.2" className="text-xs">{message}</p>
      </div>
    </div>
  );
}
