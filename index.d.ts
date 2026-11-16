import type { Root } from "mdast";
import type { Plugin } from "unified";

/**
 * Obsidian callouts, `%%comments%%` and `==highlights==` for remark. Takes no
 * options.
 */
declare const remarkObsidian: Plugin<[], Root>;
export default remarkObsidian;
