"use client";

import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import type {
  BuildCommandCatalogEntry,
  BuildParameterName,
} from "@asol/release-core/console";
import { uiAttributes } from "@asol/ui-registry-core";

/** Documentation row inside an expanded command card. */
export function Doc({ label, value }: { label: string; value: string }) {
  return <div {...uiAttributes({ uid: "google-play-console.command-parameter-fields.div-l1vmU9", id: "google-play-console.command-parameter-fields.div" })}><strong {...uiAttributes({ uid: "google-play-console.command-parameter-fields.strong-Q3pJFM", id: "google-play-console.command-parameter-fields.strong" })}>{label}</strong><p {...uiAttributes({ uid: "google-play-console.command-parameter-fields.p-B8Pw7k", id: "google-play-console.command-parameter-fields.p" })} className="text-on-surface-variant">{value}</p></div>;
}

/** Extra guidance shown only for the `cap-build` command. */
export function CapBuildGuide({ t }: { t: (key: string) => string }) {
  return <div {...uiAttributes({ uid: "google-play-console.command-parameter-fields.div.2-DQ41oF", id: "google-play-console.command-parameter-fields.div.2" })} className="space-y-2 border-s-4 border-primary bg-muted/40 p-3 text-sm">
    <h3 {...uiAttributes({ uid: "google-play-console.command-parameter-fields.h3-ZYQYI1", id: "google-play-console.command-parameter-fields.h3" })} className="font-semibold">
      {t("releaseConsole.capBuild.guideTitle")}
    </h3>
    <p {...uiAttributes({ uid: "google-play-console.command-parameter-fields.p.2-WDpk0J", id: "google-play-console.command-parameter-fields.p.2" })} className="text-on-surface-variant">{t("releaseConsole.capBuild.guideBody")}</p>
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
    <p {...uiAttributes({ uid: "google-play-console.command-parameter-fields.p.3-JnM7i5", id: "google-play-console.command-parameter-fields.p.3" })} className="text-xs leading-5 text-on-surface-variant">
      {t(`releaseConsole.capBuild.${schema.name}`)}
    </p>
  ) : null;
  if (schema.type === "boolean") return (
    <div {...uiAttributes({ uid: "google-play-console.command-parameter-fields.div.3-1wiW7y", id: "google-play-console.command-parameter-fields.div.3" })} id={id} className="space-y-1">
      <label {...uiAttributes({ uid: "google-play-console.command-parameter-fields.label-05WwoK", id: "google-play-console.command-parameter-fields.label" })} className="flex gap-2">
        <input {...uiAttributes({ uid: "google-play-console.command-parameter-fields.input-YBy1ty", id: "google-play-console.command-parameter-fields.input" })} type="checkbox" checked={value === true}
          onChange={(event) => onChange(command.id, schema.name, event.target.checked)} />
        {t(`releaseConsole.parameters.${schema.name}`)}
      </label>
      {help}
    </div>
  );
  if (schema.type === "string") return <Textarea ui={{ uid: "google-play-console.command-parameter-fields.textarea-jQ18t5", id: "google-play-console.command-parameter-fields.textarea" }} id={id} value={String(value ?? "")}
    placeholder={t(`releaseConsole.parameters.${schema.name}`)}
    onChange={(event) => onChange(command.id, schema.name, event.target.value)} />;
  if (schema.type === "enum" && schema.name === "nativeVersionAction") return (
    <fieldset {...uiAttributes({ uid: "google-play-console.command-parameter-fields.fieldset-pJdhw5", id: "google-play-console.command-parameter-fields.fieldset" })} id={id} className="space-y-2">
      <legend {...uiAttributes({ uid: "google-play-console.command-parameter-fields.legend-L9sgqY", id: "google-play-console.command-parameter-fields.legend" })} className="font-medium">{t("releaseConsole.parameters.nativeVersionAction")}</legend>
      <div {...uiAttributes({ uid: "google-play-console.command-parameter-fields.div.4-Oi2HST", id: "google-play-console.command-parameter-fields.div.4" })} className="grid gap-2 sm:grid-cols-2">
        {schema.values.map((item) => {
          const selected = value === item;
          return <label id={id} key={item} {...uiAttributes({ uid: "google-play-console.command-parameter-fields.label.2-H5IZQ9", id: "google-play-console.command-parameter-fields.label.2" })}
            className={` rounded-lg border p-3 transition-colors ${selected
              ? "border-primary bg-primary/10 ring-1 ring-primary"
              : "bg-surface"}`}>
            <span {...uiAttributes({ uid: "google-play-console.command-parameter-fields.span-9dSBVk", id: "google-play-console.command-parameter-fields.span" })} className="flex items-start gap-2">
              <input {...uiAttributes({ uid: "google-play-console.command-parameter-fields.input.2-0AEmsY", id: "google-play-console.command-parameter-fields.input.2" })} type="radio" name={`${command.id}-${schema.name}`}
                value={item} checked={selected}
                onChange={() => onChange(command.id, schema.name, item)} />
              <span {...uiAttributes({ uid: "google-play-console.command-parameter-fields.span.2-UH77Zn", id: "google-play-console.command-parameter-fields.span.2" })} className="font-medium">{t(`releaseConsole.parameterValues.${item}`)}</span>
            </span>
          </label>;
        })}
      </div>
      {help}
    </fieldset>
  );
  if (schema.type === "enum") return (
    <div {...uiAttributes({ uid: "google-play-console.command-parameter-fields.div.5-s1OL62", id: "google-play-console.command-parameter-fields.div.5" })} id={id} className="space-y-1">
      <label {...uiAttributes({ uid: "google-play-console.command-parameter-fields.label.3-DGTa6u", id: "google-play-console.command-parameter-fields.label.3" })} className="block font-medium" htmlFor={`${command.id}-${schema.name}`}>
        {t(`releaseConsole.parameters.${schema.name}`)}
      </label>
      <select {...uiAttributes({ uid: "google-play-console.command-parameter-fields.select-KcB7So", id: "google-play-console.command-parameter-fields.select" })} id={`${command.id}-${schema.name}`}
        className="h-10 w-full rounded-md border bg-background px-3"
        value={String(value ?? "")}
        onChange={(event) => onChange(command.id, schema.name, event.target.value)}>
        <option {...uiAttributes({ uid: "google-play-console.command-parameter-fields.option-fdBnM3", id: "google-play-console.command-parameter-fields.option" })} value="">{t(`releaseConsole.parameters.${schema.name}`)}</option>
        {schema.values.map((item) => (
          <option key={item} {...uiAttributes({ uid: "google-play-console.command-parameter-fields.option.2-FO07v9", id: "google-play-console.command-parameter-fields.option.2" })} value={item}>
            {t(`releaseConsole.parameterValues.${item}`)}
          </option>
        ))}
      </select>
      {help}
    </div>
  );
  if (schema.type === "number") return <Input ui={{ uid: "google-play-console.command-parameter-fields.input.3-I5yUKY", id: "google-play-console.command-parameter-fields.input.3" }} id={id} type="number" min={schema.min} max={schema.max}
    value={typeof value === "number" ? value : ""}
    onChange={(event) => onChange(command.id, schema.name, Number(event.target.value))} />;
  return <Textarea ui={{ uid: "google-play-console.command-parameter-fields.textarea.2-pEJKM4", id: "google-play-console.command-parameter-fields.textarea.2" }} id={id} placeholder={t("releaseConsole.parameters.releaseNotes")}
    onChange={(event) => onChange(command.id, schema.name, { en: event.target.value })} />;
}
