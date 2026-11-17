import type { Element } from "hast";
import type { Root, RootContent } from "mdast";
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
  /**
   * The vault's files (notes and attachments), as paths from its root, with
   * optional aliases. Links then resolve as in Obsidian: exact path, else
   * the page whose path ends in the link (closest to the root first), else
   * an alias; unresolved links render as plain text. Without a list, the
   * link is taken as the path.
   */
  pages?: Array<string | Page>;
  /**
   * URL of a resolved path, without the `#heading` or `#^block` part (the
   * plugin appends it). Return `null` to render the link as plain text.
   * Defaults to `/` + the path without `.md`, URL-encoded.
   */
  url?: (path: string) => string | null | undefined;
  /**
   * Content of an embedded note (`![[note]]` alone in its paragraph), as
   * mdast. Return nothing to render the embed as a link instead. Without
   * this option, note embeds render as links.
   */
  embed?: (target: EmbedTarget) => Root | RootContent[] | null | undefined;
}

export interface Page {
  path: string;
  aliases?: string[];
}

export interface EmbedTarget {
  /** The page as written in the link. */
  page: string;
  /** The path it resolved to (see `pages`). */
  path: string;
  /** The last heading in `![[page#a#b]]`, as written. */
  heading?: string;
  /** The block id in `![[page#^id]]`, without the `^`. */
  block?: string;
}

/**
 * Obsidian callouts, `%%comments%%` and `==highlights==` for remark.
 */
declare const remarkObsidian: Plugin<[Options?], Root>;
export default remarkObsidian;
