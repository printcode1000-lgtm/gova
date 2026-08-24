import type { ShareContent } from "./share-content";
import { publicEnv } from "@/core/config/public-env";

const FALLBACK_PUBLIC_ORIGIN = "https://gova-swart.vercel.app";

function normalizedOrigin(value: string | undefined): string {
  const candidate = value?.trim() || FALLBACK_PUBLIC_ORIGIN;
  try {
    const url = new URL(candidate);
    return url.origin;
  } catch {
    return FALLBACK_PUBLIC_ORIGIN;
  }
}

export const PUBLIC_SHARE_ORIGIN = normalizedOrigin(publicEnv.publicWebOrigin);
export const ASOL_ANDROID_PACKAGE = "hgh.asol.app";
export const GOOGLE_PLAY_INSTALL_URL = `https://play.google.com/store/apps/details?id=${ASOL_ANDROID_PACKAGE}`;
export const APPLE_APP_STORE_INSTALL_URL = publicEnv.appStoreUrl;

export function buildProductShareUrl(productId: string): string {
  const url = new URL("/s/product", PUBLIC_SHARE_ORIGIN);
  url.searchParams.set("mode", "view");
  url.searchParams.set("productId", productId.trim());
  return url.toString();
}

export function buildProfileShareUrl(uid: string): string {
  const url = new URL("/s/profile", PUBLIC_SHARE_ORIGIN);
  url.searchParams.set("mode", "preview");
  url.searchParams.set("uid", uid.trim());
  return url.toString();
}

export function buildShareMessage(content: ShareContent): string {
  return [content.title.trim(), content.text.trim(), content.url.trim()]
    .filter(Boolean)
    .join("\n");
}

export function buildWhatsAppShareUrl(content: ShareContent): string {
  const url = new URL("https://wa.me/");
  url.searchParams.set("text", buildShareMessage(content));
  return url.toString();
}

export function buildFacebookShareUrl(content: ShareContent): string {
  const url = new URL("https://www.facebook.com/sharer/sharer.php");
  url.searchParams.set("u", content.url);
  return url.toString();
}

export const INSTAGRAM_HOME_URL = "https://www.instagram.com/";

/**
 * App/Universal Links are accepted only for the two public share surfaces.
 * Returning a reconstructed internal route prevents an external URL from
 * becoming an arbitrary router navigation inside the native shell.
 */
export function internalRouteFromPublicShareUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.origin !== PUBLIC_SHARE_ORIGIN) return null;

  if (url.pathname === "/s/product") {
    const productId = url.searchParams.get("productId")?.trim();
    if (!productId) return null;
    return `/product?mode=view&productId=${encodeURIComponent(productId)}`;
  }

  if (url.pathname === "/s/profile") {
    const uid = url.searchParams.get("uid")?.trim();
    if (!uid) return null;
    return `/profile?mode=preview&uid=${encodeURIComponent(uid)}`;
  }

  return null;
}
