import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { Star, Flame, ShoppingCart, Check, ExternalLink } from "lucide-react";
import { Product } from "../types";
import { useCart } from "../context/CartContext";
import { useState, useCallback } from "react";

type Props = {
  products: Product[];
};

/* ── Helpers ──────────────────────────────────────────────── */

const getBrandName = (p: Product): string =>
  typeof p.brand === "object" ? (p.brand as any)?.name || "" : String(p.brand || "");

const getPrice = (p: Product): number =>
  Number(p.price ?? (p as any).basePrice ?? 0);

/**
 * Generates playstyle badges from specs for rackets;
 * generic summary for other categories.
 */
const getPlaystyleBadges = (product: Product): string[] => {
  const badges: string[] = [];
  const specs = product.specs || {};
  const specEntries = Object.entries(specs);

  // Pull play-style related specs
  const playStyle = specEntries.find(
    ([k]) => k.toLowerCase().includes("play style") || k.toLowerCase().includes("type")
  );
  if (playStyle) badges.push(playStyle[1]);

  const weight = specEntries.find(([k]) => k.toLowerCase() === "weight");
  if (weight) badges.push(`Weight: ${weight[1]}`);

  const stiffness = specEntries.find(([k]) => k.toLowerCase() === "stiffness");
  if (stiffness) badges.push(stiffness[1]);

  return badges.slice(0, 3);
};

/**
 * Simple recommendation summary based on specs.
 */
const getRecommendationSummary = (product: Product): string => {
  const brand = getBrandName(product);
  const specs = product.specs || {};
  const playStyle = Object.entries(specs).find(
    ([k]) => k.toLowerCase().includes("play style") || k.toLowerCase().includes("type")
  );

  if (playStyle) {
    return `The ${brand} ${product.name.split(" ").pop()} excels for ${playStyle[1].toLowerCase()} play. Great choice for ${
      playStyle[1].toLowerCase() === "attacking"
        ? "aggressive players seeking powerful smashes"
        : playStyle[1].toLowerCase() === "defensive"
        ? "players who value speed and control"
        : "versatile players who want all-round performance"
    }.`;
  }

  return `A premium ${brand} product with top-tier build quality and performance.`;
};

/* ── Component ───────────────────────────────────────────── */

export function RecommendationRow({ products }: Props) {
  const cart = useCart();
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});

  const handleAdd = useCallback(
    async (product: Product) => {
      const id = product.id || (product as any)._id;
      if (addedMap[id]) return;
      try {
        await cart.add(product);
        setAddedMap((prev) => ({ ...prev, [id]: true }));
        setTimeout(() => {
          setAddedMap((prev) => ({ ...prev, [id]: false }));
        }, 2000);
      } catch (err) {
        console.error("Failed to add to cart:", err);
      }
    },
    [cart, addedMap]
  );

  // "Suitable for you" smart tag — placeholder for personalization integration
  const smartTagIndex = useMemo(() => {
    // Later: integrate with behavior tracking (click/view history)
    // For now, we highlight the highest-rated product
    if (products.length === 0) return -1;
    let bestIdx = 0;
    let bestRating = products[0].rating || 0;
    products.forEach((p, i) => {
      if ((p.rating || 0) > bestRating) {
        bestRating = p.rating || 0;
        bestIdx = i;
      }
    });
    return bestIdx;
  }, [products]);

  if (products.length === 0) return null;

  return (
    <div className="mt-1">
      {/* Section header */}
      <div className="mb-4 flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
          <Star size={12} className="fill-current" />
          Our Recommendations
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>

      {/* Product recommendation cards row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${products.length}, 1fr)` }}>
        {products.map((product, idx) => {
          const id = product.id || (product as any)._id;
          const badges = getPlaystyleBadges(product);
          const summary = getRecommendationSummary(product);
          const isAdded = addedMap[id];
          const isSmartTag = idx === smartTagIndex;

          return (
            <div
              key={id}
              className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                isSmartTag
                  ? "border-primary/30 bg-gradient-to-b from-primary/[0.04] to-transparent shadow-lg shadow-primary/5"
                  : "border-black/5 bg-white/80 shadow-sm"
              }`}
            >
              {/* Smart Tag */}
              {isSmartTag && (
                <div className="absolute -right-1 -top-1 z-10">
                  <div className="flex items-center gap-1 rounded-bl-xl rounded-tr-2xl bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1.5 text-[10px] font-bold text-white shadow-lg shadow-red-500/30">
                    <Flame size={11} className="animate-pulse" />
                    Suitable for you
                  </div>
                </div>
              )}

              <div className="p-4 sm:p-5">
                {/* Playstyle badges */}
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {badges.map((badge) => (
                    <span
                      key={badge}
                      className="inline-flex items-center rounded-full bg-secondary/[0.06] px-2.5 py-1 text-[10px] font-semibold text-secondary/70 ring-1 ring-black/5"
                    >
                      {badge}
                    </span>
                  ))}
                </div>

                {/* Summary text */}
                <p className="mb-4 text-xs leading-relaxed text-secondary/60">
                  {summary}
                </p>

                {/* Price */}
                <div className="mb-3 flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-secondary">
                    ${getPrice(product).toFixed(2)}
                  </span>
                  {product.discount && product.discount > 0 && (
                    <span className="text-xs font-medium text-red-400 line-through">
                      ${((getPrice(product) / (1 - product.discount / 100))).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAdd(product)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] ${
                      isAdded
                        ? "bg-green-500 text-white"
                        : "bg-gradient-to-r from-primary to-red-500 text-white shadow-primary/20 hover:shadow-primary/40"
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check size={14} />
                        Added!
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={14} />
                        Add to Cart
                      </>
                    )}
                  </button>

                  <Link
                    href={`/products/${product.slug}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/5 bg-white text-secondary/50 transition hover:border-primary/20 hover:text-primary"
                    title="View product details"
                  >
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
