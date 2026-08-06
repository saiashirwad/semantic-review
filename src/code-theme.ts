import type { ThemeRegistrationRaw } from "shiki";

/**
 * Neobrutalist code theme for dark code surfaces on the warm paper UI.
 *
 * Palette mirrors ui/src/app.css:
 *   paper cream · hot orange · mint · gold · sky · peach · stone
 * Tuned for #111 backgrounds, add/del row tints, and IBM Plex Mono.
 */
export const neobrutalTheme = {
  name: "neobrutal",
  type: "dark" as const,
  colors: {
    "editor.background": "#111111",
    "editor.foreground": "#F2EDE4",
    "editorLineNumber.foreground": "#5C564C",
    "editorLineNumber.activeForeground": "#A39A8C",
    "editor.selectionBackground": "#F54E0033",
    "editor.lineHighlightBackground": "#1A1A1A",
    "editorCursor.foreground": "#F54E00",
    "editor.findMatchBackground": "#F0C04044",
    "editor.findMatchHighlightBackground": "#F0C04022",
    "editorWhitespace.foreground": "#3A3530",
    "editorIndentGuide.background": "#2A2620",
    "editorIndentGuide.activeBackground": "#4A443A",
    "editorBracketMatch.background": "#F54E0022",
    "editorBracketMatch.border": "#F54E00",
    "diffEditor.insertedTextBackground": "#0C241866",
    "diffEditor.removedTextBackground": "#2A101066",
  },
  // `settings` is required by ThemeRegistrationRaw; tokenColors is the VS Code alias.
  settings: [
    // ── Defaults & comments ──────────────────────────────────
    {
      scope: ["comment", "punctuation.definition.comment", "string.comment"],
      settings: { foreground: "#6F6A5E", fontStyle: "italic" },
    },
    {
      scope: ["comment.block.documentation", "comment.block.documentation variable"],
      settings: { foreground: "#7A7468", fontStyle: "italic" },
    },

    // ── Keywords & storage ───────────────────────────────────
    {
      scope: [
        "keyword",
        "keyword.control",
        "keyword.operator.new",
        "keyword.operator.expression",
        "keyword.operator.cast",
        "keyword.operator.sizeof",
        "keyword.operator.logical.python",
        "storage",
        "storage.type",
        "storage.modifier",
      ],
      settings: { foreground: "#FF5E3A" },
    },
    {
      scope: [
        "keyword.control.import",
        "keyword.control.export",
        "keyword.control.from",
        "keyword.control.as",
        "keyword.other.import",
        "meta.import",
        "meta.export",
      ],
      settings: { foreground: "#FF5E3A" },
    },
    {
      scope: ["keyword.operator", "keyword.operator.assignment", "keyword.operator.comparison", "keyword.operator.arithmetic", "keyword.operator.logical"],
      settings: { foreground: "#A39A8C" },
    },
    {
      scope: ["storage.modifier.package", "storage.modifier.import", "storage.type.java"],
      settings: { foreground: "#F2EDE4" },
    },

    // ── Strings ──────────────────────────────────────────────
    {
      scope: [
        "string",
        "string.quoted",
        "string.template",
        "punctuation.definition.string",
        "string punctuation.section.embedded source",
      ],
      settings: { foreground: "#6FD3C0" },
    },
    {
      scope: ["string.regexp", "constant.regexp", "string.regexp punctuation.definition.string"],
      settings: { foreground: "#FB7185" },
    },
    {
      scope: ["constant.character.escape", "constant.other.character-class.escape", "string.regexp.character-class"],
      settings: { foreground: "#C4A5F0" },
    },
    {
      scope: [
        "punctuation.definition.template-expression",
        "punctuation.section.embedded",
        "meta.template.expression",
        "meta.embedded",
      ],
      settings: { foreground: "#FF5E3A" },
    },

    // ── Numbers, constants, booleans ─────────────────────────
    {
      scope: [
        "constant.numeric",
        "constant.language",
        "constant.language.boolean",
        "constant.language.null",
        "constant.language.undefined",
        "support.constant",
        "keyword.other.unit",
      ],
      settings: { foreground: "#FFAB70" },
    },
    {
      // True constants only — not `const foo` bindings (those stay as variables).
      scope: [
        "entity.name.constant",
        "variable.other.enummember",
        "constant.other",
      ],
      settings: { foreground: "#FFAB70" },
    },

    // ── Functions ────────────────────────────────────────────
    {
      scope: [
        "entity.name.function",
        "meta.function-call",
        "support.function",
        "keyword.other.special-method",
        "meta.function-call.generic",
        "variable.function",
      ],
      settings: { foreground: "#F0C040" },
    },
    {
      scope: ["entity.name.function.member", "support.function.member"],
      settings: { foreground: "#F0C040" },
    },

    // ── Types, classes, interfaces ───────────────────────────
    {
      scope: [
        "entity.name.type",
        "entity.name.class",
        "entity.name.namespace",
        "entity.other.inherited-class",
        "support.type",
        "support.class",
        "storage.type.cs",
        "storage.type.generic.cs",
        "storage.type.modifier.cs",
        "storage.type.variable.cs",
      ],
      settings: { foreground: "#A78BFA" },
    },
    {
      scope: ["entity.name.type.parameter", "variable.parameter"],
      settings: { foreground: "#F2EDE4" },
    },

    // ── Variables & properties ───────────────────────────────
    {
      scope: ["variable", "meta.definition.variable"],
      settings: { foreground: "#F2EDE4" },
    },
    {
      scope: ["variable.other", "variable.other.readwrite", "variable.other.object"],
      settings: { foreground: "#F2EDE4" },
    },
    {
      scope: [
        "variable.other.property",
        "variable.other.object.property",
        "support.variable.property",
        "meta.object-literal.key",
        "meta.object.member",
      ],
      settings: { foreground: "#E8D5B7" },
    },
    {
      scope: ["variable.language.this", "variable.language.super", "variable.language.self"],
      settings: { foreground: "#FF5E3A" },
    },

    // ── Tags, attributes (HTML/JSX/Svelte) ───────────────────
    {
      scope: ["entity.name.tag", "punctuation.definition.tag"],
      settings: { foreground: "#4ADE80" },
    },
    {
      scope: ["entity.other.attribute-name", "entity.other.attribute-name.html", "entity.other.attribute-name.id", "entity.other.attribute-name.class"],
      settings: { foreground: "#F0C040" },
    },
    {
      scope: ["punctuation.definition.tag.begin", "punctuation.definition.tag.end", "meta.tag"],
      settings: { foreground: "#7A7468" },
    },
    {
      scope: ["support.class.component", "meta.tag.custom entity.name.tag"],
      settings: { foreground: "#6FD3C0" },
    },

    // ── CSS ──────────────────────────────────────────────────
    {
      scope: [
        "support.type.property-name",
        "support.type.property-name.css",
        "meta.property-name",
        "source.css support.type.property-name",
        "source.scss support.type.property-name",
      ],
      settings: { foreground: "#E8D5B7" },
    },
    {
      scope: [
        "support.constant.property-value",
        "meta.property-value",
        "constant.other.color",
        "support.constant.color",
      ],
      settings: { foreground: "#6FD3C0" },
    },
    {
      scope: ["entity.other.attribute-name.pseudo-class", "entity.other.attribute-name.pseudo-element"],
      settings: { foreground: "#A78BFA" },
    },
    {
      scope: ["entity.name.tag.css", "entity.other.attribute-name.class.css", "entity.other.attribute-name.id.css"],
      settings: { foreground: "#F0C040" },
    },

    // ── JSON / YAML keys ─────────────────────────────────────
    {
      scope: [
        "support.type.property-name.json",
        "meta.structure.dictionary.json support.type.property-name",
        "source.yaml entity.name.tag",
      ],
      settings: { foreground: "#F0C040" },
    },

    // ── Markup (markdown) ────────────────────────────────────
    {
      scope: ["markup.heading", "entity.name.section", "markup.heading entity.name"],
      settings: { foreground: "#FF5E3A", fontStyle: "bold" },
    },
    {
      scope: ["markup.bold"],
      settings: { foreground: "#F2EDE4", fontStyle: "bold" },
    },
    {
      scope: ["markup.italic"],
      settings: { foreground: "#F2EDE4", fontStyle: "italic" },
    },
    {
      scope: ["markup.inline.raw", "markup.raw"],
      settings: { foreground: "#6FD3C0" },
    },
    {
      scope: ["markup.underline.link", "string.other.link"],
      settings: { foreground: "#8BB4F0", fontStyle: "underline" },
    },
    {
      scope: ["markup.list", "punctuation.definition.list"],
      settings: { foreground: "#F0C040" },
    },
    {
      scope: ["markup.quote"],
      settings: { foreground: "#7A7468", fontStyle: "italic" },
    },
    {
      scope: ["markup.inserted", "markup.inserted.diff"],
      settings: { foreground: "#4ADE80" },
    },
    {
      scope: ["markup.deleted", "markup.deleted.diff"],
      settings: { foreground: "#FF6B6B" },
    },
    {
      scope: ["markup.changed", "markup.changed.diff"],
      settings: { foreground: "#F0C040" },
    },

    // ── Punctuation ──────────────────────────────────────────
    {
      scope: [
        "punctuation",
        "punctuation.separator",
        "punctuation.terminator",
        "meta.brace",
        "meta.bracket",
      ],
      settings: { foreground: "#8F887C" },
    },
    {
      scope: ["punctuation.accessor", "punctuation.separator.period", "punctuation.separator.dot"],
      settings: { foreground: "#8F887C" },
    },

    // ── Support / builtins ───────────────────────────────────
    {
      scope: ["support", "support.variable", "support.variable.property.process"],
      settings: { foreground: "#8BB4F0" },
    },
    {
      scope: ["support.type.primitive", "support.type.builtin"],
      settings: { foreground: "#A78BFA" },
    },

    // ── Invalid ──────────────────────────────────────────────
    {
      scope: ["invalid", "invalid.illegal"],
      settings: { foreground: "#FF6B6B" },
    },
    {
      scope: ["invalid.deprecated"],
      settings: { foreground: "#FFAB70", fontStyle: "italic" },
    },
  ],
} satisfies ThemeRegistrationRaw;

export const CODE_THEME_NAME = neobrutalTheme.name;
