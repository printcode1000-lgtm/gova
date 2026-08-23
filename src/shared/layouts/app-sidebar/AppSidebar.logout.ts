import { queueLogoutSuccessToast } from "@/features/auth/ui";

export function executeSidebarLogout({
  clearQueryCache,
  closeSidebar,
  logout,
  replaceRoute,
}: {
  clearQueryCache: () => void;
  closeSidebar: () => void;
  logout: () => Promise<unknown>;
  replaceRoute: (href: string) => void;
}) {
  closeSidebar();
  queueLogoutSuccessToast();
  replaceRoute("/home");
  clearQueryCache();

  void logout().catch((error) => {
    console.warn("[AppSidebar] Logout failed.", error);
  });
}
