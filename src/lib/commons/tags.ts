const TAG_PATTERN = /^[a-z0-9_]{1,32}$/;

export function normalizeCommonsTag(raw: string): string | null {
  const t = raw.trim().replace(/^#+/, '').toLowerCase();
  if (!t || !TAG_PATTERN.test(t)) return null;
  return t;
}

/** Returns normalized unique tags, or null when invalid. */
export function normalizeCommonsTags(raw: string[]): string[] | null {
  if (raw.length === 0 || raw.length > 3) return null;
  const out: string[] = [];
  for (const item of raw) {
    const t = normalizeCommonsTag(item);
    if (!t) return null;
    if (!out.includes(t)) out.push(t);
  }
  return out.length > 0 ? out : null;
}
