import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { cacheGet, cacheSet } from '../utils/cache';
import mongoose from 'mongoose';

/* ═══════════════════════════════════════════════════════════════════
 *  Content-Based Similarity Engine
 *  ─────────────────────────────────────────────────────────────────
 *  Each product category has its own schema + weights to compute
 *  a similarity score between two products of the SAME category.
 *
 *  Algorithm:
 *    1. Resolve the source product's category → select schema
 *    2. Fetch candidate products (same category, active, not self)
 *    3. Score each candidate against the source using weighted
 *       field-level similarity functions
 *    4. Sort descending by score, return top N
 *    5. Cache result in Redis for 5 minutes
 * ═══════════════════════════════════════════════════════════════════ */

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

/** A single field definition inside a category schema. */
interface FieldSchema {
  /** The key to look up in product.specs (case-insensitive match) */
  specKey: string;
  /** Weight of this field in the total similarity score (0–1) */
  weight: number;
  /** Type determines which comparison function is used */
  type: 'categorical' | 'numeric' | 'text' | 'brand' | 'price';
  /**
   * For numeric fields: define the plausible range so we can normalize
   * distance.  E.g. price range [0, 500].
   */
  range?: [number, number];
  /**
   * Optional list of known categorical values — used for partial-match
   * grouping (e.g. "Head Heavy" ~ "All-around" but ≠ "Head Light").
   */
  groups?: Record<string, string[]>;
}

/** The complete schema for a product category. */
interface CategorySchema {
  /** Patterns to match against category slug/name (case-insensitive) */
  matchPatterns: RegExp[];
  /** Ordered list of field schemas */
  fields: FieldSchema[];
}

// ────────────────────────────────────────────────────────────────────
// Category Schemas — the "knowledge base" of the engine
// ────────────────────────────────────────────────────────────────────

const RACKET_SCHEMA: CategorySchema = {
  matchPatterns: [/racket/i, /vợt/i],
  fields: [
    {
      specKey: 'brand',
      weight: 0.10,
      type: 'brand',
    },
    {
      specKey: 'Stick stiffness',
      weight: 0.20,
      type: 'categorical',
      groups: {
        stiff: ['Stiff', 'Very Stiff', 'Extra Stiff'],
        medium: ['Medium', 'Medium Stiff'],
        flexible: ['Flexible', 'Very Flexible'],
      },
    },
    {
      specKey: 'Balance Point',
      weight: 0.25,
      type: 'categorical',
      groups: {
        offensive: ['Head Heavy (Offensive)', 'Head Heavy', 'Offensive'],
        balanced: ['All-around Offensive/Defensive', 'Even Balance', 'All-around', 'Balanced'],
        defensive: ['Head Light (Defensive)', 'Head Light', 'Defensive'],
      },
    },
    {
      specKey: 'Maximum Tension',
      weight: 0.10,
      type: 'numeric',
      range: [20, 35], // lbs
    },
    {
      specKey: 'Weight (U)',
      weight: 0.20,
      type: 'categorical',
      groups: {
        heavy: ['2U', '3U'],
        medium: ['4U'],
        light: ['5U', '6U', 'F'],
      },
    },
    {
      specKey: 'price',
      weight: 0.15,
      type: 'price',
      range: [0, 500],
    },
  ],
};

const SHOES_SCHEMA: CategorySchema = {
  matchPatterns: [/shoe/i, /footwear/i, /giày/i],
  fields: [
    {
      specKey: 'brand',
      weight: 0.15,
      type: 'brand',
    },
    {
      specKey: 'Size (EU)',
      weight: 0.05,
      type: 'numeric',
      range: [35, 48],
    },
    {
      specKey: 'Gender',
      weight: 0.15,
      type: 'categorical',
    },
    {
      specKey: 'Key Features',
      weight: 0.30,
      type: 'text',
    },
    {
      specKey: 'price',
      weight: 0.35,
      type: 'price',
      range: [0, 300],
    },
  ],
};

const BAG_SCHEMA: CategorySchema = {
  matchPatterns: [/bag/i, /túi/i],
  fields: [
    {
      specKey: 'brand',
      weight: 0.15,
      type: 'brand',
    },
    {
      specKey: 'Capacity',
      weight: 0.20,
      type: 'numeric',
      range: [1, 12], // number of rackets
    },
    {
      specKey: 'Bag Type',
      weight: 0.30,
      type: 'categorical',
    },
    {
      specKey: 'Features',
      weight: 0.20,
      type: 'text',
    },
    {
      specKey: 'price',
      weight: 0.15,
      type: 'price',
      range: [0, 200],
    },
  ],
};

const SHUTTLECOCK_SCHEMA: CategorySchema = {
  matchPatterns: [/shuttlecock/i, /cầu/i],
  fields: [
    {
      specKey: 'brand',
      weight: 0.20,
      type: 'brand',
    },
    {
      specKey: 'Type',
      weight: 0.30,
      type: 'categorical',
      groups: {
        feather: ['Feather', 'Goose Feather', 'Duck Feather', 'Natural'],
        nylon: ['Nylon', 'Synthetic', 'Plastic'],
      },
    },
    {
      specKey: 'Speed',
      weight: 0.30,
      type: 'numeric',
      range: [73, 79],  // shuttlecock speed numbers
    },
    {
      specKey: 'Packaging',
      weight: 0.20,
      type: 'categorical',
    },
  ],
};

const ACCESSORIES_SCHEMA: CategorySchema = {
  matchPatterns: [/accessor/i, /phụ kiện/i, /grip/i, /quấn/i, /cước/i, /string/i, /sock/i, /wrist/i],
  fields: [
    {
      specKey: 'Accessory Type',
      weight: 0.40,
      type: 'categorical',
    },
    {
      specKey: 'Thickness',
      weight: 0.25,
      type: 'numeric',
      range: [0.5, 2.0], // mm
    },
    {
      specKey: 'Feel',
      weight: 0.35,
      type: 'text',
    },
  ],
};

/** Ordered list of all schemas — matched in order, first match wins. */
const ALL_SCHEMAS: CategorySchema[] = [
  RACKET_SCHEMA,
  SHOES_SCHEMA,
  BAG_SCHEMA,
  SHUTTLECOCK_SCHEMA,
  ACCESSORIES_SCHEMA,
];

// ────────────────────────────────────────────────────────────────────
// Utility helpers
// ────────────────────────────────────────────────────────────────────

/** Normalise string for comparison */
const norm = (s: any): string =>
  String(s ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

/** Extract a numeric value from a mixed string like "28 lbs" or "4U" */
const extractNumber = (s: any): number | null => {
  if (s == null) return null;
  if (typeof s === 'number') return s;
  const match = String(s).match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
};

/** Tokenise a text string into lowercase keywords for Jaccard similarity. */
const tokenize = (s: any): Set<string> => {
  if (!s) return new Set();
  return new Set(
    norm(s)
      .split(/[\s,;|/&+·•\-—]+/)
      .filter(w => w.length > 1)
  );
};

/** Jaccard similarity between two sets of tokens: |A∩B| / |A∪B| */
const jaccard = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
};

// ────────────────────────────────────────────────────────────────────
// Core similarity functions per field type
// ────────────────────────────────────────────────────────────────────

/** Exact match for categorical fields with optional group-based partial matching. */
function categoricalSimilarity(a: any, b: any, groups?: Record<string, string[]>): number {
  const na = norm(a);
  const nb = norm(b);

  if (!na || !nb) return 0;
  if (na === nb) return 1.0;

  // Group-based partial matching
  if (groups) {
    for (const groupValues of Object.values(groups)) {
      const normalizedGroup = groupValues.map(norm);
      const aInGroup = normalizedGroup.some(g => na.includes(g) || g.includes(na));
      const bInGroup = normalizedGroup.some(g => nb.includes(g) || g.includes(nb));
      if (aInGroup && bInGroup) return 0.7; // Same group but not exact = partial match
    }
    return 0.0; // Different groups
  }

  // Fallback: substring matching
  if (na.includes(nb) || nb.includes(na)) return 0.5;
  return 0.0;
}

/** Numeric similarity: 1 − |a − b| / range_size, clamped to [0, 1] */
function numericSimilarity(a: any, b: any, range?: [number, number]): number {
  const na = extractNumber(a);
  const nb = extractNumber(b);

  if (na == null || nb == null) return 0;
  if (na === nb) return 1.0;

  const rangeSize = range ? (range[1] - range[0]) : Math.max(Math.abs(na), Math.abs(nb), 1);
  const distance = Math.abs(na - nb) / rangeSize;
  return Math.max(0, 1 - distance);
}

/** Brand similarity — exact match or same parent brand. */
function brandSimilarity(a: any, b: any): number {
  const na = norm(a);
  const nb = norm(b);

  if (!na || !nb) return 0;
  if (na === nb) return 1.0;

  // Partial brand name matching (e.g. "Yonex Japan" vs "Yonex")
  if (na.includes(nb) || nb.includes(na)) return 0.7;
  return 0.0;
}

/** Price similarity — inverse normalized distance within a price range. */
function priceSimilarity(a: number, b: number, range?: [number, number]): number {
  if (a == null || b == null) return 0;
  if (a === b) return 1.0;

  const rangeSize = range ? (range[1] - range[0]) : Math.max(a, b, 1);
  const distance = Math.abs(a - b) / rangeSize;
  return Math.max(0, 1 - distance);
}

/** Text/feature similarity — Jaccard over tokenized words. */
function textSimilarity(a: any, b: any): number {
  return jaccard(tokenize(a), tokenize(b));
}

// ────────────────────────────────────────────────────────────────────
// Main engine
// ────────────────────────────────────────────────────────────────────

/**
 * Resolve a spec value from a product.  Handles:
 *  - 'brand'  → populated brand.name or raw string
 *  - 'price'  → basePrice
 *  - any other key → case-insensitive lookup in product.specs
 */
function resolveSpecValue(product: any, specKey: string): any {
  const key = specKey.toLowerCase();

  if (key === 'brand') {
    if (typeof product.brand === 'object' && product.brand?.name) {
      return product.brand.name;
    }
    return product.brand;
  }

  if (key === 'price') {
    return product.basePrice ?? product.price ?? 0;
  }

  // Look up in specs map (case-insensitive)
  if (product.specs) {
    for (const [k, v] of Object.entries(product.specs)) {
      if (k.toLowerCase().trim() === key || norm(k) === norm(specKey)) {
        return v;
      }
    }
  }

  return undefined;
}

/**
 * Compute the weighted similarity score between two products using the
 * given category schema.  Returns a value in [0, 1].
 */
function computeSimilarity(source: any, candidate: any, schema: CategorySchema): number {
  let totalScore = 0;
  let totalWeight = 0;

  for (const field of schema.fields) {
    const a = resolveSpecValue(source, field.specKey);
    const b = resolveSpecValue(candidate, field.specKey);

    let sim = 0;
    switch (field.type) {
      case 'categorical':
        sim = categoricalSimilarity(a, b, field.groups);
        break;
      case 'numeric':
        sim = numericSimilarity(a, b, field.range);
        break;
      case 'brand':
        sim = brandSimilarity(a, b);
        break;
      case 'price':
        sim = priceSimilarity(
          extractNumber(a) ?? 0,
          extractNumber(b) ?? 0,
          field.range,
        );
        break;
      case 'text':
        sim = textSimilarity(a, b);
        break;
    }

    totalScore += sim * field.weight;
    totalWeight += field.weight;
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

/**
 * Detect the correct schema for a product based on its category.
 */
function detectSchema(product: any): CategorySchema | null {
  const catName =
    typeof product.category === 'object'
      ? product.category?.name ?? product.category?.slug ?? ''
      : String(product.category ?? '');

  for (const schema of ALL_SCHEMAS) {
    for (const pattern of schema.matchPatterns) {
      if (pattern.test(catName)) {
        return schema;
      }
    }
  }

  // Heuristic: detect by spec keys present
  const specKeys = Object.keys(product.specs || {}).map(norm);
  const racketKeys = ['weight (u)', 'stick stiffness', 'balance point', 'maximum tension', 'grip circumference (g)'];
  const shoeKeys = ['size (eu)', 'gender', 'key features'];
  const bagKeys = ['capacity', 'bag type'];
  const shuttleKeys = ['speed', 'type'];
  const accessoryKeys = ['accessory type', 'thickness', 'feel'];

  if (specKeys.some(k => racketKeys.includes(k))) return RACKET_SCHEMA;
  if (specKeys.some(k => shoeKeys.includes(k))) return SHOES_SCHEMA;
  if (specKeys.some(k => bagKeys.includes(k))) return BAG_SCHEMA;
  if (specKeys.some(k => shuttleKeys.includes(k))) return SHUTTLECOCK_SCHEMA;
  if (specKeys.some(k => accessoryKeys.includes(k))) return ACCESSORIES_SCHEMA;

  return null;
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

export interface SimilarProductResult {
  product: any;
  score: number;
  matchedCategory: string;
}

export interface SimilarProductsResponse {
  source: {
    id: string;
    name: string;
    category: string;
  };
  schema: string;
  results: SimilarProductResult[];
}

/**
 * Find products similar to the given product, using content-based
 * similarity with category-specific weight schemas.
 *
 * @param productId  The source product's MongoDB _id
 * @param limit      Max results to return (default 6)
 * @returns          Ranked list of similar products with scores
 */
export async function findSimilarProducts(
  productId: string,
  limit: number = 6,
): Promise<SimilarProductsResponse> {
  // ── Cache check ──────────────────────────────────────────────
  const cacheKey = `similar:${productId}:${limit}`;
  const cached = await cacheGet<SimilarProductsResponse>(cacheKey);
  if (cached) return cached;

  // ── Load source product ──────────────────────────────────────
  const source = await Product.findById(productId)
    .populate('category', 'name slug')
    .populate('brand', 'name slug')
    .lean();

  if (!source) {
    throw new Error('Product not found');
  }

  // ── Detect schema ────────────────────────────────────────────
  const schema = detectSchema(source);
  const categoryName =
    typeof source.category === 'object'
      ? (source.category as any)?.name ?? ''
      : String(source.category ?? '');

  if (!schema) {
    // Fallback: same category products sorted by rating
    const fallback = await Product.find({
      status: 'active',
      category: source.category,
      _id: { $ne: source._id },
    })
      .populate('category', 'name slug')
      .populate('brand', 'name slug')
      .sort({ rating: -1, reviewCount: -1 })
      .limit(limit)
      .lean();

    const response: SimilarProductsResponse = {
      source: {
        id: source._id.toString(),
        name: source.name,
        category: categoryName,
      },
      schema: 'fallback',
      results: fallback.map(p => ({
        product: p,
        score: 0,
        matchedCategory: categoryName,
      })),
    };
    await cacheSet(cacheKey, response, 300);
    return response;
  }

  // ── Load candidates (same category, active, not self) ────────
  const candidates = await Product.find({
    status: 'active',
    category: source.category,
    _id: { $ne: source._id },
  })
    .populate('category', 'name slug')
    .populate('brand', 'name slug')
    .lean();

  // ── Score each candidate ─────────────────────────────────────
  const scored: SimilarProductResult[] = candidates.map(candidate => ({
    product: candidate,
    score: computeSimilarity(source, candidate, schema),
    matchedCategory: categoryName,
  }));

  // ── Sort by score descending ─────────────────────────────────
  scored.sort((a, b) => b.score - a.score);

  // ── Take top N ───────────────────────────────────────────────
  const results = scored.slice(0, limit);

  // ── If not enough same-category results, fill with cross-
  //    category trending products ──────────────────────────────
  if (results.length < limit) {
    const existingIds = [
      source._id,
      ...results.map(r => r.product._id),
    ];
    const filler = await Product.find({
      status: 'active',
      _id: { $nin: existingIds },
      $or: [{ isTrending: true }, { isBestSeller: true }],
    })
      .populate('category', 'name slug')
      .populate('brand', 'name slug')
      .sort({ rating: -1 })
      .limit(limit - results.length)
      .lean();

    for (const p of filler) {
      results.push({
        product: p,
        score: 0,
        matchedCategory: typeof p.category === 'object'
          ? (p.category as any)?.name ?? ''
          : '',
      });
    }
  }

  const schemaName = schema.matchPatterns[0].source.replace(/\//g, '');
  const response: SimilarProductsResponse = {
    source: {
      id: source._id.toString(),
      name: source.name,
      category: categoryName,
    },
    schema: schemaName,
    results,
  };

  // ── Cache for 5 minutes ──────────────────────────────────────
  await cacheSet(cacheKey, response, 300);
  return response;
}

/**
 * Batch-compute similar products for multiple product IDs.
 * Useful for homepage "Because you viewed" carousels.
 */
export async function findSimilarProductsForMany(
  productIds: string[],
  limitPerProduct: number = 3,
  totalLimit: number = 8,
): Promise<any[]> {
  const seen = new Set<string>();
  const results: any[] = [];

  for (const pid of productIds.slice(0, 5)) {
    try {
      const similar = await findSimilarProducts(pid, limitPerProduct);
      for (const r of similar.results) {
        const id = r.product._id.toString();
        if (!seen.has(id) && !productIds.includes(id)) {
          seen.add(id);
          results.push(r.product);
          if (results.length >= totalLimit) return results;
        }
      }
    } catch {
      // Skip invalid products
    }
  }

  return results;
}
