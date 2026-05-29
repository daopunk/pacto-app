import { normalizeCommonsTag } from './tags';

/**
 * Curated Commons tag tree. Categories are browse-only groupings shown as image
 * tiles; their `children` are the actual filterable #tags (e.g. Politics →
 * left, right, moderate, socialist). To add to the taxonomy (mirrors the theme
 * registry in `src/stores/theme.ts`):
 * 1. Optional art: drop a category image at `static/commons-tags/<id>.webp`.
 * 2. Append a `{ id, title, description, image, children }` category, or add a
 *    `{ tag, title }` child to an existing one.
 * Categories without an `image` fall back to a deterministic gradient tile.
 *
 * Image spec (see ai-docs/commons/COMMONS_PLAN.md → Tag art):
 * ~800×500 WebP/AVIF, < ~80 KB, static stills only (no GIF/video).
 */
export interface CommonsTagGroup {
  /** Normalized hashtag (lowercase, no `#`). Matches broadcast `tags`. */
  tag: string;
  /** Display label, e.g. "Left". */
  title: string;
  /** Optional one-line blurb. */
  description?: string;
}

export interface CommonsTagCategory {
  /** Stable id, also the image filename stem, e.g. "politics". */
  id: string;
  /** Display label, e.g. "POLITICS". */
  title: string;
  /** One-line blurb shown on the tile. */
  description: string;
  /** Filename under `static/commons-tags/`, e.g. "politics.webp". Optional. */
  image?: string;
  /** Filterable leaf tags under this category. */
  children: CommonsTagGroup[];
}

export const COMMONS_TAG_ART_BASE = '/commons-tags/';

export const COMMONS_TAG_TREE: CommonsTagCategory[] = [
  {
    id: 'politics',
    title: 'POLITICS',
    description: 'Ideology, organizing, and civic life.',
    children: [
      { tag: 'left', title: 'Left' },
      { tag: 'right', title: 'Right' },
      { tag: 'moderate', title: 'Moderate' },
      { tag: 'socialist', title: 'Socialist' },
      { tag: 'libertarian', title: 'Libertarian' },
      { tag: 'anarchist', title: 'Anarchist' },
    ],
  },
  {
    id: 'governance',
    title: 'GOVERNANCE',
    description: 'Coordination, DAOs, and shared decision-making.',
    children: [
      { tag: 'dao', title: 'DAO' },
      { tag: 'governance', title: 'Governance' },
      { tag: 'coordination', title: 'Coordination' },
      { tag: 'mutual_aid', title: 'Mutual Aid' },
    ],
  },
  {
    id: 'build',
    title: 'BUILD',
    description: 'Makers shipping tools, contracts, and apps.',
    children: [
      { tag: 'builders', title: 'Builders' },
      { tag: 'dev', title: 'Dev' },
      { tag: 'design', title: 'Design' },
      { tag: 'open_source', title: 'Open Source' },
    ],
  },
  {
    id: 'culture',
    title: 'CULTURE',
    description: 'Art, sound, and creative work.',
    children: [
      { tag: 'art', title: 'Art' },
      { tag: 'music', title: 'Music' },
      { tag: 'film', title: 'Film' },
      { tag: 'writing', title: 'Writing' },
    ],
  },
  {
    id: 'knowledge',
    title: 'KNOWLEDGE',
    description: 'Research, science, and learning.',
    children: [
      { tag: 'research', title: 'Research' },
      { tag: 'science', title: 'Science' },
      { tag: 'education', title: 'Education' },
    ],
  },
  {
    id: 'local',
    title: 'LOCAL',
    description: 'People organizing by place and IRL.',
    children: [
      { tag: 'local', title: 'Local' },
      { tag: 'irl', title: 'IRL' },
      { tag: 'events', title: 'Events' },
    ],
  },
];

/** Flattened, de-duplicated leaf tags across all categories. */
export const COMMONS_TAG_GROUPS: CommonsTagGroup[] = (() => {
  const seen = new Set<string>();
  const out: CommonsTagGroup[] = [];
  for (const category of COMMONS_TAG_TREE) {
    for (const child of category.children) {
      if (seen.has(child.tag)) continue;
      seen.add(child.tag);
      out.push(child);
    }
  }
  return out;
})();

const GROUPS_BY_TAG = new Map<string, CommonsTagGroup>(
  COMMONS_TAG_GROUPS.map((g) => [g.tag, g])
);

const CATEGORIES_BY_ID = new Map<string, CommonsTagCategory>(
  COMMONS_TAG_TREE.map((c) => [c.id, c])
);

export function findCommonsTagCategory(id: string): CommonsTagCategory | null {
  return CATEGORIES_BY_ID.get(id) ?? null;
}

/** Leaf tag slugs for a category (used for broad ANY-of-category feed search). */
export function commonsCategoryTagSlugs(category: CommonsTagCategory): string[] {
  return category.children.map((c) => c.tag);
}

export function findCommonsTagGroup(tag: string): CommonsTagGroup | null {
  const normalized = normalizeCommonsTag(tag);
  if (!normalized) return null;
  return GROUPS_BY_TAG.get(normalized) ?? null;
}

export function commonsTagArtSrc(source: { image?: string }): string | null {
  return source.image ? `${COMMONS_TAG_ART_BASE}${source.image}` : null;
}

/** Sum of active broadcasts across a category's child tags. */
export function commonsCategoryLiveCount(
  category: CommonsTagCategory,
  countsByTag: Record<string, number>
): number {
  return category.children.reduce((sum, child) => sum + (countsByTag[child.tag] ?? 0), 0);
}

/** Deterministic gradient so a tile looks intentional with no image set. */
export function commonsTagGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  }
  const h1 = hash;
  const h2 = (hash + 48) % 360;
  return `linear-gradient(135deg, hsl(${h1} 62% 30%), hsl(${h2} 58% 18%))`;
}
