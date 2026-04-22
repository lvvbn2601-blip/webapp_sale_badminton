import Head from "next/head";
import { Layout } from "../components/Layout";
import { ProductCard } from "../components/ProductCard";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { Heart, ShoppingBag, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Product } from "../types";

export default function WishlistPage() {
  const wishlist = useWishlist();
  const cart = useCart();
  const [moving, setMoving] = useState<string | null>(null);

  const handleMoveToCart = (product: Product) => {
    const pid = product.id || (product as any)._id;
    setMoving(pid);
    cart.add(product);
    wishlist.remove(pid);
    setTimeout(() => setMoving(null), 500);
  };

  const handleClearWishlist = () => {
    wishlist.items.forEach(item => {
      wishlist.remove(item.id || (item as any)._id);
    });
  }

  return (
    <Layout>
      <Head>
        <title>My Wishlist - Badminton Hub</title>
        <meta name="description" content="View and manage your saved items on Badminton Hub." />
      </Head>

      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-20 pt-8">
        <div className="container-default">
          {/* Header */}
          <div className="mb-10 flex flex-col items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10 md:flex-row md:px-10 md:py-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-500/10 shrink-0">
                <Heart size={28} className="fill-red-500" />
              </div>
              <div>
                <h1 className="font-heading text-3xl font-extrabold text-secondary dark:text-white">
                  My Wishlist
                </h1>
                <p className="mt-1 text-sm font-medium text-secondary/60 dark:text-gray-400">
                  {wishlist.items.length} {wishlist.items.length === 1 ? "item" : "items"} saved for later
                </p>
              </div>
            </div>

            {wishlist.items.length > 0 && (
              <button
                onClick={handleClearWishlist}
                className="text-sm font-semibold text-secondary/50 hover:text-red-500 dark:text-gray-400 hover:dark:text-red-400 transition"
              >
                Clear all items
              </button>
            )}
          </div>

          {/* Content */}
          {wishlist.loading && wishlist.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="mt-4 font-medium text-secondary/50 dark:text-gray-400">Loading your wishlist...</p>
            </div>
          ) : wishlist.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl bg-white py-24 shadow-sm ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10 text-center px-4">
              <div className="relative mb-6">
                <div className="absolute -inset-4 rounded-full bg-red-50 blur-xl dark:bg-red-500/10"></div>
                <Heart size={64} className="relative text-red-200 dark:text-gray-600" />
              </div>
              <h2 className="font-heading text-2xl font-bold text-secondary dark:text-white">
                Your wishlist is empty
              </h2>
              <p className="mt-2 max-w-md text-secondary/60 dark:text-gray-400 mb-8 flex-col flex items-center">
                <span>Save items you love to your wishlist to easily find them later or share with friends.</span>
              </p>
              <Link
                href="/products"
                className="btn-primary flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5"
              >
                Explore Products <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {wishlist.items.map((product) => {
                const pid = product.id || (product as any)._id;
                const isMoving = moving === pid;
                // Assuming stock is attached to product. Either check product.stock or default to true if undefined.
                const inStock = product.stock !== undefined ? product.stock > 0 : true;

                return (
                  <div key={pid} className="relative group/card isolate overflow-hidden rounded-2xl">
                    <ProductCard product={product} />
                    
                    {/* Dark/Dim background overlay on hover to prioritize actions */}
                    <div className="absolute inset-x-0 inset-y-0 rounded-2xl bg-white/70 dark:bg-black/70 backdrop-blur-sm opacity-0 group-hover/card:opacity-100 pointer-events-none transition duration-300 z-10" />

                    {/* Overlay Actions Panel */}
                    <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-all duration-300 pointer-events-none z-20 flex flex-col items-center justify-center gap-3 w-full px-6 translate-y-4 group-hover/card:translate-y-0">
                        {/* Move to Cart Button */}
                        <button 
                            onClick={(e) => { 
                                e.preventDefault(); 
                                if (!inStock) return;
                                handleMoveToCart(product); 
                            }}
                            disabled={!inStock || isMoving}
                            className={`pointer-events-auto flex w-full justify-center items-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold shadow-xl transition-all duration-300 ${
                              inStock 
                                ? "bg-primary text-white hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]" 
                                : "bg-red-50 text-red-500 opacity-80 cursor-not-allowed dark:bg-red-500/10 dark:text-red-400"
                            }`}
                        >
                            {isMoving ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                            ) : inStock ? (
                                <>
                                  <ShoppingBag size={18} />
                                  Move to Cart
                                </>
                            ) : (
                                "Coming Soon"
                            )}
                        </button>

                        {/* Remove Button */}
                        <button 
                            onClick={(e) => { 
                                e.preventDefault(); 
                                if (window.confirm("Are you sure you want to remove this item?")) wishlist.remove(pid); 
                            }}
                            className="pointer-events-auto flex w-full justify-center items-center gap-2 rounded-xl bg-gray-100 dark:bg-gray-800 border border-black/5 dark:border-white/10 px-5 py-3 text-sm font-bold text-secondary dark:text-white shadow-sm hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/20 dark:hover:text-red-400 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Remove
                        </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
