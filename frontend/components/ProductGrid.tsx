import { useState } from "react";
import { LayoutGrid, List, SearchX } from "lucide-react";
import { Product } from "../types";
import { ProductCard } from "./ProductCard";
import { Skeleton } from "./Skeleton";
import Link from "next/link";

type Props = {
  products: Product[];
  onAdd?: (product: Product) => void;
  onQuickView?: (product: Product) => void;
  loading?: boolean;
  showControls?: boolean;
  sortBy?: string;
  onSortChange?: (sort: string) => void;
  compareList?: Product[];
  onToggleCompare?: (product: Product) => void;
};

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low → High" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "rating", label: "Top Rated" },
  { value: "name-asc", label: "Name: A → Z" },
];

export function ProductGrid({
  products,
  onAdd,
  onQuickView,
  loading = false,
  showControls = false,
  sortBy = "featured",
  onSortChange,
  compareList = [],
  onToggleCompare,
}: Props) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  /* ── Loading skeleton ───────────────────── */
  if (loading) {
    return (
      <div className="space-y-4">
        {showControls && (
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-9 w-56 rounded-xl" />
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
            >
              <Skeleton className="aspect-square rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Empty state ────────────────────────── */
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-3xl bg-white py-16 text-center shadow-sm ring-1 ring-black/5">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-gray-50">
          <SearchX size={32} className="text-secondary/15" />
        </div>
        <div>
          <h3 className="font-heading text-lg font-bold text-secondary">No products found</h3>
          <p className="mt-1 text-sm text-secondary/50">
            Try adjusting your filters or search criteria
          </p>
        </div>
        <Link
          href="/products"
          className="mt-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          View all products
        </Link>
      </div>
    );
  }

  /* ── Product grid / list ────────────────── */
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {showControls && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-secondary/50">
            Showing{" "}
            <span className="font-semibold text-secondary">{products.length}</span>{" "}
            {products.length === 1 ? "product" : "products"}
          </p>

          <div className="flex items-center gap-2">
            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => onSortChange?.(e.target.value)}
                className="appearance-none rounded-xl border border-black/5 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-secondary shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary/30">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* View toggle */}
            <div className="hidden items-center rounded-xl border border-black/5 bg-white p-0.5 shadow-sm md:flex">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`grid h-8 w-8 place-items-center rounded-lg transition ${viewMode === "grid"
                  ? "bg-secondary text-white shadow-sm"
                  : "text-secondary/40 hover:text-secondary"
                  }`}
                aria-label="Grid view"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`grid h-8 w-8 place-items-center rounded-lg transition ${viewMode === "list"
                  ? "bg-secondary text-white shadow-sm"
                  : "text-secondary/40 hover:text-secondary"
                  }`}
                aria-label="List view"
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid view */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id || (product as any)._id}
              product={product}
              onAdd={onAdd}
              onQuickView={onQuickView}
              viewMode="grid"
              isComparing={compareList.some(p => (p.id || (p as any)._id) === (product.id || (product as any)._id))}
              onToggleCompare={() => onToggleCompare?.(product)}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === "list" && (
        <div className="space-y-3">
          {products.map((product) => (
            <ProductCard
              key={product.id || (product as any)._id}
              product={product}
              onAdd={onAdd}
              onQuickView={onQuickView}
              viewMode="list"
              isComparing={compareList.some(p => (p.id || (p as any)._id) === (product.id || (product as any)._id))}
              onToggleCompare={() => onToggleCompare?.(product)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
