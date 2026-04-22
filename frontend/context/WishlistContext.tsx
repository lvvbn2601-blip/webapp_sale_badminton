import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from "react";
import { Product } from "../types";
import { fetchWishlist, addToWishlist, removeFromWishlist } from "../lib/api";

type WishlistContextValue = {
  items: Product[];
  add: (product: Product) => void;
  remove: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  loading: boolean;
};

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

const getToken = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Initial load
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Load local storage first
    try {
      const stored = localStorage.getItem("wishlist");
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch { }

    setHydrated(true);

    const token = getToken();
    if (token) {
      loadServerWishlist(token);
    }

    const handleAuthChange = () => {
      const newToken = getToken();
      if (newToken) {
        loadServerWishlist(newToken);
      } else {
        setItems([]);
        localStorage.removeItem("wishlist");
      }
    };
    window.addEventListener("auth:user-updated", handleAuthChange as any);
    return () => window.removeEventListener("auth:user-updated", handleAuthChange as any);
  }, []);

  // Persist to local storage for guests/cache
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    localStorage.setItem("wishlist", JSON.stringify(items));
  }, [items, hydrated]);

  const loadServerWishlist = async (token: string) => {
    setLoading(true);
    try {
      const wishlist = await fetchWishlist(token);
      if (wishlist?.products) {
        // Map any generic products into proper frontend items
        setItems(wishlist.products);
      }
    } catch (err) {
      console.error("Wishlist sync failed", err);
    } finally {
      setLoading(false);
    }
  };

  const add = useCallback(async (product: Product) => {
    const productId = product.id || (product as any)._id;
    if (!productId) return;
    
    setItems((prev) => {
      if (prev.find((p) => (p.id || (p as any)._id) === productId)) return prev;
      return [...prev, product];
    });

    const token = getToken();
    if (token) {
      try {
        await addToWishlist(productId, token);
      } catch (err) {
        console.error("Failed to add to server wishlist", err);
      }
    }
  }, []);

  const remove = useCallback(async (productId: string) => {
    setItems((prev) => prev.filter((p) => (p.id || (p as any)._id) !== productId));

    const token = getToken();
    if (token) {
      try {
        await removeFromWishlist(productId, token);
      } catch (err) {
        console.error("Failed to remove from server wishlist", err);
      }
    }
  }, []);

  const isInWishlist = useCallback((productId: string) => {
    return items.some((p) => (p.id || (p as any)._id) === productId);
  }, [items]);

  return (
    <WishlistContext.Provider value={{ items, add, remove, isInWishlist, loading }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
};
