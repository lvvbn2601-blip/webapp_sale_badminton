import { useState, useEffect, useRef } from "react";
import { Product } from "../types";
import { fetchSimilarProducts } from "../lib/api";
import { ProductCard } from "./ProductCard";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Cpu,
  TrendingUp,
  Loader2,
} from "lucide-react";

type Props = {
  productId: string;
  currentSlug: string;
  limit?: number;
};

/**
 * SimilarProducts — Content-Based Similarity section
 *
 * Fetches and displays products similar to the current product using
 * the backend content-based similarity engine with category-specific
 * weighted schemas.
 */
export function SimilarProducts({ productId, currentSlug, limit = 6 }: Props) {
  const [products, setProducts] = useState<(Product & { similarityScore?: number })[]>([]);
  const [schema, setSchema] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    setError(false);

    fetchSimilarProducts(productId, limit)
      .then((res) => {
        // Filter out the current product just in case
        const filtered = (res.products || []).filter(
          (p: any) => p.slug !== currentSlug && (p._id || p.id) !== productId
        );
        setProducts(filtered);
        setSchema(res.schema || "");
      })
      .catch(() => {
        setError(true);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [productId, currentSlug, limit]);

  // Scroll buttons visibility
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkScroll = () => {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    };

    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [products]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 300;
    el.scrollBy({
      left: dir === "right" ? cardWidth : -cardWidth,
      behavior: "smooth",
    });
  };

  if (loading) {
    return (
      <section className="section-padding bg-gradient-to-b from-gray-50 to-white">
        <div className="container-default">
          <div className="flex items-center justify-center gap-3 py-16">
            <Loader2 size={24} className="animate-spin text-primary" />
            <span className="text-sm font-semibold text-secondary/50">
              Finding similar products...
            </span>
          </div>
        </div>
      </section>
    );
  }

  if (error || products.length === 0) return null;

  // Schema label mapping
  const schemaLabels: Record<string, { icon: string; label: string; description: string }> = {
    racket: {
      icon: "🏸",
      label: "Similar Rackets",
      description: "Matched by balance point, stiffness, weight class & price range",
    },
    shoe: {
      icon: "👟",
      label: "Similar Shoes",
      description: "Matched by features, price range & brand ecosystem",
    },
    footwear: {
      icon: "👟",
      label: "Similar Footwear",
      description: "Matched by features, price range & brand ecosystem",
    },
    bag: {
      icon: "🎒",
      label: "Similar Bags",
      description: "Matched by bag type, capacity & feature set",
    },
    shuttle: {
      icon: "🏸",
      label: "Similar Shuttlecocks",
      description: "Matched by type, speed rating & brand",
    },
    accessor: {
      icon: "🔧",
      label: "Similar Accessories",
      description: "Matched by accessory type, thickness & feel",
    },
    fallback: {
      icon: "✨",
      label: "You May Also Like",
      description: "Related products from the same category",
    },
  };

  const info =
    schemaLabels[schema] ||
    Object.entries(schemaLabels).find(([k]) => schema.includes(k))?.[1] ||
    schemaLabels.fallback;

  return (
    <section className="section-padding bg-gradient-to-b from-gray-50/80 to-white overflow-hidden">
      <div className="container-default">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Icon badge */}
            <div className="relative mt-0.5 hidden sm:flex">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/20 to-orange-200 blur-md" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-orange-500 text-2xl shadow-lg shadow-primary/20">
                {info.icon}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-heading text-2xl font-bold text-secondary">
                  {info.label}
                </h2>

              </div>
              <p className="mt-1 text-sm text-secondary/50">{info.description}</p>
            </div>
          </div>

          {/* Scroll arrows (desktop) */}
          <div className="hidden items-center gap-2 sm:flex">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className={`grid h-10 w-10 place-items-center rounded-full border border-black/10 bg-white text-secondary/60 shadow-sm transition hover:bg-gray-50 hover:text-secondary ${!canScrollLeft ? "opacity-30 cursor-default" : ""
                }`}
              aria-label="Scroll left"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className={`grid h-10 w-10 place-items-center rounded-full border border-black/10 bg-white text-secondary/60 shadow-sm transition hover:bg-gray-50 hover:text-secondary ${!canScrollRight ? "opacity-30 cursor-default" : ""
                }`}
              aria-label="Scroll right"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable cards */}
        <div className="relative">
          {/* Left gradient fade */}
          {canScrollLeft && (
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full bg-gradient-to-r from-white to-transparent" />
          )}

          <div
            ref={scrollRef}
            className="scrollbar-hide -mx-4 flex gap-5 overflow-x-auto px-4 pb-4 snap-x snap-mandatory scroll-smooth"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {products.map((product, i) => {
              const score = (product as any).similarityScore;
              return (
                <div
                  key={product._id || product.id || i}
                  className="w-[280px] shrink-0 snap-start"
                  style={{
                    animation: `fadeSlideUp 0.5s ${i * 0.08}s both cubic-bezier(0.16, 1, 0.3, 1)`,
                  }}
                >
                  {/* Similarity score badge */}
                  {score != null && score > 0 ? (
                    <div className="mb-2 flex items-center gap-1.5">
                      <div className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-1">
                        <TrendingUp size={12} className="text-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-600">
                          {Math.round(score * 100)}% match
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-2 flex items-center gap-1.5">
                      <div className="flex items-center gap-1 rounded-full bg-primary-50 border border-primary-100 px-2.5 py-1">
                        <span className="text-[10px] font-bold text-primary-600">
                          You May Also Like
                        </span>
                      </div>
                    </div>
                  )}
                  <ProductCard product={product} />
                </div>
              );
            })}
          </div>

          {/* Right gradient fade */}
          {canScrollRight && (
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-white to-transparent" />
          )}
        </div>
      </div>

      {/* Inline animation keyframes */}
      <style jsx>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
