import { visit } from "unist-util-visit";
import {
  FlameIcon,
  InfoIcon,
  PencilIcon,
  ClipboardListIcon,
  CheckCircle2Icon,
  CheckIcon,
  HelpCircleIcon,
  ListIcon,
  QuoteIcon,
  AlertTriangleIcon,
  XIcon,
  ZapIcon,
  BugIcon,
} from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const icons = new Map();
// notes
icons.set("note", PencilIcon);
// abstracts
icons.set("abstract", ClipboardListIcon);
icons.set("summary", ClipboardListIcon);
icons.set("tldr", ClipboardListIcon);
// info
icons.set("info", InfoIcon);
// to do
icons.set("todo", CheckCircle2Icon);
// tip
icons.set("tip", FlameIcon);
icons.set("hint", FlameIcon);
icons.set("important", FlameIcon);
// success
icons.set("success", CheckIcon);
icons.set("check", CheckIcon);
icons.set("done", CheckIcon);
// question
icons.set("question", HelpCircleIcon);
icons.set("help", HelpCircleIcon);
icons.set("faq", HelpCircleIcon);
// warning
icons.set("warning", AlertTriangleIcon);
icons.set("caution", AlertTriangleIcon);
icons.set("attention", AlertTriangleIcon);
// failure
icons.set("failure", XIcon);
icons.set("fail", XIcon);
icons.set("missing", XIcon);
// danger
icons.set("danger", ZapIcon);
icons.set("error", ZapIcon);
// bug
icons.set("bug", BugIcon);
// example
icons.set("example", ListIcon);
// quote
icons.set("quote", QuoteIcon);
icons.set("cite", QuoteIcon);

// Get first text from a blockquote
function getFirstText(node) {
  if (!node) return undefined;
  if (node.type === "text") return node.value;
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      const result = getFirstText(child);
      if (result) return result;
    }
  }
  return undefined;
}

export default function remarkObsidian() {
  function blockVisitor(node) {
    /*
    Callouts are blockquotes denoted by [!type].
    Blockquotes have paragraph children, who have text children.
    */
    const quote = getFirstText(node);

    if (quote.startsWith("[!")) {
      // we have a callout. check for titles
      let [title, ...content] = quote.split("\n");
      let callout = title.split(" ")[0].slice(2, -1);

      // get the icon
      let iconMarkup = renderToStaticMarkup(createElement(icons.get(callout)));
      let iconNode = {
        type: "html",
        value: iconMarkup,
      };
      let iconDiv = {
        type: "div",
        children: [iconNode],
        data: {
          hProperties: {
            className: "callout-icon",
          },
        },
      };

      // get the title
      let titleNode = {
        type: "text",
        value: title.split(" ").slice(1).join(" "),
      };
      let titleText = {
        type: "div",
        children: [titleNode, ...node.children[0].children.slice(1)],
        data: {
          hProperties: {
            className: "callout-title-inner",
          },
        },
      };

      // change the title to a div including icon and rest of text
      let titleDiv = {
        type: "div",
        children: [iconDiv, titleText],
        data: {
          hProperties: {
            className: "callout-title",
          },
        },
      };

      // get the content
      let contentNode = {
        type: "text",
        value: content.join("\n"),
      };

      let contentDiv = {
        type: "div",
        children: [
          ...(content.length > 0 ? [contentNode] : []),
          ...node.children.slice(1),
        ],
        data: {
          hProperties: {
            className: "callout-content",
          },
        },
      };

      // reformat block quote as div and add children
      node.type = "div";
      node.data = {
        hProperties: {
          className: "callout",
          callout: callout,
        },
      };
      if (contentDiv.children.length > 0)
        node.children = [titleDiv, contentDiv];
      else node.children = [titleDiv];
    }
  }

  function commentVisitor(node) {
    node.children = node.children.map((child) => {
      if (child.type === "text") {
        child.value = child.value.replace(/%%[^=]+%%/g, "");
      }
      return child;
    });
  }

  function highlightVisitor(node) {
    visit(node, "text", (child, index, parent) => {
      const regex = /==(.*?)==/g;
      let match;
      let parts = [];
      let lastIndex = 0;

      while ((match = regex.exec(child.value)) !== null) {
        if (match.index > lastIndex) {
          parts.push({
            type: "text",
            value: child.value.slice(lastIndex, match.index),
          });
        }
        parts.push({
          type: "html",
          value: `<span class="highlight">${match[1]}</span>`,
        });
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < child.value.length) {
        parts.push({ type: "text", value: child.value.slice(lastIndex) });
      }

      if (parts.length > 0) {
        parent.children.splice(index, 1, ...parts);
      }
    });
  }

  function transform(tree) {
    visit(tree, "blockquote", blockVisitor);
    visit(tree, "paragraph", commentVisitor);
    visit(tree, "paragraph", highlightVisitor);
  }

  return transform;
}
