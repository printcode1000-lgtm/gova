/**
 * Copy on `/dev/cloud-accounts` is data, not JSX: a sentence is a list of parts,
 * so a derived value (a command, a project, a package) can sit inside Arabic
 * prose with its own direction and emphasis without the component restating it.
 */
export type RichTextPart =
  | string
  | { readonly ltr: string }
  | { readonly code: string }
  | { readonly strong: string };

export type RichText = readonly RichTextPart[];

/** Joins parts with a separator part between each pair. */
export function joinRichText(
  parts: readonly RichTextPart[],
  separator: RichTextPart,
): RichText {
  return parts.flatMap((part, index) => (index === 0 ? [part] : [separator, part]));
}
