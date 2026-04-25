import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { Product } from "../types";
import { resolveCategory } from "../lib/compareConfig";

/* ── Types ──────────────────────────────────────────────── */

export type CompareContextValue = {
  /** Products currently in the comparison list (max 3, same category) */
  items: Product[];
  /** Resolved category slug of the current list (empty when list is empty) */
  categorySlug: string;
  /** Add a product — returns an error message string if rejected, else null */
  add: (product: Product) => string | null;
  /** Remove a product by id */
  remove: (productId: string) => void;
  /** Toggle a product in/out of the list */
  toggle: (product: Product) => string | null;
  /** Check whether a product is currently in the list */
  isComparing: (productId: string) => boolean;
  /** Clear the entire list */
  clear: () => void;
  /** Number of items */
  count: number;
};

const CompareContext = createContext<CompareContextValue | undefined>(undefined);

/* ── Helpers ────────────────────────────────────────────── */

const MAX_COMPARE = 3;

const getProductId = (p: Product): string => p.id || (p as any)._id || "";

/* ── Provider ───────────────────────────────────────────── */

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Product[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("compare");
      if (stored) setItems(JSON.parse(stored));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    localStorage.setItem("compare", JSON.stringify(items));
  }, [items, hydrated]);

  /* Derived category slug */
  const categorySlug = items.length > 0 ? resolveCategory(items[0]) : "";

  /* ── Actions ──────────────────────────────────────────── */

  const add = useCallback(
    (product: Product): string | null => {
      const id = getProductId(product);
      if (!id) return "Invalid product";

      // Already in list?
      if (items.some((p) => getProductId(p) === id)) {
        return "Already in compare list";
      }

      // Max check
      if (items.length >= MAX_COMPARE) {
        return `You can compare up to ${MAX_COMPARE} products at a time`;
      }

      // Same-category check
      const prodCat = resolveCategory(product);
      if (items.length > 0 && prodCat !== resolveCategory(items[0])) {
        const existingCatName =
          typeof items[0].category === "object"
            ? (items[0].category as any)?.name
            : items[0].category;
        return `You can only compare products in the same category (${existingCatName})`;
      }

      setItems((prev) => [...prev, product]);
      return null;
    },
    [items]
  );

  const remove = useCallback((productId: string) => {
    setItems((prev) => prev.filter((p) => getProductId(p) !== productId));
  }, []);

  const toggle = useCallback(
    (product: Product): string | null => {
      const id = getProductId(product);
      if (items.some((p) => getProductId(p) === id)) {
        remove(id);
        return null;
      }
      return add(product);
    },
    [items, add, remove]
  );

  const isComparing = useCallback(
    (productId: string) => items.some((p) => getProductId(p) === productId),
    [items]
  );

  const clear = useCallback(() => setItems([]), []);

  return (
    <CompareContext.Provider
      value={{
        items,
        categorySlug,
        add,
        remove,
        toggle,
        isComparing,
        clear,
        count: items.length,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export const useCompare = () => {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
};
