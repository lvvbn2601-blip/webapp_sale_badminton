import Head from "next/head";
import Image from "next/image";
import { useEffect, useCallback, useMemo, useState } from "react";
import { GetServerSideProps } from "next";
import { ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { Layout } from "../../components/Layout";
import { FilterSidebar, FilterState, defaultFilters } from "../../components/FilterSidebar";
import { ProductGrid } from "../../components/ProductGrid";
import { RacketQuizModal } from "../../components/RacketQuizModal";
import { useCompare } from "../../context/CompareContext";
import {
  brands as mockBrands,
  categories as mockCategories,
  products as mockProducts,
} from "../../data/mockData";
import { Product, Category, Brand } from "../../types";
import { fetchProducts, fetchCategories, fetchBrands } from "../../lib/api";
import { fuzzyMatch } from "../../lib/vietnameseSearch";

/* ── Helpers ────────────────────────────────────────── */
const getPrice = (p: any): number => Number(p.price ?? p.basePrice ?? 0);

const getCategoryId = (p: any): string => {
  if (typeof p.category === "object" && p.category) return p.category._id || p.category.id || "";
  return String(p.category || "");
};

const getBrandId = (p: any): string => {
  if (typeof p.brand === "object" && p.brand) return p.brand._id || p.brand.id || "";
  return String(p.brand || "");
};

const sortProducts = (products: Product[], sortBy: string): Product[] => {
  const arr = [...products];
  switch (sortBy) {
    case "newest":
      return arr.reverse();
    case "price-asc":
      return arr.sort((a, b) => getPrice(a) - getPrice(b));
    case "price-desc":
      return arr.sort((a, b) => getPrice(b) - getPrice(a));
    case "rating":
      return arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case "name-asc":
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return arr;
  }
};

/* ── Page Props ─────────────────────────────────────── */
type Props = {
  initialProducts: Product[];
  categories: Category[];
  brands: Brand[];
  searchQuery?: string;
  selectedCategory?: Category | null;
  selectedBrand?: Brand | null;
};

export default function ProductListPage({ initialProducts, categories, brands, searchQuery, selectedCategory, selectedBrand }: Props) {
  // Compare context (global state)
  const compare = useCompare();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const handleToggleCompare = useCallback((product: Product) => {
    const id = product.id || (product as any)._id;
    const wasComparing = compare.isComparing(id);
    const error = compare.toggle(product);
    if (error) {
      showToast(error);
    } else {
      showToast(
        wasComparing
          ? `Removed ${product.name} from compare`
          : `Added ${product.name} to compare`
      );
    }
  }, [compare, showToast]);

  const [filters, setFilters] = useState<FilterState>(() => {
    const f = { ...defaultFilters };
    if (selectedCategory) f.categories = [selectedCategory._id || (selectedCategory as any).id];
    if (selectedBrand) f.brands = [(selectedBrand as any)._id || (selectedBrand as any).id];
    return f;
  });

  const [data, setData] = useState<Product[]>(initialProducts);

  // Sync state when URL/props change
  useEffect(() => {
    setData(initialProducts);
    setFilters(prev => {
      const f = { ...defaultFilters, sortBy: prev.sortBy };
      if (selectedCategory) f.categories = [selectedCategory._id || (selectedCategory as any).id];
      if (selectedBrand) f.brands = [(selectedBrand as any)._id || (selectedBrand as any).id];
      return f;
    });
  }, [initialProducts, selectedCategory, selectedBrand]);

  const filteredProducts = useMemo(() => {
    const filtered = data.filter((product) => {
      // Category
      if (filters.categories.length > 0) {
        const catId = getCategoryId(product);
        if (!filters.categories.includes(catId)) return false;
      }
      // Brand
      if (filters.brands.length > 0) {
        const brandId = getBrandId(product);
        if (!filters.brands.includes(brandId)) return false;
      }
      // Price
      const price = getPrice(product);
      if (price < filters.priceMin || price > filters.priceMax) return false;
      // Rating
      if (filters.rating > 0 && (product.rating || 0) < filters.rating) return false;
      // Specs
      if (filters.specs && Object.keys(filters.specs).length > 0) {
        const normalize = (s: any) => String(s || "").toLowerCase().replace(/[^a-z0-9]/gi, "");
        for (const [key, values] of Object.entries(filters.specs)) {
          if (values.length === 0) continue;
          if (!product.specs) return false;

          const targetKeyRaw = normalize(key);
          const productSpecEntry = Object.entries(product.specs).find(([pk]) => normalize(pk) === targetKeyRaw);

          if (!productSpecEntry) return false;

          const productValueRaw = normalize(productSpecEntry[1]);
          if (!values.some(v => normalize(v) === productValueRaw)) {
            return false;
          }
        }
      }

      return true;
    });

    return sortProducts(filtered, filters.sortBy);
  }, [filters, data]);

  const handleFilterChange = useCallback((next: FilterState) => {
    setFilters(next);
  }, []);

  const handleSortChange = useCallback((sort: string) => {
    setFilters((prev) => ({ ...prev, sortBy: sort }));
  }, []);

  return (
    <Layout>
      <Head>
        <title>Products | Badminton Hub</title>
        <meta
          name="description"
          content="Browse premium badminton rackets, shoes, shuttlecocks, and accessories. Free shipping over $120."
        />
      </Head>

      {/* ── Breadcrumb ──────────────────────────── */}
      <div className="border-b border-black/5 bg-white/60 backdrop-blur-sm">
        <nav className="container-default flex items-center gap-2 py-3 text-xs text-secondary/50">
          <Link href="/" className="transition hover:text-secondary">
            Home
          </Link>
          <ChevronRight size={12} />
          <span className="font-semibold text-secondary/70">Products</span>
        </nav>
      </div>

      {/* ── Hero Header ─────────────────────────── */}
      <section className="bg-gradient-to-b from-white to-background pb-2 pt-8">
        <div className="container-default">
          {selectedBrand || selectedCategory ? (
            <div className="relative overflow-hidden rounded-3xl bg-secondary shadow-card w-full h-auto min-h-[300px] flex items-center mb-8">
              {(selectedBrand?.image || selectedCategory?.image) && (
                <div className="absolute inset-0 z-0">
                  <img src={selectedBrand?.image || selectedCategory?.image} alt="Banner image" className="w-full h-full object-cover opacity-30 brightness-60" />
                </div>
              )}
              <div className="relative z-10 px-8 py-12 md:px-16 md:py-16 text-white max-w-3xl">
                <span className="inline-block rounded-full bg-white/20 px-3 py-1 mb-4 text-xs font-bold uppercase tracking-widest text-white shadow-sm backdrop-blur-md">
                  {selectedBrand ? "Brand Focus" : "Category Spotlight"}
                </span>
                <h1 className="font-heading text-4xl font-extrabold sm:text-5xl lg:text-6xl drop-shadow-lg mb-4">
                  {selectedBrand?.name || selectedCategory?.name}
                </h1>
                <p className="text-base sm:text-lg text-white drop-shadow max-w-xl">
                  {selectedBrand?.description || selectedCategory?.description || `Discover our unparalleled collection of ${(selectedBrand?.name || selectedCategory?.name)?.toLowerCase()}. Everything you need crafted for peak performance.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center pt-6 pb-4">
              {searchQuery ? (
                <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
                  Search Results
                </span>
              ) : (
                <div>
                  <Image src="https://static.vecteezy.com/system/resources/previews/035/277/450/non_2x/badminton-sport-banner-background-in-red-and-white-with-halftone-and-diagonal-stripes-vector.jpg" alt="Badmdsf" width={1200} height={900} className="h-full w-full object-contain" />
                  <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
                    Court Essentials
                  </span>
                </div>
              )}
              <h1 className="mt-3 font-heading text-3xl font-bold text-secondary sm:text-4xl">
                {searchQuery ? `Results for "${searchQuery}"` : "All Badminton Products"}
              </h1>
              <p className="mx-auto mt-2 max-w-lg text-sm text-secondary/60">
                {searchQuery
                  ? `Found ${filteredProducts.length} items matching your search.`
                  : "Find the perfect gear — from tournament rackets to performance shoes. Filter by category, brand, price, and rating."}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Main Content ────────────────────────── */}
      <section className="section-padding !pt-8">
        <div className="container-default">
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            {/* Sidebar */}
            <FilterSidebar
              categories={categories}
              brands={brands}
              filters={filters}
              onChange={handleFilterChange}
              totalResults={filteredProducts.length}
              products={data}
              onOpenQuiz={() => setIsQuizOpen(true)}
            />

            <div className="flex flex-col gap-6">
              {/* Filter Tags */}
              {(() => {
                const activeSpecTags = Object.entries(filters.specs || {}).flatMap(([k, vals]) => vals.map((v) => ({ k, v })));
                if (activeSpecTags.length === 0) return null;
                return (
                  <div className="flex flex-wrap items-center gap-2">
                    {activeSpecTags.map(({ k, v }) => (
                      <span
                        key={`${k}-${v}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm"
                      >
                        {k}: {v}
                        <button
                          onClick={() => {
                            const next = filters.specs[k].filter((item) => item !== v);
                            handleFilterChange({ ...filters, specs: { ...filters.specs, [k]: next } });
                          }}
                          className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-blue-200"
                          title={`Bỏ lọc ${v}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <button
                      onClick={() => handleFilterChange({ ...filters, specs: {} })}
                      className="ml-2 text-xs font-semibold text-secondary/50 underline transition-colors hover:text-primary"
                    >
                      Xóa tất cả
                    </button>
                  </div>
                );
              })()}

              {/* Product grid */}
              <ProductGrid
                products={filteredProducts}
                showControls
                sortBy={filters.sortBy}
                onSortChange={handleSortChange}
                compareList={compare.items}
                onToggleCompare={handleToggleCompare}
              />
            </div>
          </div>
        </div>
      </section>

      {/* CompareBar is now rendered globally by Layout */}

      {/* Global Toast */}
      {toastMessage && (
        <div className="fixed bottom-24 right-6 z-50 flex items-center gap-2 rounded-xl bg-gray-900/95 px-4 py-3 text-sm font-medium text-white shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-5 fade-in duration-300">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 font-bold text-white text-[10px]">
            ✓
          </span>
          {toastMessage}
        </div>
      )}

      {/* Racket Match Quiz Modal */}
      <RacketQuizModal
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        products={initialProducts}
      />
    </Layout>
  );
}

/* ── SSR Data Fetching ──────────────────────────────── */
export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const searchQuery = (context.query.search as string) || "";
  const catParam = context.query.category as string;
  const brandParam = context.query.brand as string;

  try {
    const [cats, brsRaw] = await Promise.all([
      fetchCategories(),
      fetchBrands(),
    ]);
    const brs = brsRaw as unknown as Brand[];

    // Resolve full objects from DB arrays based on query slugs
    const selectedCategory = catParam ? cats.find(c => c.slug === catParam || c.id === catParam || c._id === catParam) || null : null;
    const selectedBrand = brandParam ? brs.find(b => b.slug === brandParam || (b as any)._id === brandParam || b.id === brandParam) || null : null;

    // Extract actual backend IDs safely!
    const categoryId = selectedCategory?._id || selectedCategory?.id;
    const brandId = (selectedBrand as any)?._id || selectedBrand?.id;

    const productsRes = await fetchProducts({
      page: 1, limit: 50,
      search: searchQuery || undefined,
      category: categoryId,
      brand: brandId
    });

    return {
      props: {
        initialProducts: productsRes.data,
        categories: cats,
        brands: brs,
        searchQuery,
        selectedCategory,
        selectedBrand
      },
    };
  } catch (error) {
    console.warn("Product list fallback to mock", error);

    const fallbackProducts = mockProducts.filter(p => {
      let pass = true;
      if (searchQuery) pass = fuzzyMatch(p.name, searchQuery);
      if (catParam) pass = pass && getCategoryId(p) === catParam;
      if (brandParam) pass = pass && getBrandId(p) === brandParam;
      return pass;
    });

    return {
      props: {
        initialProducts: fallbackProducts,
        categories: mockCategories,
        brands: mockBrands,
        searchQuery,
        selectedCategory: null,
        selectedBrand: null
      },
    };
  }
};
