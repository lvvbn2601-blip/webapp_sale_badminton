import { createContext, ReactNode, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Product, VariantOptions } from "../types";
import {
  fetchCart,
  addToServerCart,
  updateServerCartItem,
  removeServerCartItem,
  clearServerCart,
  syncServerCart,
} from "../lib/api";

export type CartItem = {
  product: Product;
  quantity: number;
  variantOptions?: VariantOptions;
};

type CartContextValue = {
  items: CartItem[];
  selectedItems: CartItem[];
  selectedIds: string[];
  add: (product: Product, quantity?: number, variantOptions?: VariantOptions) => void;
  addProductToCart: (productId: string, quantity?: number) => boolean;
  update: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  toggleSelect: (productId: string) => void;
  selectOnly: (productId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  subtotal: number;
  count: number;
  loading: boolean;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

/* ── helpers ──────────────────────────────────────────────── */
const getItemPrice = (p: Product): number =>
  Number(p.price ?? (p as any).basePrice ?? 0);

const getProductId = (p: Product): string =>
  p.id || (p as any)._id || "";

const matchId = (product: Product, id: string): boolean =>
  getProductId(product) === id;

const matchProduct = (a: Product, b: Product): boolean =>
  getProductId(a) === getProductId(b);

const getToken = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

/* ── Convert server cart to local CartItem[] format ────── */
const serverCartToItems = (serverCart: any): CartItem[] => {
  if (!serverCart?.items) return [];
  return serverCart.items
    .filter((item: any) => item.product)
    .map((item: any) => {
      const p = item.product;
      return {
        product: {
          id: p._id || p.id,
          _id: p._id || p.id,
          name: p.name,
          slug: p.slug,
          image: p.image,
          price: p.basePrice || item.price,
          basePrice: p.basePrice || item.price,
          category: p.category,
          brand: p.brand,
          rating: p.rating || 0,
          stock: p.stock ?? 0,
          description: p.description || "",
        } as Product,
        quantity: item.quantity,
      };
    });
};

/* ── Provider ─────────────────────────────────────────────── */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const syncingRef = useRef(false);
  const itemsRef = useRef<CartItem[]>([]);

  // Keep itemsRef in sync with state at all times
  useEffect(() => { itemsRef.current = items; }, [items]);

  // Load from localStorage on mount, then sync with server if logged in
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Load localStorage cart first (instant)
    let localItems: CartItem[] = [];
    let localSelected: string[] = [];
    try {
      const stored = localStorage.getItem("cart");
      const storedSelected = localStorage.getItem("cart:selected");
      if (stored) {
        localItems = JSON.parse(stored);
        setItems(localItems);
        itemsRef.current = localItems;
      }
      if (storedSelected) {
        localSelected = JSON.parse(storedSelected);
      }
    } catch { /* ignore corrupt data */ }
    setSelectedIds(localSelected);
    setHydrated(true);

    // 2. If logged in, sync with server
    const token = getToken();
    if (token) {
      syncWithServer(localItems, token);
    }

    // 3. Listen for login/logout events
    const handleAuthChange = () => {
      const newToken = getToken();
      if (newToken) {
        // User just logged in — sync local (guest) cart to server
        syncWithServer(itemsRef.current, newToken);
      } else {
        // User logged out — clear cart so next guest starts fresh
        setItems([]);
        localStorage.removeItem("cart");
      }
    };
    window.addEventListener("auth:user-updated", handleAuthChange as any);
    return () => window.removeEventListener("auth:user-updated", handleAuthChange as any);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items, hydrated]);

  // Persist selected ids
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    localStorage.setItem("cart:selected", JSON.stringify(selectedIds));
  }, [selectedIds, hydrated]);

  // Keep selectedIds aligned with current items; auto-select new items
  const prevItemsRef = useRef<string[]>([]);
  useEffect(() => {
    const currentIds = items.map(i => getProductId(i.product)).filter(Boolean);
    const prevIds = prevItemsRef.current;
    
    // Find newly added items (in currentIds but not in prevIds)
    const newIds = currentIds.filter(id => !prevIds.includes(id));
    
    if (newIds.length > 0) {
      // Auto-select new items
      setSelectedIds(prev => {
        const set = new Set([...prev, ...newIds]);
        // Also remove any deleted items from selectedIds
        return Array.from(set).filter(id => currentIds.includes(id));
      });
    } else {
      // Just clean up any selectedIds that are no longer in items
      setSelectedIds(prev => prev.filter(id => currentIds.includes(id)));
    }
    
    prevItemsRef.current = currentIds;
  }, [items]);

  /* ── Server sync logic ─────────────────────── */
  const syncWithServer = async (localItems: CartItem[], token: string) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setLoading(true);

    try {
      // If we have local items, merge them into the server cart
      if (localItems.length > 0) {
        const clientItems = localItems.map(ci => ({
          productId: getProductId(ci.product),
          quantity: ci.quantity,
        }));
        const serverCart = await syncServerCart(clientItems, token);
        const merged = serverCartToItems(serverCart);
        setItems(merged);
      } else {
        // No local items — just fetch what's on the server
        const serverCart = await fetchCart(token);
        const serverItems = serverCartToItems(serverCart);
        setItems(serverItems);
      }
    } catch (err) {
      console.warn("Cart sync failed, using local cart", err);
    } finally {
      setLoading(false);
      syncingRef.current = false;
    }
  };

  const loadServerCart = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const serverCart = await fetchCart(token);
      setItems(serverCartToItems(serverCart));
    } catch { /* silent */ }
  };

  /* ── Cart operations ───────────────────────── */
  const add = useCallback((product: Product, quantity = 1, variantOptions?: VariantOptions) => {
    const token = getToken();

    // Optimistically update local state
    setItems((prev) => {
      const existing = prev.find((i) => matchProduct(i.product, product));
      if (existing) {
        return prev.map((i) =>
          matchProduct(i.product, product)
            ? { ...i, quantity: i.quantity + quantity, variantOptions: variantOptions || i.variantOptions }
            : i
        );
      }
      return [...prev, { product, quantity, variantOptions }];
    });

    // Sync to server in background
    if (token) {
      addToServerCart(getProductId(product), quantity, token).catch(console.warn);
    }
  }, []);

  const addProductToCart = useCallback(
    (productId: string, quantity = 1): boolean => {
      const existing = items.find((i) => matchId(i.product, productId));
      if (existing) {
        add(existing.product, quantity);
        return true;
      }
      return false;
    },
    [items, add]
  );

  const update = useCallback((productId: string, quantity: number) => {
    const token = getToken();

    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => !matchId(i.product, productId)));
      if (token) removeServerCartItem(productId, token).catch(console.warn);
      return;
    }

    setItems((prev) =>
      prev.map((i) => (matchId(i.product, productId) ? { ...i, quantity } : i))
    );

    if (token) {
      updateServerCartItem(productId, quantity, token).catch(console.warn);
    }
  }, []);

  const remove = useCallback((productId: string) => {
    const token = getToken();
    setItems((prev) => prev.filter((i) => !matchId(i.product, productId)));
    if (token) {
      removeServerCartItem(productId, token).catch(console.warn);
    }
  }, []);

  const clear = useCallback(() => {
    const token = getToken();
    setItems([]);
    if (token) {
      clearServerCart(token).catch(console.warn);
    }
  }, []);

  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + getItemPrice(item.product) * item.quantity, 0),
    [items]
  );

  const selectedItems = useMemo(
    () => items.filter(i => selectedIds.includes(getProductId(i.product))),
    [items, selectedIds]
  );

  const count = useMemo(() => items.reduce((acc, i) => acc + i.quantity, 0), [items]);

  const toggleSelect = useCallback((productId: string) => {
    setSelectedIds(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  }, []);

  const selectOnly = useCallback((productId: string) => {
    setSelectedIds([productId]);
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(items.map(i => getProductId(i.product)).filter(Boolean));
  }, [items]);

  const deselectAll = useCallback(() => setSelectedIds([]), []);

  return (
    <CartContext.Provider
      value={{
        items,
        selectedItems,
        selectedIds,
        add,
        addProductToCart,
        update,
        remove,
        clear,
        toggleSelect,
        selectOnly,
        selectAll,
        deselectAll,
        subtotal,
        count,
        loading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
