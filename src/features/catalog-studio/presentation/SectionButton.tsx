import { cn } from "@/shared/utils";
import { uiAttributes } from "@asol/ui-registry-core";

export function SectionButton({ id,
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
} & { id?: string }) {
  return (
    <button {...uiAttributes({ uid: "catalog-studio.section-button.button-KHZ2if", id: "catalog-studio.section-button.button" })} id={id}
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
