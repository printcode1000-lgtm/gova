import { queueLogoutSuccessToast } from "@/features/auth/ui";

export function executeSidebarLogout({
  closeSidebar,
  logout,
  replaceRoute,
}: {
  closeSidebar: () => void;
  logout: () => Promise<unknown>;
  replaceRoute: (href: string) => void;
}) {
  closeSidebar();
  queueLogoutSuccessToast();
  replaceRoute("/home");

  void logout().catch((error) => {
    console.warn("[AppSidebar] Logout failed.", error);
  });
}
