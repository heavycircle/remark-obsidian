import type { Element } from "hast";
import type { Root } from "mdast";
import type { Plugin } from "unified";

/**
 * An icon in Lucide's format, as the `lucide` package exports them:
 * `import { FlaskConical } from "lucide"`.
 */
export type IconNode = [
  tag: string,
  attrs: Record<string, string | number | undefined>,
][];

export interface CalloutDefinition {
  /**
   * A Lucide icon node or a hast `<svg>` element. Defaults to the overridden
   * type's icon, or a pencil for a new type.
   */
  icon?: IconNode | Element;
  /** Title for callouts that don't write one. Defaults to the type's name. */
  title?: string;
}

export interface Options {
  /**
   * Callout types by name (case-insensitive): a definition adds or overrides
   * a type, a string makes it an alias of another type, and `false` turns a
   * built-in type off.
   */
  callouts?: Record<string, CalloutDefinition | string | false>;
}

/**
 * Obsidian callouts, `%%comments%%` and `==highlights==` for remark.
 */
declare const remarkObsidian: Plugin<[Options?], Root>;
export default remarkObsidian;
