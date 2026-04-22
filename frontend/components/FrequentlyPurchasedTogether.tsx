import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, ShoppingCart, Loader2 } from "lucide-react";
import { Product } from "../types";
import { fetchFrequentlyPurchasedTogether } from "../lib/api";
import { useCart } from "../context/CartContext";
import { ProductCard } from "./ProductCard";

export function FrequentlyPurchasedTogether({ productIds }: { productIds: string[] }) {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { add } = useCart();

  useEffect(() => {
    let active = true;
    const fetchRecs = async () => {
      setLoading(true);
      try {
        const prodIds = productIds.filter(Boolean);
        if (prodIds.length === 0) {
          if (active) setRecommendations([]);
          return;
        }
        const data = await fetchFrequentlyPurchasedTogether(prodIds, 4);
        if (active) setRecommendations(data || []);
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchRecs();

    return () => {
      active = false;
    };
  }, [productIds.join(",")]);

  if (loading) {
    return (
      <div className="mt-12 rounded-3xl bg-secondary/5 p-6 animate-pulse">
        <h3 className="mb-4 font-heading text-xl font-bold text-secondary flex items-center gap-2">
          Frequently Purchased Together
          <Loader2 className="animate-spin text-secondary/30" size={16} />
        </h3>
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 w-24 rounded-xl bg-secondary/10" />
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <div className="mt-12 rounded-3xl bg-blue-50/50 p-6 shadow-sm border border-blue-100">
      <h3 className="mb-4 font-heading text-xl font-bold text-secondary">
        Frequently Purchased Together 💡
      </h3>
      <p className="mb-6 text-sm text-secondary/60">
        Customers who bought these items also bought the following accessories:
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4">
        {recommendations.map((product) => {
          const price = product.price ?? (product as any).basePrice ?? 0;
          return (
            <ProductCard key={product.id || (product as any)._id} product={product} />
          )
        })}
      </div>
    </div>
  );
}
