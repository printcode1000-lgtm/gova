"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  BuildCommandCatalogEntry,
  BuildParameterName,
} from "@/modules/release-commands/domain/build-command-catalog";

/** Documentation row inside an expanded command card. */
export function Doc({ label, value }: { label: string; value: string }) {
  return <div><strong>{label}</strong><p className="text-on-surface-variant">{value}</p></div>;
}

/** Extra guidance shown only for the `cap-build` command. */
export function CapBuildGuide({ t }: { t: (key: string) => string }) {
  return <div className="space-y-2 border-s-4 border-primary bg-muted/40 p-3 text-sm">
    <h3 className="font-semibold">
      {t("releaseConsole.capBuild.guideTitle")}
    </h3>
    <p className="text-on-surface-variant">{t("releaseConsole.capBuild.guideBody")}</p>
  </div>;
}

/** One input rendered from a command's parameter schema. */
export function Parameter({ command, schema, value, t, onChange }: {
  command: BuildCommandCatalogEntry;
  schema: BuildCommandCatalogEntry["parameters"][number];
  value: unknown;
  t: (key: string) => string;
  onChange: (id: string, name: BuildParameterName, value: unknown) => void;
}) {
  const help = command.id === "cap-build" ? (
    <p className="text-xs leading-5 text-on-surface-variant">
      {t(`releaseConsole.capBuild.${schema.name}`)}
    </p>
  ) : null;
  if (schema.type === "boolean") return (
    <div className="space-y-1">
      <label className="flex gap-2">
        <input type="checkbox" checked={value === true}
          onChange={(event) => onChange(command.id, schema.name, event.target.checked)} />
        {t(`releaseConsole.parameters.${schema.name}`)}
      </label>
      {help}
    </div>
  );
  if (schema.type === "string") return <Textarea value={String(value ?? "")}
    placeholder={t(`releaseConsole.parameters.${schema.name}`)}
    onChange={(event) => onChange(command.id, schema.name, event.target.value)} />;
  if (schema.type === "enum") return (
    <div className="space-y-1">
      <label className="block font-medium" htmlFor={`${command.id}-${schema.name}`}>
        {t(`releaseConsole.parameters.${schema.name}`)}
      </label>
      <select id={`${command.id}-${schema.name}`}
        className="h-10 w-full rounded-md border bg-background px-3"
        value={String(schema.name === "otaSource" ? value ?? "publish-new" : value ?? "")}
        onChange={(event) => onChange(command.id, schema.name, event.target.value)}>
        {schema.name !== "otaSource"
          ? <option value="">{t(`releaseConsole.parameters.${schema.name}`)}</option>
          : null}
        {schema.values.map((item) => <option key={item}>{t(`releaseConsole.parameterValues.${item}`)}</option>)}
      </select>
      {help}
    </div>
  );
  if (schema.type === "number") return <Input type="number" min={schema.min} max={schema.max}
    value={typeof value === "number" ? value : ""}
    onChange={(event) => onChange(command.id, schema.name, Number(event.target.value))} />;
  return <Textarea placeholder={t("releaseConsole.parameters.releaseNotes")}
    onChange={(event) => onChange(command.id, schema.name, { en: event.target.value })} />;
}
