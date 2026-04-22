import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Eye, Check, Heart, Scale } from "lucide-react";
import { Product } from "../types";
import { useState } from "react";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { fetchProductReviews } from "../lib/api";
import { useTracking } from "../lib/useTracking";


type Props = {
  product: Product;
  onAdd?: (product: Product) => void;
  onQuickView?: (product: Product) => void;
  viewMode?: "grid" | "list";
  isFavorite?: boolean;
  isComparing?: boolean;
  onToggleFavorite?: () => void;
  onToggleCompare?: () => void;
};

export function ProductCard({
  product,
  onAdd,
  onQuickView,
  viewMode = "grid",
  isFavorite = false,
  isComparing = false,
  onToggleFavorite,
  onToggleCompare
}: Props) {
  const [hovered, setHovered] = useState(false);
  const [added, setAdded] = useState(false);
  const cart = useCart();
  const wishlist = useWishlist();
  const { trackEvent } = useTracking();

  const productId = product.id || (product as any)._id;
  const isProdFavorite = isFavorite || wishlist.isInWishlist(productId);

  const handleToggleFavorite = () => {
    if (onToggleFavorite) {
      onToggleFavorite();
    } else {
      if (wishlist.isInWishlist(productId)) {
        wishlist.remove(productId);
      } else {
        wishlist.add(product);
      }
    }
  };

  const brandName =
    typeof product.brand === "object"
      ? (product.brand as any)?.name
      : product.brand;

  const categoryName =
    typeof product.category === "object"
      ? (product.category as any)?.name
      : product.category;

  const handleAdd = async () => {
    if (added) return;
    try {
      if (onAdd) {
        await onAdd(product);
      } else {
        await cart.add(product);
      }

      const price = product.price || (product as any).basePrice || 0;
      trackEvent('add_to_cart', product.id || (product as any)._id, 'product', { price, brand: brandName, category: categoryName });

      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      console.error("Failed to add item to cart:", err);
    }
  };




  return (
    <div
      className={`group relative flex overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-card ${viewMode === "list" ? "flex-col md:flex-row h-full w-full" : "flex-col"
        }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <Link
        href={`/products/${product.slug}`}
        className={`relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 ${viewMode === "list" ? "h-60 w-full md:h-auto md:w-60 shrink-0" : "aspect-square"
          }`}
      >
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-secondary/10">
            {product.name?.charAt(0) || "?"}
          </div>
        )}

        {/* Badge pills */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.badges?.map((badge) => (
            <span
              key={badge}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold shadow-sm backdrop-blur-md ${badge === "Sale" || badge.includes("Sale")
                ? "bg-red-500 text-white"
                : badge === "New" || badge === "Mới"
                  ? "bg-green-500 text-white"
                  : "bg-white/90 text-secondary"
                }`}
            >
              {badge}
            </span>
          ))}
        </div>
      </Link>

      {/* Action buttons (Favorite & Compare) */}
      <div className="absolute right-3 top-3 flex flex-col gap-2 z-10">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleFavorite(); }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-secondary shadow-sm backdrop-blur-sm transition-transform hover:scale-110"
        >
          <Heart size={16} className={isProdFavorite ? "fill-red-500 text-red-500" : ""} />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleCompare?.(); }}
          className={`flex h-8 w-8 items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition-transform hover:scale-110 ${isComparing ? "bg-primary text-white" : "bg-white/90 text-secondary"
            }`}
        >
          <Scale size={16} />
        </button>
      </div>

      {/* Quick View button */}
      <button
        onClick={() => onQuickView?.(product)}
        className={`absolute right-3 top-[calc(50%-52px)] flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-secondary shadow-lg backdrop-blur-sm transition duration-300 hover:bg-white ${hovered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
      >
        <Eye size={14} />
        Quick View
      </button>

      {/* Info */}
      {viewMode === "grid" ? (
        <div className="flex flex-1 flex-col justify-between p-4 flex-grow">
          <div>
            <Link href={`/products/${product.slug}`} className="block">
              <h3 className="line-clamp-2 font-heading text-sm font-semibold leading-snug text-secondary transition group-hover:text-primary">
                {product.name}
              </h3>
            </Link>

            {/* Brand + Rating */}
            <div className="mt-1.5 flex items-center justify-between text-xs text-secondary/60">
              {brandName && <span className="truncate">{brandName}</span>}
              <span className="flex shrink-0 items-center gap-1">
                <span className="text-amber-400">
                  {"★".repeat(Math.round(product.rating || 0))}
                  {"☆".repeat(5 - Math.round(product.rating || 0))}
                </span>
                {product.reviewCount != null && (
                  <span className="text-secondary/40">({product.reviewCount})</span>
                )}
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-lg font-bold text-secondary">
              ${(product.price || (product as any).basePrice || 0).toFixed(2)}
            </span>
            <button
              onClick={handleAdd}
              aria-label="Add to cart"
              className={`relative flex h-10 w-10 items-center justify-center rounded-full text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 ${added ? "bg-green-500 hover:bg-green-600" : "bg-orange-600 hover:bg-red-500"
                }`}
            >
              <div
                className={`absolute transition-all duration-300 ${added ? "scale-50 opacity-0 -rotate-45" : "scale-100 opacity-100 rotate-0"
                  }`}
              >
                <ShoppingCart size={18} />
              </div>
              <div
                className={`absolute transition-all duration-300 ${added ? "scale-100 opacity-100 rotate-0" : "scale-50 opacity-0 rotate-45"
                  }`}
              >
                <Check size={18} />
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-between p-5 md:flex-row md:items-center">
          <div className="flex-1 md:pr-4">
            <Link href={`/products/${product.slug}`} className="block">
              <h3 className="font-heading text-lg font-bold leading-snug text-secondary transition hover:text-primary">
                {product.name}
              </h3>
            </Link>
            <div className="mt-1 flex items-center gap-4 text-xs text-secondary/60">
              {brandName && <span className="font-medium text-secondary/80">{brandName}</span>}
              <span className="flex items-center gap-1">
                <span className="text-amber-400">
                  {"★".repeat(Math.round(product.rating || 0))}
                  {"☆".repeat(5 - Math.round(product.rating || 0))}
                </span>
                {product.reviewCount != null && <span className="ml-1">({product.reviewCount} reviews)</span>}
              </span>
            </div>

            {/* Specs Table (3 columns) */}
            {product.specs && Object.keys(product.specs).length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4">
                {Object.entries(product.specs).slice(0, 6).map(([key, val]) => (
                  <div key={key} className="flex flex-col rounded-lg bg-gray-50/80 px-3 py-1.5 border border-black/5">
                    <span className="text-[10px] font-semibold uppercase text-secondary/50">{key}</span>
                    <span className="text-xs font-medium text-secondary">{val}</span>
                  </div>
                ))}
              </div>
            )}
            {!product.specs && <p className="mt-3 text-sm text-secondary/70 line-clamp-2 md:line-clamp-3">{product.description}</p>}
          </div>

          <div className="mt-4 flex flex-col items-start gap-3 border-t border-black/5 pt-4 md:mt-0 md:items-end md:border-l md:border-t-0 md:pl-6 md:pt-0 min-w-[140px]">
            <span className="text-3xl font-extrabold text-secondary">
              ${(product.price || (product as any).basePrice || 0).toFixed(2)}
            </span>
            <button
              onClick={handleAdd}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 ${added ? "bg-green-500" : "bg-orange-600 hover:bg-primary"
                }`}
            >
              {added ? <Check size={18} /> : <ShoppingCart size={18} />}
              {added ? "Added" : "Add to Cart"}
            </button>

          </div>
        </div>

      )}


    </div>

  );
}
