import { visit } from "unist-util-visit";

const BLOCK_ID = /(^|\s)\^([A-Za-z0-9-]+)\s*$/;

const setId = (node, id) => {
  node.data ??= {};
  node.data.hProperties = { ...node.data.hProperties, id: `^${id}` };
};

// Takes a trailing "^id" off a paragraph, or returns undefined
function takeId(paragraph) {
  const children = paragraph.children;
  const last = children.at(-1);
  if (last?.type !== "text") return;
  const match = last.value.match(BLOCK_ID);
  if (!match) return;
  // "**bold**^id" has no space before the marker, so it isn't one
  const atStart = match.index === 0 && !match[1];
  if (atStart && children.length > 1 && children.at(-2).type !== "break")
    return;

  last.value = last.value.slice(0, match.index).trimEnd();
  if (!last.value) children.pop();
  while (children.at(-1)?.type === "break") children.pop();
  return match[2];
}

/*
"text ^id" gives the paragraph (or its list item) the id "^id", which
[[Page#^id]] links to. A paragraph that is only "^id" names the block before
it, as in Obsidian, for tables, lists, quotes and callouts.
*/
export function blockIds(tree) {
  visit(tree, "paragraph", (node, index, parent) => {
    if (!parent) return;
    const id = takeId(node);
    if (!id) return;
    if (node.children.length) {
      const item = parent.type === "listItem" && index === 0;
      setId(item ? parent : node, id);
      return;
    }
    const previous = parent.children[index - 1];
    // Nothing to name, so it stays as typed
    if (!previous) {
      node.children = [{ type: "text", value: `^${id}` }];
      return;
    }
    setId(previous, id);
    parent.children.splice(index, 1);
    return index;
  });
}
