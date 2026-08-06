import type { ThemeRegistrationRaw } from "shiki";
import { palette as p } from "./palette.ts";

/** Compact scope → color map. Roles only — not a full VS Code theme. */
function role(scope: string | string[], foreground: string, fontStyle?: string) {
  return {
    scope,
    settings: fontStyle ? { foreground, fontStyle } : { foreground },
  };
}

/**
 * Neobrutalist Shiki theme for dark code surfaces on the warm paper UI.
 * Colors come from `palette.ts` so UI CSS and syntax stay aligned.
 */
export const neobrutalTheme = {
  name: "neobrutal",
  type: "dark" as const,
  colors: {
    "editor.background": p.codeBg,
    "editor.foreground": p.codeFg,
    "editorLineNumber.foreground": p.codeLine,
    "editorLineNumber.activeForeground": p.codeMuted,
    "editor.selectionBackground": `${p.accent}33`,
    "editor.lineHighlightBackground": "#1a1a1a",
    "editorCursor.foreground": p.accent,
    "editor.findMatchBackground": `${p.function}44`,
    "editor.findMatchHighlightBackground": `${p.function}22`,
    "diffEditor.insertedTextBackground": `${p.addBg}66`,
    "diffEditor.removedTextBackground": `${p.delBg}66`,
  },
  settings: [
    role(["comment", "punctuation.definition.comment", "string.comment"], p.codeFaint, "italic"),
    role(
      [
        "keyword",
        "keyword.control",
        "keyword.operator.new",
        "keyword.operator.expression",
        "storage",
        "storage.type",
        "storage.modifier",
        "variable.language",
      ],
      p.keyword,
    ),
    role(
      ["keyword.operator", "keyword.operator.assignment", "keyword.operator.comparison", "keyword.operator.arithmetic"],
      p.codeMuted,
    ),
    role(
      ["string", "string.quoted", "string.template", "punctuation.definition.string", "markup.inline.raw", "markup.raw"],
      p.string,
    ),
    role(["string.regexp", "constant.regexp"], p.regex),
    role(["constant.character.escape", "constant.other.character-class.escape"], p.escape),
    role(
      ["constant.numeric", "constant.language", "constant.language.boolean", "support.constant", "entity.name.constant"],
      p.number,
    ),
    role(
      ["entity.name.function", "meta.function-call", "support.function", "variable.function"],
      p.function,
    ),
    role(
      ["entity.name.type", "entity.name.class", "entity.name.namespace", "support.type", "support.class", "support.type.primitive"],
      p.type,
    ),
    role(["variable", "variable.other", "variable.parameter", "meta.definition.variable"], p.codeFg),
    role(
      ["variable.other.property", "support.variable.property", "meta.object-literal.key"],
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
    role(["markup.inserted"], p.tag),
    role(["markup.deleted"], p.invalid),
    role(["markup.changed"], p.function),
    role(["punctuation", "meta.brace", "meta.bracket"], p.codePunct),
    role(["support", "support.variable"], p.support),
    role(["invalid", "invalid.illegal"], p.invalid),
  ],
} satisfies ThemeRegistrationRaw;

export const CODE_THEME_NAME = neobrutalTheme.name;
