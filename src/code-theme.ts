import { palette as p } from "./palette.ts";

/**
 * Theme shape accepted by Pierre's `registerCustomTheme` (VS Code / TextMate style).
 * Defined locally so we don't depend on the `shiki` package at the app layer.
 */
export type ThemeRegistrationRaw = {
  name: string;
  type?: "dark" | "light";
  colors?: Record<string, string>;
  settings?: Array<{
    name?: string;
    scope?: string | string[];
    settings: { foreground?: string; background?: string; fontStyle?: string };
  }>;
};

/** Compact scope → color map. Roles only — not a full VS Code theme. */
function role(scope: string | string[], foreground: string, fontStyle?: string) {
  return {
    scope,
    settings: fontStyle ? { foreground, fontStyle } : { foreground },
  };
}

/**
 * Neobrutalist theme for Pierre code/diff surfaces on the warm paper UI.
 * Poster-bright roles from `palette.ts` — high contrast, hue-separated.
 */
export const neobrutalTheme = {
  name: "neobrutal",
  type: "dark" as const,
  colors: {
    "editor.background": p.codeBg,
    "editor.foreground": p.codeFg,
    "editorLineNumber.foreground": p.codeLine,
    "editorLineNumber.activeForeground": p.codeMuted,
    "editor.selectionBackground": `${p.accent}40`,
    "editor.lineHighlightBackground": "#161616",
    "editorCursor.foreground": p.accent,
    "editor.findMatchBackground": `${p.function}55`,
    "editor.findMatchHighlightBackground": `${p.function}28`,
    "diffEditor.insertedTextBackground": `${p.addBg}88`,
    "diffEditor.removedTextBackground": `${p.delBg}88`,
  },
  settings: [
    role(["comment", "punctuation.definition.comment", "string.comment"], p.codeFaint, "italic"),
    role(
      [
        "keyword",
        "keyword.control",
        "keyword.operator.new",
        "keyword.operator.expression",
        "keyword.operator.logical",
        "storage",
        "storage.type",
        "storage.modifier",
        "variable.language",
        "variable.language.this",
        "constant.language.undefined",
        "constant.language.null",
      ],
      p.keyword,
    ),
    role(
      [
        "keyword.operator",
        "keyword.operator.assignment",
        "keyword.operator.comparison",
        "keyword.operator.arithmetic",
        "keyword.operator.ternary",
      ],
      p.codeMuted,
    ),
    role(
      [
        "string",
        "string.quoted",
        "string.template",
        "string.template.js",
        "punctuation.definition.string",
        "markup.inline.raw",
        "markup.raw",
      ],
      p.string,
    ),
    role(["string.regexp", "constant.regexp"], p.regex),
    role(["constant.character.escape", "constant.other.character-class.escape"], p.escape),
    role(
      [
        "constant.numeric",
        "constant.language",
        "constant.language.boolean",
        "constant.language.true",
        "constant.language.false",
        "support.constant",
        "entity.name.constant",
      ],
      p.number,
    ),
    role(
      [
        "entity.name.function",
        "meta.function-call",
        "meta.function-call.generic",
        "support.function",
        "variable.function",
        "entity.name.function.member",
      ],
      p.function,
    ),
    role(
      [
        "entity.name.type",
        "entity.name.class",
        "entity.name.namespace",
        "entity.name.type.alias",
        "entity.name.type.interface",
        "entity.other.inherited-class",
        "support.type",
        "support.class",
        "support.type.primitive",
        "support.type.builtin",
      ],
      p.type,
    ),
    role(
      [
        "variable",
        "variable.other",
        "variable.parameter",
        "variable.other.readwrite",
        "meta.definition.variable",
        "meta.definition.parameter",
      ],
      p.codeFg,
    ),
    role(
      [
        "variable.other.property",
        "variable.other.object.property",
        "support.variable.property",
        "meta.object-literal.key",
        "meta.object.member",
      ],
      p.property,
    ),
    role(["entity.name.tag", "punctuation.definition.tag"], p.tag),
    role(["entity.other.attribute-name"], p.function),
    role(["support.class.component"], p.component),
    role(
      ["support.type.property-name", "support.type.property-name.css", "meta.property-name"],
      p.property,
    ),
    role(["support.constant.property-value", "constant.other.color"], p.string),
    role(["support.type.property-name.json", "source.yaml entity.name.tag"], p.function),
    role(["markup.heading", "entity.name.section"], p.keyword, "bold"),
    role(["markup.underline.link", "string.other.link"], p.support, "underline"),
    role(["markup.inserted"], p.addFg),
    role(["markup.deleted"], p.delFg),
    role(["markup.changed"], p.function),
    role(
      [
        "punctuation",
        "meta.brace",
        "meta.bracket",
        "punctuation.definition.parameters",
        "punctuation.definition.block",
        "punctuation.separator",
        "punctuation.terminator",
      ],
      p.codePunct,
    ),
    role(["support", "support.variable"], p.support),
    role(["invalid", "invalid.illegal", "invalid.deprecated"], p.invalid),
  ],
} satisfies ThemeRegistrationRaw;

export const CODE_THEME_NAME = neobrutalTheme.name;
