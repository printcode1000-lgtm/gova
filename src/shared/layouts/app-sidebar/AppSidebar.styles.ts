import { cn } from "@/shared/utils";

export function createAppSidebarStyles(resolvedScheme: "light" | "dark") {
  const sidebarTone =
    resolvedScheme === "dark"
      ? "text-primary font-normal"
      : "text-blue-900 font-normal";
  const sidebarActiveTone = "asol-nav-pill-active ring-1 ring-primary/20";
  const sidebarSurface =
    resolvedScheme === "dark" ? "bg-surface-bright" : "bg-[#F8FBFF]";
  const sidebarPressSurface =
    resolvedScheme === "dark"
      ? "active:bg-surface-variant"
      : "active:bg-blue-200";
  const sidebarControlClass = cn(
    "asol-control w-full min-w-0 flex items-center justify-start gap-3 rounded-lg text-sm font-medium leading-5 active:opacity-90",
    sidebarSurface,
    sidebarTone,
    sidebarPressSurface,
  );

  return {
    sidebarActiveTone,
    sidebarControlClass,
    sidebarIconClass: "w-5 h-5 shrink-0",
    sidebarPressSurface,
    sidebarSmallIconClass: "h-4 w-4 shrink-0",
    sidebarSurface,
    sidebarTone,
  };
}
