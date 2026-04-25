import Image from "next/image";
import Link from "next/link";
import { X, Scale, ArrowRight, Plus } from "lucide-react";
import { useCompare } from "../context/CompareContext";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";

/**
 * CompareBar — Sticky toolbar fixed at the bottom of the screen.
 *
 * Shows selected products (up to 3 slots), allows removal,
 * and has a "Compare Now" CTA that navigates to /products/compare.
 */
export function CompareBar() {
  const { items, remove, clear, count } = useCompare();
  const router = useRouter();

  // Hide on the compare page itself
  const isComparePage = router.pathname === "/products/compare";

  // Animate in/out
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (count > 0 && !isComparePage) {
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [count, isComparePage]);

  if (count === 0 || isComparePage) return null;

  const slots = Array.from({ length: 3 }, (_, i) => items[i] || null);

  return (
    <div
      className={`fixed bottom-0 left-0 z-50 w-full transition-all duration-500 ease-out ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0"
      }`}
    >
      {/* Glassmorphism container */}
      <div className="border-t border-white/20 bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl shadow-[0_-8px_40px_rgba(0,0,0,0.3)]">
        <div className="container-default mx-auto flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-4">
          {/* Left: Label + product slots */}
          <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto scrollbar-hide">
            {/* Icon + label */}
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-red-600 text-white shadow-lg shadow-primary/30">
                <Scale size={16} />
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-white/90 tracking-wide">COMPARE</p>
                <p className="text-[10px] text-white/50">{count}/3 selected</p>
              </div>
            </div>

            {/* Slots */}
            <div className="flex items-center gap-2 sm:gap-3">
              {slots.map((product, index) =>
                product ? (
                  <div
                    key={product.id || (product as any)._id}
                    className="group/slot relative flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-2.5 py-2 pr-8 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/15"
                  >
                    {/* Thumbnail */}
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-white/5 text-xs font-bold text-white/30">
                          {product.name?.charAt(0) || "?"}
                        </div>
                      )}
                    </div>

                    {/* Name + price */}
                    <div className="min-w-0">
                      <p className="line-clamp-1 max-w-[100px] text-xs font-semibold text-white/90 sm:max-w-[120px]">
                        {product.name}
                      </p>
                      <p className="text-[10px] font-medium text-primary/80">
                        ${(product.price || (product as any).basePrice || 0).toFixed(2)}
                      </p>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => remove(product.id || (product as any)._id)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-white/0 text-white/40 transition hover:bg-red-500/30 hover:text-red-400"
                      aria-label={`Remove ${product.name} from compare`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div
                    key={`empty-${index}`}
                    className="flex h-[56px] w-[140px] items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 bg-white/[0.03] text-[10px] font-medium text-white/30 sm:w-[160px]"
                  >
                    <Plus size={12} />
                    <span>Add product</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex shrink-0 items-center justify-end gap-3">
            <button
              onClick={clear}
              className="rounded-lg px-3 py-2 text-xs font-medium text-white/50 transition hover:bg-white/10 hover:text-white/80"
            >
              Clear all
            </button>

            <Link
              href="/products/compare"
              className={`group/btn inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-lg transition-all duration-300 ${
                count < 2
                  ? "pointer-events-none cursor-not-allowed bg-white/10 text-white/30"
                  : "bg-gradient-to-r from-primary to-red-500 text-white shadow-primary/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40"
              }`}
              aria-disabled={count < 2}
              tabIndex={count < 2 ? -1 : 0}
            >
              Compare now
              <ArrowRight
                size={14}
                className="transition-transform group-hover/btn:translate-x-0.5"
              />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
