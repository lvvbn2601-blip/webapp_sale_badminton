/**
 * COMPARE_CONFIG — Attribute Map
 *
 * Defines which spec rows to render in the comparison table for each
 * product category.  The keys inside `rows` must match (case-insensitive)
 * the keys stored in `product.specs`.
 *
 * `highlight: true` means the row will get a visual diff indicator
 * whenever the values differ across the compared products.
 */

export type CompareRowConfig = {
  /** The key to look up inside `product.specs` (case-insensitive match) */
  specKey: string;
  /** Human-readable label shown in the leftmost column */
  label: string;
  /** Optional icon/emoji rendered next to the label */
  icon?: string;
  /** If true, highlight cells when values differ */
  highlight: boolean;
};

export type CompareCategoryConfig = {
  /** Slug / id of the category (must match Category.slug) */
  slug: string;
  /** Friendly name of the category */
  name: string;
  /** Rows to show when comparing products of this category */
  rows: CompareRowConfig[];
};

/* ────────────────── Per-Category Configs ────────────────── */

const RACKET_ROWS: CompareRowConfig[] = [
  { specKey: "Play Style",   label: "Play Style",    icon: "🎯", highlight: true },
  { specKey: "Weight",       label: "Weight",         icon: "⚖️", highlight: true },
  { specKey: "Balance Point", label: "Balance Point", icon: "⚖️", highlight: true },
  { specKey: "Stiffness",    label: "Shaft Stiffness", icon: "💪", highlight: true },
  { specKey: "Max Tension",  label: "Max Tension",    icon: "🔧", highlight: true },
  { specKey: "Frame Material", label: "Frame Material", icon: "🧬", highlight: false },
  { specKey: "Shaft Material", label: "Shaft Material", icon: "🧬", highlight: false },
  { specKey: "Length",        label: "Length",          icon: "📏", highlight: true },
  { specKey: "Grip Size",    label: "Grip Size",       icon: "✋", highlight: true },
];

const SHOE_ROWS: CompareRowConfig[] = [
  { specKey: "Type",           label: "Shoe Type",           icon: "👟", highlight: true },
  { specKey: "Cushioning",     label: "Cushioning Tech",     icon: "☁️", highlight: true },
  { specKey: "Outsole",        label: "Outsole",             icon: "🔽", highlight: true },
  { specKey: "Width",          label: "Width Fit",           icon: "↔️", highlight: true },
  { specKey: "Upper Material", label: "Upper Material",      icon: "🧵", highlight: false },
  { specKey: "Weight",         label: "Weight",              icon: "⚖️", highlight: true },
  { specKey: "Closure",        label: "Closure System",      icon: "🔗", highlight: false },
];

const SHUTTLECOCK_ROWS: CompareRowConfig[] = [
  { specKey: "Material",    label: "Feather Material", icon: "🪶", highlight: true },
  { specKey: "Speed",       label: "Speed Grade",      icon: "💨", highlight: true },
  { specKey: "Durability",  label: "Durability",        icon: "🛡️", highlight: true },
  { specKey: "Cork",        label: "Cork Type",         icon: "🔘", highlight: false },
  { specKey: "Tube Count",  label: "Tubes / Dozen",     icon: "📦", highlight: false },
];

const BAG_ROWS: CompareRowConfig[] = [
  { specKey: "Capacity",         label: "Capacity",            icon: "🎒", highlight: true },
  { specKey: "Straps",           label: "Strap Type",          icon: "🔗", highlight: true },
  { specKey: "Shoe Compartment", label: "Shoe Compartment",    icon: "👞", highlight: true },
  { specKey: "Thermal Lining",   label: "Thermal Lining",      icon: "🌡️", highlight: false },
  { specKey: "Waterproof",       label: "Waterproof",          icon: "💧", highlight: false },
];

const ACCESSORY_ROWS: CompareRowConfig[] = [
  { specKey: "Type",       label: "Type",         icon: "🏷️", highlight: true },
  { specKey: "Material",   label: "Material",     icon: "🧵", highlight: true },
  { specKey: "Thickness",  label: "Thickness",    icon: "📏", highlight: true },
  { specKey: "Feeling",    label: "Feeling",       icon: "✋", highlight: true },
  { specKey: "Durability", label: "Durability",    icon: "🛡️", highlight: false },
];

/* ────────────────── Fallback for unknown categories ────── */

const GENERIC_ROWS: CompareRowConfig[] = [
  { specKey: "Type",       label: "Type",       icon: "🏷️", highlight: true },
  { specKey: "Material",   label: "Material",   icon: "🧵", highlight: true },
  { specKey: "Weight",     label: "Weight",     icon: "⚖️", highlight: true },
];

/* ────────────────── Master Map ─────────────────────────── */

export const COMPARE_CONFIG: Record<string, CompareCategoryConfig> = {
  rackets: {
    slug: "rackets",
    name: "Rackets",
    rows: RACKET_ROWS,
  },
  shoes: {
    slug: "shoes",
    name: "Badminton Shoes",
    rows: SHOE_ROWS,
  },
  shuttlecocks: {
    slug: "shuttlecocks",
    name: "Shuttlecocks",
    rows: SHUTTLECOCK_ROWS,
  },
  bags: {
    slug: "bags",
    name: "Bags & Gear",
    rows: BAG_ROWS,
  },
  accessories: {
    slug: "accessories",
    name: "Accessories",
    rows: ACCESSORY_ROWS,
  },
};

/* ── Helpers ─────────────────────────────────────────────── */

/**
 * Resolve which category slug a product belongs to
 * (handles both object and string references).
 */
export const resolveCategory = (product: any): string => {
  if (typeof product.category === "object" && product.category) {
    return (product.category.slug || product.category.name || "").toLowerCase();
  }
  return String(product.category || "").toLowerCase();
};

/**
 * Get the config for a given category slug.
 * Falls back to a generic config if the slug is unknown.
 */
export const getCompareConfig = (categorySlug: string): CompareCategoryConfig => {
  const normalized = categorySlug.toLowerCase();
  return (
    COMPARE_CONFIG[normalized] || {
      slug: normalized,
      name: categorySlug,
      rows: GENERIC_ROWS,
    }
  );
};

/**
 * Look up a spec value (case-insensitive key match).
 */
export const getSpecValue = (
  specs: Record<string, string> | undefined,
  specKey: string
): string => {
  if (!specs) return "—";
  const key = Object.keys(specs).find(
    (k) => k.toLowerCase() === specKey.toLowerCase()
  );
  return key ? specs[key] || "—" : "—";
};
