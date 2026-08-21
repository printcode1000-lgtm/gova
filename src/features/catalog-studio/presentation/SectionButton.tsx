import { cn } from "@/lib/utils";

export function SectionButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-surface-bright text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
}
