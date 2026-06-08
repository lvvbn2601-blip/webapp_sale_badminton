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
  id?: string;
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
  update: (cartItemId: string, quantity: number) => void;
  remove: (cartItemId: string) => void;
  clear: () => void;
  clearSelected: () => void;
  toggleSelect: (cartItemId: string) => void;
  selectOnly: (cartItemId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  subtotal: number;
  count: number;
  loading: boolean;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

/* ── helpers ──────────────────────────────────────────────── */
const getItemPrice = (item: CartItem): number => {
  const p = item.product;
  const base = Number(p.price ?? (p as any).basePrice ?? 0);
  const stringFee = Number(item.variantOptions?.stringPrice ?? 0);
  return base + stringFee;
};

const getProductId = (p: Product): string =>
  p.id || (p as any)._id || "";

const generateCartItemId = (productId: string, vo?: VariantOptions) => {
  if (!vo || Object.keys(vo).length === 0) return `${productId}_default`;
  const keys = Object.keys(vo).sort();
  const sortedVo: any = {};
  for (const k of keys) {
    if (vo[k as keyof VariantOptions] !== undefined) {
      sortedVo[k] = vo[k as keyof VariantOptions];
    }
  }
  return `${productId}_${JSON.stringify(sortedVo)}`;
};

export const getCartItemId = (item: CartItem): string => 
  item.id || generateCartItemId(getProductId(item.product), item.variantOptions);

const getToken = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

/* ── Convert server cart to local CartItem[] format ────── */
const serverCartToItems = (serverCart: any): CartItem[] => {
  if (!serverCart?.items) return [];
  return serverCart.items
    .filter((item: any) => item.product)
    .map((item: any) => {
      const p = item.product;
      const pid = p._id || p.id;
      return {
        id: generateCartItemId(pid, item.variantOptions),
        product: {
          id: pid,
          _id: pid,
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
        variantOptions: item.variantOptions,
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

  // Keep selectedIds aligned with current items
  useEffect(() => {
    if (!hydrated) return;
    const currentIds = items.map(i => getCartItemId(i));
    setSelectedIds(prev => {
      const valid = prev.filter(id => currentIds.includes(id));
      if (valid.length === prev.length) return prev;
      return valid;
    });
  }, [items, hydrated]);

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
          variantOptions: ci.variantOptions,
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

    const productId = getProductId(product);
    const cartItemId = generateCartItemId(productId, variantOptions);

    setSelectedIds(prev => prev.includes(cartItemId) ? prev : [...prev, cartItemId]);

    // Optimistically update local state
    setItems((prev) => {
      const existing = prev.find((i) => getCartItemId(i) === cartItemId);
      if (existing) {
        return prev.map((i) =>
          getCartItemId(i) === cartItemId
            ? { ...i, quantity: i.quantity + quantity, variantOptions: variantOptions || i.variantOptions }
            : i
        );
      }
      return [...prev, { id: cartItemId, product, quantity, variantOptions }];
    });

    // Sync to server in background
    if (token) {
      addToServerCart(getProductId(product), quantity, token, variantOptions).catch(console.warn);
    }
  }, []);

  const addProductToCart = useCallback(
    (productId: string, quantity = 1): boolean => {
      // For simple addProduct without variant options
      const existing = items.find((i) => getProductId(i.product) === productId && (!i.variantOptions || Object.keys(i.variantOptions).length === 0));
      if (existing) {
        add(existing.product, quantity, existing.variantOptions);
        return true;
      }
      return false;
    },
    [items, add]
  );

  const update = useCallback((cartItemId: string, quantity: number) => {
    const token = getToken();
    const existing = itemsRef.current.find(i => getCartItemId(i) === cartItemId);

    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => getCartItemId(i) !== cartItemId));
      if (token && existing) removeServerCartItem(getProductId(existing.product), token, existing.variantOptions).catch(console.warn);
      return;
    }

    setItems((prev) =>
      prev.map((i) => (getCartItemId(i) === cartItemId ? { ...i, quantity } : i))
    );

    if (token && existing) {
      updateServerCartItem(getProductId(existing.product), quantity, token, existing.variantOptions).catch(console.warn);
    }
  }, []);

  const remove = useCallback((cartItemId: string) => {
    const token = getToken();
    const existing = itemsRef.current.find(i => getCartItemId(i) === cartItemId);
    setItems((prev) => prev.filter((i) => getCartItemId(i) !== cartItemId));
    if (token && existing) {
      removeServerCartItem(getProductId(existing.product), token, existing.variantOptions).catch(console.warn);
    }
  }, []);

  const clear = useCallback(() => {
    const token = getToken();
    setItems([]);
    if (token) {
      clearServerCart(token).catch(console.warn);
    }
  }, []);

  const clearSelected = useCallback(() => {
    const token = getToken();
    const toRemove = itemsRef.current.filter((i) => selectedIds.includes(getCartItemId(i)));
    setItems((prev) => prev.filter((i) => !selectedIds.includes(getCartItemId(i))));
    if (token) {
      Promise.all(toRemove.map(item => removeServerCartItem(getProductId(item.product), token, item.variantOptions))).catch(console.warn);
    }
    setSelectedIds([]);
  }, [selectedIds]);

  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + getItemPrice(item) * item.quantity, 0),
    [items]
  );

  const selectedItems = useMemo(
    () => items.filter(i => selectedIds.includes(getCartItemId(i))),
    [items, selectedIds]
  );

  const count = useMemo(() => items.reduce((acc, i) => acc + i.quantity, 0), [items]);

  const toggleSelect = useCallback((cartItemId: string) => {
    setSelectedIds(prev =>
      prev.includes(cartItemId) ? prev.filter(id => id !== cartItemId) : [...prev, cartItemId]
    );
  }, []);

  const selectOnly = useCallback((cartItemId: string) => {
    setSelectedIds([cartItemId]);
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(items.map(i => getCartItemId(i)).filter(Boolean));
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
        clearSelected,
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
