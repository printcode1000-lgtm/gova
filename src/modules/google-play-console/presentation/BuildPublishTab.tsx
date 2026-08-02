"use client";

import { Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { BuildCommandCatalogEntry } from "@/modules/release-commands/domain/build-command-catalog";

const categories = ["web-static", "ota", "native-android", "verification", "fastlane"] as const;

export function BuildPublishTab({
  catalog,
  confirmation,
  t,
  onConfirmationChange,
  onStart,
}: {
  catalog: readonly BuildCommandCatalogEntry[];
  confirmation: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  onConfirmationChange: (value: string) => void;
  onStart: (command: BuildCommandCatalogEntry) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="grid gap-3 rounded-md border bg-surface p-4 md:grid-cols-4">
        <Input placeholder={t("releaseConsole.build.confirmation")} value={confirmation} onChange={(event) => onConfirmationChange(event.target.value)} />
        <select className="h-10 rounded-md border bg-background px-3 text-sm"><option>R8</option><option>No R8</option></select>
        <select className="h-10 rounded-md border bg-background px-3 text-sm"><option>internal</option><option>alpha</option><option>beta</option><option>production</option></select>
        <Input type="number" min="0" max="1" step="0.05" placeholder={t("releaseConsole.build.rollout")} />
      </div>
      {categories.map((category) => {
        const commands = catalog.filter((command) => command.category === category);
        if (!commands.length) return null;
        return (
          <div key={category} className="rounded-md border bg-surface p-4">
            <h2 className="mb-3 text-sm font-semibold">{t(`releaseConsole.categories.${category}`)}</h2>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {commands.map((command) => (
                <Button key={command.id} type="button" variant={command.danger === "publishes-live" ? "destructive" : "outline"} onClick={() => onStart(command)} className="h-auto justify-start py-3 text-start">
                  <Play className="h-4 w-4" />
                  <span className="min-w-0">
                    <span className="block truncate">{command.script} {command.argv.join(" ")}</span>
                    <span className="block text-xs opacity-75">{t(`releaseConsole.danger.${command.danger}`)} - {command.estimatedDuration}</span>
                  </span>
                </Button>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
