/*
Callout icons from Lucide 1.72.0 (https://lucide.dev), kept as data so they
render as hast nodes: no React at runtime and no raw HTML in the output.

ISC License

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part
of Feather (MIT). All other copyright (c) for Lucide are held by Lucide
Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/

const path = (d) => ["path", { d }];
const dot = ["circle", { cx: 12, cy: 12, r: 10 }];

// Class names (including lucide's legacy aliases) then shapes, as lucide-react
// rendered them, so the markup is unchanged
const pencil = [
  "lucide-pencil",
  path(
    "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
  ),
  path("m15 5 4 4"),
];
const clipboardList = [
  "lucide-clipboard-list",
  ["rect", { width: 8, height: 4, x: 8, y: 2, rx: 1, ry: 1 }],
  path(
    "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
  ),
  path("M12 11h4"),
  path("M12 16h4"),
  path("M8 11h.01"),
  path("M8 16h.01"),
];
const info = ["lucide-info", dot, path("M12 16v-4"), path("M12 8h.01")];
const circleCheck = [
  "lucide-circle-check lucide-check-circle-2",
  dot,
  path("m16 9-5.5 5.5L8 12"),
];
const flame = [
  "lucide-flame",
  path(
    "M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4",
  ),
];
const check = ["lucide-check", path("M20 6 9 17l-5-5")];
const circleHelp = [
  "lucide-circle-question-mark lucide-help-circle lucide-circle-help",
  dot,
  path("M9 9.5a3 2.5 0 016 0c0 2-2 2-3 3.5"),
  path("M12 17h.01"),
];
const triangleAlert = [
  "lucide-triangle-exclamation-point lucide-alert-triangle lucide-triangle-alert",
  path(
    "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
  ),
  path("M12 9v4"),
  path("M12 17h.01"),
];
const x = ["lucide-x", path("M18 6 6 18"), path("m6 6 12 12")];
const zap = [
  "lucide-zap",
  path(
    "M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z",
  ),
];
const bug = [
  "lucide-bug",
  path("M12 20v-9"),
  path("M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z"),
  path("M14.12 3.88 16 2"),
  path("M21 21a4 4 0 0 0-3.81-4"),
  path("M21 5a4 4 0 0 1-3.55 3.97"),
  path("M22 13h-4"),
  path("M3 21a4 4 0 0 1 3.81-4"),
  path("M3 5a4 4 0 0 0 3.55 3.97"),
  path("M6 13H2"),
  path("m8 2 1.88 1.88"),
  path("M9 7.13V6a3 3 0 1 1 6 0v1.13"),
];
const list = [
  "lucide-list",
  path("M3 5h.01"),
  path("M3 12h.01"),
  path("M3 19h.01"),
  path("M8 5h13"),
  path("M8 12h13"),
  path("M8 19h13"),
];
const quoteMark =
  "a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z";
const quote = [
  "lucide-quote",
  path(`M16 3${quoteMark}`),
  path(`M5 3${quoteMark}`),
];

export const icons = new Map([
  ["note", pencil],
  ["abstract", clipboardList],
  ["summary", clipboardList],
  ["tldr", clipboardList],
  ["info", info],
  ["todo", circleCheck],
  ["tip", flame],
  ["hint", flame],
  ["important", flame],
  ["success", check],
  ["check", check],
  ["done", check],
  ["question", circleHelp],
  ["help", circleHelp],
  ["faq", circleHelp],
  ["warning", triangleAlert],
  ["caution", triangleAlert],
  ["attention", triangleAlert],
  ["failure", x],
  ["fail", x],
  ["missing", x],
  ["danger", zap],
  ["error", zap],
  ["bug", bug],
  ["example", list],
  ["quote", quote],
  ["cite", quote],
]);

// A fresh node per callout, so later plugins can't edit one shared icon
export const iconNode = ([classes, ...shapes]) => ({
  type: "icon",
  data: {
    hName: "svg",
    hProperties: {
      xmlns: "http://www.w3.org/2000/svg",
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className: ["lucide", ...classes.split(" ")],
      ariaHidden: "true",
    },
    hChildren: shapes.map(([tagName, properties]) => ({
      type: "element",
      tagName,
      properties: { ...properties },
      children: [],
    })),
  },
});
