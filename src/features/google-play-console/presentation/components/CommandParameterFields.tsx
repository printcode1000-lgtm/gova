"use client";

import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import type {
  BuildCommandCatalogEntry,
  BuildParameterName,
} from "@asol/release-core/console";

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
export function Parameter({ id, command, schema, value, t, onChange }: {
  command: BuildCommandCatalogEntry;
  schema: BuildCommandCatalogEntry["parameters"][number];
  value: unknown;
  t: (key: string) => string;
  onChange: (id: string, name: BuildParameterName, value: unknown) => void;
} & { id?: string }) {
  const help = command.id === "cap-build" || command.id === "release-android" ? (
    <p className="text-xs leading-5 text-on-surface-variant">
      {t(`releaseConsole.capBuild.${schema.name}`)}
    </p>
  ) : null;
  if (schema.type === "boolean") return (
    <div id={id} className="space-y-1">
      <label className="flex gap-2">
        <input type="checkbox" checked={value === true}
          onChange={(event) => onChange(command.id, schema.name, event.target.checked)} />
        {t(`releaseConsole.parameters.${schema.name}`)}
      </label>
      {help}
    </div>
  );
  if (schema.type === "string") return <Textarea id={id} value={String(value ?? "")}
    placeholder={t(`releaseConsole.parameters.${schema.name}`)}
    onChange={(event) => onChange(command.id, schema.name, event.target.value)} />;
  if (schema.type === "enum" && schema.name === "nativeVersionAction") return (
    <fieldset id={id} className="space-y-2">
      <legend className="font-medium">{t("releaseConsole.parameters.nativeVersionAction")}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {schema.values.map((item) => {
          const selected = value === item;
          return <label id={id} key={item}
            className={` rounded-lg border p-3 transition-colors ${selected
              ? "border-primary bg-primary/10 ring-1 ring-primary"
              : "bg-surface"}`}>
            <span className="flex items-start gap-2">
              <input type="radio" name={`${command.id}-${schema.name}`}
                value={item} checked={selected}
                onChange={() => onChange(command.id, schema.name, item)} />
              <span className="font-medium">{t(`releaseConsole.parameterValues.${item}`)}</span>
            </span>
          </label>;
        })}
      </div>
      {help}
    </fieldset>
  );
  if (schema.type === "enum") return (
    <div id={id} className="space-y-1">
      <label className="block font-medium" htmlFor={`${command.id}-${schema.name}`}>
        {t(`releaseConsole.parameters.${schema.name}`)}
      </label>
      <select id={`${command.id}-${schema.name}`}
        className="h-10 w-full rounded-md border bg-background px-3"
        value={String(value ?? "")}
        onChange={(event) => onChange(command.id, schema.name, event.target.value)}>
        <option value="">{t(`releaseConsole.parameters.${schema.name}`)}</option>
        {schema.values.map((item) => (
          <option key={item} value={item}>
            {t(`releaseConsole.parameterValues.${item}`)}
          </option>
        ))}
      </select>
      {help}
    </div>
  );
  if (schema.type === "number") return <Input id={id} type="number" min={schema.min} max={schema.max}
    value={typeof value === "number" ? value : ""}
    onChange={(event) => onChange(command.id, schema.name, Number(event.target.value))} />;
  return <Textarea id={id} placeholder={t("releaseConsole.parameters.releaseNotes")}
    onChange={(event) => onChange(command.id, schema.name, { en: event.target.value })} />;
}
