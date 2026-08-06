import { z } from "zod";

export const ReviewCommentSchema = z.object({
  ref: z.string(),
  quote: z.string().optional(),
  text: z.string(),
  backend: z.string().optional(),
});

export const ReviewResultSchema = z.object({
  comments: z.array(ReviewCommentSchema).default([]),
  overall: z.string().default(""),
  notes: z
    .array(z.object({ backend: z.string(), items: z.array(z.string()) }))
    .optional(),
});

export type ReviewComment = z.infer<typeof ReviewCommentSchema>;
export type ReviewResult = z.infer<typeof ReviewResultSchema>;

// Kept platform-neutral (no node APIs) — the browser bundle in ui/ imports
// this directly so exported reports can format feedback client-side.
export function formatReview(result: ReviewResult, multiTab: boolean): string {
  const lines: string[] = [];
  const notes = result.notes ?? [];
  if (result.comments.length === 0 && !result.overall) {
    lines.push("Review complete: approved, no comments.");
  } else {
    lines.push(`Review feedback (${result.comments.length} comment${result.comments.length === 1 ? "" : "s"}):`);
    result.comments.forEach((comment, index) => {
      const tag = multiTab && comment.backend ? `[${comment.backend}] ` : "";
      lines.push("", `${index + 1}. ${tag}${comment.ref}`);
      if (comment.quote) lines.push(...comment.quote.split("\n").map((line) => `   > ${line}`));
      lines.push(...comment.text.split("\n").map((line) => `   ${line}`));
    });
    if (result.overall) lines.push("", `Overall: ${result.overall}`);
  }
  for (const note of notes) {
    lines.push("", multiTab ? `Agent's notes [${note.backend}]:` : "Agent's notes:");
    lines.push(...note.items.map((item) => `- ${item}`));
  }
  return lines.join("\n");
}
