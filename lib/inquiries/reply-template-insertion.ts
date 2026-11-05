/** Insert without replacing selected text or changing the surrounding draft. */
export function insertReplyTemplateText(body: string, text: string, position = body.length) {
  if (body.length + text.length > 10000) {
    throw new Error("挿入すると回答本文が10,000文字を超えます。本文を短くしてから挿入してください。");
  }
  const start = Number.isFinite(position) ? Math.max(0, Math.min(body.length, Math.trunc(position))) : body.length;
  return { body: body.slice(0, start) + text + body.slice(start), caret: start + text.length };
}
