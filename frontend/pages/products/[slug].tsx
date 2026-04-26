import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Layout } from "../../components/Layout";
import { products as mockProducts } from "../../data/mockData";
import { ProductGrid } from "../../components/ProductGrid";
import { SimilarProducts } from "../../components/SimilarProducts";
import { ReviewCard } from "../../components/ReviewCard";
import {
  Minus, Plus, Star, ShoppingCart, Zap, Truck, RotateCcw, Shield,
  ChevronRight, Check, Package, Heart, Share2, TrendingUp, Activity,
  ThumbsUp, ThumbsDown,
} from "lucide-react";
import { fetchProductBySlug, fetchProducts, fetchProductReviews } from "../../lib/api";
import { GetServerSideProps } from "next";
import { Product, VariantOptions } from "../../types";
import { useCart } from "../../context/CartContext";
import { useTracking } from "../../lib/useTracking";
import SmartVoucherPopup from "../../components/SmartVoucherPopup";

// Dynamic variant component driven by product specs
import DynamicVariantOptions, { STRING_TYPES, getSpecCount, SPEC_OPTIONS } from "../../components/product-detail/DynamicVariantOptions";
import PurchasePolicy from "../../components/product-detail/PurchasePolicy";

type Props = { product: Product | null; related: Product[]; allCategoryProducts: Product[] };

/* ── helpers ─────────────────────────────────────────────── */
const resolveField = (field: any): string => {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field.name ?? field.slug ?? String(field);
};
const getPrice = (p: any): number => Number(p.price ?? p.basePrice ?? 0);
const getStock = (p: any): number => Number(p.stock ?? 0);



/* ── Tabs ────────────────────────────────────────────────── */
const TABS = ["Tech Specs", "Description", "Reviews", "Performance", "Guide"] as const;
type Tab = (typeof TABS)[number];

/* ═══════════════════════════════════════════════════════════ */
export default function ProductDetailPage({ product, related, allCategoryProducts }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [addError, setAddError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("Tech Specs");
  const [wishlisted, setWishlisted] = useState(false);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  // Reviews state
  const [realReviews, setRealReviews] = useState<any[]>([]);
  const [reviewFilterRating, setReviewFilterRating] = useState<number | "all">("all");
  const [reviewFilterVerified, setReviewFilterVerified] = useState(false);
  const [reviewSort, setReviewSort] = useState<"newest" | "helpful" | "rating">("newest");
  const [visibleReviewsCount, setVisibleReviewsCount] = useState(4);

  // ── Dynamic Variant Selections (driven by product specs) ──
  const [variantSelections, setVariantSelections] = useState<Record<string, string>>({});

  // ── Stringing service state ──
  const [addStringService, setAddStringService] = useState(false);
  const [stringType, setStringType] = useState("bg66u");
  const [tension, setTension] = useState(24);

  const cart = useCart();
  const router = useRouter();
  const { trackEvent, trackHover, trackDwell, fetchRecommendations, fetchSmartVouchers, recommendations, smartVouchers } = useTracking();
  const specHoverTimerRef = useRef<Record<string, number>>({});
  const pageEnteredRef = useRef<number>(Date.now());
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [recLabel, setRecLabel] = useState<string>('You May Also Like');
  const [recDescription, setRecDescription] = useState<string>('');

  useEffect(() => {
    if (product) {
      const pid = product.id || (product as any)._id;
      trackEvent('view', pid, 'product', {
        price: getPrice(product),
        brand: resolveField((product as any).brand),
        category: resolveField((product as any).category),
        productSpecs: product.specs,
      });

      // Fetch personalized recommendations
      fetchRecommendations().then((rec) => {
        if (rec?.products?.length) {
          // Filter out current product from recommendations
          const filtered = rec.products.filter((p: any) => (p._id || p.id) !== pid);
          setRecommendedProducts(filtered.slice(0, 6));
        }
        if (rec?.strategyLabel) setRecLabel(rec.strategyLabel);
        if (rec?.strategyDescription) setRecDescription(rec.strategyDescription);
      });

      // Fetch smart vouchers
      fetchSmartVouchers();

      // Track page dwell time on unmount
      pageEnteredRef.current = Date.now();
      return () => {
        const dwellMs = Date.now() - pageEnteredRef.current;
        if (dwellMs > 3000) {
          trackDwell(pid, dwellMs, {
            brand: resolveField((product as any).brand),
            category: resolveField((product as any).category),
          });
        }
      };
    }
  }, [product?.slug]);


  // Reset on product change
  useEffect(() => {
    setQuantity(1);
    setAddedToCart(false);
    setAddError("");
    setActiveTab("Tech Specs");
    setAddStringService(false);
    setStringType("bg66u");
    setTension(24);
    setSelectedImageIdx(0);
    // Initialize variant selections from the product's specs
    if (product?.specs) {
      const initial: Record<string, string> = {};
      for (const [key, value] of Object.entries(product.specs)) {
        initial[key] = String(value);
      }
      setVariantSelections(initial);
    } else {
      setVariantSelections({});
    }

    if (product && (product.id || (product as any)._id)) {
      const pid = product.id || (product as any)._id;
      fetchProductReviews(pid)
        .then(res => setRealReviews(Array.isArray(res) ? res : []))
        .catch(() => setRealReviews([]));
    }
  }, [product?.slug]);

  /* ── Price computation ─────────────────────── */
  const computedPrice = useMemo(() => {
    if (!product) return 0;
    let base = getPrice(product);
    if (addStringService) {
      const st = STRING_TYPES.find(s => s.id === stringType);
      base += st?.price || 15;
    }
    return base;
  }, [product, addStringService, stringType]);

  /* ── Validate variant selections ─────────── */
  const hasInvalidSelection = useMemo(() => {
    if (!product?.specs || allCategoryProducts.length === 0) return false;
    for (const [specKey, specValue] of Object.entries(variantSelections)) {
      if (!(specKey in SPEC_OPTIONS)) continue; // skip specs without options
      const count = getSpecCount(allCategoryProducts, specKey, specValue);
      if (count === 0) return true;
    }
    return false;
  }, [product, variantSelections, allCategoryProducts]);

  /* ── Variant options for cart (now dynamic) ── */
  const buildVariantOptions = useCallback((): VariantOptions => {
    const opts: VariantOptions = {};
    // Map dynamic selections into VariantOptions
    if (variantSelections["Color"]) opts.selectedColor = variantSelections["Color"];
    if (variantSelections["Grip Circumference (G)"]) opts.selectedGrip = variantSelections["Grip Circumference (G)"];
    if (variantSelections["Size (EU)"]) opts.selectedSize = variantSelections["Size (EU)"];
    if (variantSelections["Bag Type"]) opts.selectedBagType = variantSelections["Bag Type"];
    if (variantSelections["Type"]) opts.selectedMaterial = variantSelections["Type"];
    if (variantSelections["Speed"]) opts.selectedSpeed = Number(variantSelections["Speed"]);
    if (variantSelections["Accessory Type"]) opts.accessoryType = variantSelections["Accessory Type"];
    // Stringing service
    if (addStringService) {
      opts.addStringingService = true;
      opts.stringType = stringType;
      opts.stringTension = tension;
    }
    // Attach all selections as a generic map too
    (opts as any).specSelections = { ...variantSelections };
    return opts;
  }, [variantSelections, addStringService, stringType, tension]);

  const handleVariantSelect = useCallback((key: string, value: string) => {
    setVariantSelections(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    const opts = buildVariantOptions();
    cart.add({ ...product, price: computedPrice } as any, quantity, opts);

    // Track add to cart event
    trackEvent('add_to_cart', product.id || (product as any)._id, 'product', {
      price: computedPrice,
      brand: resolveField((product as any).brand),
      category: resolveField((product as any).category)
    });

    setAddedToCart(true);
    setAddError("");
    setTimeout(() => setAddedToCart(false), 2000);
  }, [cart, product, quantity, computedPrice, buildVariantOptions, trackEvent]);

  const handleBuyNow = useCallback(() => {
    if (!product) return;
    const opts = buildVariantOptions();
    const pid = product.id || (product as any)._id;
    cart.add({ ...product, price: computedPrice } as any, quantity, opts);
    cart.selectOnly(pid);
    setAddError("");
    router.push("/cart");
  }, [cart, product, quantity, computedPrice, buildVariantOptions, router]);

  const processedReviews = useMemo(() => {
    let result = [...realReviews].map(r => ({ ...r, id: r._id || r.id, user: r.user?.name || "User", date: new Date(r.createdAt || Date.now()).toLocaleDateString() }));
    if (reviewFilterRating !== "all") result = result.filter(r => r.rating === reviewFilterRating);
    if (reviewFilterVerified) result = result.filter(r => r.verified !== false);
    if (reviewSort === "newest") result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    else if (reviewSort === "rating") result.sort((a, b) => b.rating - a.rating);
    else if (reviewSort === "helpful") result.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0));
    return result;
  }, [realReviews, reviewFilterRating, reviewFilterVerified, reviewSort]);

  /* ── 404 ─────────────────────────────────────────── */
  if (!product) {
    return (
      <Layout>
        <div className="container-default section-padding flex flex-col items-center justify-center gap-4 text-center">
          <Package size={64} className="text-secondary/20" />
          <h1 className="font-heading text-2xl font-semibold text-secondary">Product not found</h1>
          <p className="text-secondary/60">The product you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Link href="/products" className="btn-primary mt-2">Browse Products</Link>
        </div>
      </Layout>
    );
  }

  const price = getPrice(product);
  const stock = getStock(product);
  const categoryName = resolveField((product as any).category);
  const brandName = resolveField((product as any).brand);
  const categorySlug = typeof (product as any).category === "object" ? (product as any).category?.slug : (product as any).category;
  const inStock = stock > 0;
  const rating = realReviews.reduce((acc, review) => acc + review.rating, 0) / realReviews.length || 0;
  const reviewCount = realReviews.length;

  /* ── Category label ─────────────── */
  const categoryLabel = categoryName || "Product";

  return (
    <Layout>
      <Head>
        <title>{product.name} | Badminton Hub</title>
        <meta name="description" content={product.description?.slice(0, 160)} />
      </Head>

      {/* Breadcrumb */}
      <div className="border-b border-black/5 bg-white/60 backdrop-blur-sm">
        <nav className="container-default flex items-center gap-2 py-3 text-xs text-secondary/50">
          <Link href="/" className="transition hover:text-secondary">Home</Link>
          <ChevronRight size={12} />
          <Link href="/products" className="transition hover:text-secondary">Products</Link>
          {categoryName && (
            <>
              <ChevronRight size={12} />
              <Link href={`/products?category=${categorySlug || ""}`} className="transition hover:text-secondary">{categoryName}</Link>
            </>
          )}
          <ChevronRight size={12} />
          <span className="font-semibold text-secondary/70 truncate max-w-[200px]">{product.name}</span>
        </nav>
      </div>

      {/* Main Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-12 lg:py-20 text-secondary selection:bg-primary/20 selection:text-primary">
        <div className="container-default grid gap-12 lg:grid-cols-[450px_1fr] lg:items-start xl:grid-cols-[550px_1fr]">

          {/* LEFT: STICKY GALLERY */}
          {(() => {
            // Build combined image array: prefer `images`, fall back to single `image`
            const allImages: string[] = [];
            if (Array.isArray((product as any).images) && (product as any).images.length > 0) {
              allImages.push(...(product as any).images.filter(Boolean));
            } else if (product.image) {
              allImages.push(product.image);
            }
            const activeImg = allImages[selectedImageIdx] || allImages[0] || "";
            const hasMultiple = allImages.length > 1;

            return (
              <div className="relative lg:sticky lg:top-24 space-y-4 lg:space-y-6">
                {/* Main image */}
                <div
                  className="group relative aspect-square overflow-hidden rounded-[32px] bg-white shadow-xl ring-1 ring-black/5"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (!hasMultiple) return;
                    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                      e.preventDefault();
                      setSelectedImageIdx((i) => (i - 1 + allImages.length) % allImages.length);
                    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                      e.preventDefault();
                      setSelectedImageIdx((i) => (i + 1) % allImages.length);
                    }
                  }}
                >
                  {activeImg ? (
                    <Image
                      key={activeImg}
                      src={activeImg}
                      alt={`${product.name} - Image ${selectedImageIdx + 1}`}
                      fill
                      className="object-cover transition-all duration-500 ease-out group-hover:scale-105"
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      priority
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-6xl font-bold text-secondary/10">{product.name?.charAt(0) || "?"}</div>
                  )}

                  {/* Badges */}
                  <div className="absolute left-4 top-4 flex flex-col gap-2">
                    {(product as any).isTrending && <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white shadow-md">🔥 Trending</span>}
                    {(product as any).isBestSeller && <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-md">⭐ Best Seller</span>}
                    {!inStock && <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-md">Out of Stock</span>}
                  </div>

                  {/* Right action buttons */}
                  <div className="absolute right-4 top-4 flex flex-col gap-2">
                    <button onClick={() => setWishlisted(w => !w)} className={`grid h-10 w-10 place-items-center rounded-full bg-white/90 text-secondary/60 shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-red-500 ${wishlisted ? "!text-red-500" : ""}`} aria-label="Add to wishlist">
                      <Heart size={18} fill={wishlisted ? "currentColor" : "none"} />
                    </button>
                    <button onClick={() => navigator.clipboard?.writeText(window.location.href)} className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-secondary/60 shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-secondary" aria-label="Share product">
                      <Share2 size={18} />
                    </button>
                  </div>

                  {/* Image counter badge (only for multi-image) */}
                  {hasMultiple && (
                    <div className="absolute bottom-4 right-4 rounded-full bg-black/50 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                      {selectedImageIdx + 1} / {allImages.length}
                    </div>
                  )}

                  {/* Prev/Next arrows (only for multi-image) */}
                  {hasMultiple && (
                    <>
                      <button
                        onClick={() => setSelectedImageIdx((i) => (i - 1 + allImages.length) % allImages.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-secondary shadow-lg backdrop-blur-md transition-all hover:bg-white hover:scale-105 lg:opacity-0 lg:group-hover:opacity-100"
                        aria-label="Previous image"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                      </button>
                      <button
                        onClick={() => setSelectedImageIdx((i) => (i + 1) % allImages.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-secondary shadow-lg backdrop-blur-md transition-all hover:bg-white hover:scale-105 lg:opacity-0 lg:group-hover:opacity-100"
                        aria-label="Next image"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnail strip */}
                {hasMultiple && (
                  <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                    {allImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIdx(idx)}
                        className={`relative shrink-0 h-[100px] w-[100px] overflow-hidden rounded-xl border-2 transition-all duration-200 ${idx === selectedImageIdx
                          ? "border-primary ring-2 ring-primary/20 shadow-md scale-105"
                          : "border-black/5 opacity-60 hover:opacity-100 hover:border-black/15"
                          }`}
                        aria-label={`View image ${idx + 1}`}
                      >
                        <Image
                          src={img}
                          alt={`${product.name} thumbnail ${idx + 1}`}
                          fill
                          className="object-cover"
                          sizes="100px"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* RIGHT: SCROLLING INFO */}
          <div className="flex flex-col gap-8">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                {brandName && <span className="rounded-full border border-black/10 bg-gray-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-secondary/70">{brandName}</span>}
                {categoryName && (
                  <Link href={`/products?category=${categorySlug || ""}`} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary transition hover:bg-primary/10">{categoryName}</Link>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight tracking-tight mb-2">{product.name}</h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={18} className={s <= Math.round(rating) ? "text-amber-400" : "text-gray-200"} fill={s <= Math.round(rating) ? "currentColor" : "none"} />
                  ))}
                </div>
                <span className="text-sm font-bold text-secondary">{rating.toFixed(1)}</span>
                <span className="text-sm font-medium text-secondary/50">({reviewCount} reviews)</span>
              </div>
            </div>

            {/* Price + Stock */}
            <div className="flex items-end gap-5 border-b border-black/5 pb-6">
              <span className="font-heading text-3xl font-extrabold tracking-tight text-primary">
                ${computedPrice.toFixed(2)}
              </span>
              <div className="mb-2 flex items-center gap-2">
                {inStock ? (
                  <>
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100"><Check size={14} className="text-emerald-600" /></span>
                    <span className="text-sm font-bold text-emerald-600">In Stock ({stock})</span>
                  </>
                ) : (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-600">Out of Stock</span>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-base leading-relaxed text-secondary/70 line-clamp-3">{product.description}</p>

            {/* Key Specs Row */}
            {product.specs && Object.keys(product.specs).length > 0 && (
              <div className="flex flex-wrap gap-3">
                {Object.entries(product.specs).slice(0, 3).map(([key, value]) => (
                  <div key={key} className="flex min-w-[100px] flex-col gap-0.5 rounded-xl border border-black/5 bg-gray-50/80 px-4 py-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary/50">{key}</span>
                    <span className="text-sm font-bold capitalize text-secondary">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ══════════════════════════════════════════════ */}
            {/* DYNAMIC PRODUCT VARIANT OPTIONS               */}
            {/* Driven by product specs — not hardcoded       */}
            {/* ══════════════════════════════════════════════ */}
            {product.specs && Object.keys(product.specs).length > 0 && (
              <DynamicVariantOptions
                product={product}
                allProducts={allCategoryProducts}
                selections={variantSelections}
                onSelect={handleVariantSelect}
                addStringService={addStringService}
                onToggleStringService={() => setAddStringService(v => !v)}
                stringType={stringType}
                onStringTypeChange={setStringType}
                tension={tension}
                onTensionChange={setTension}
              />
            )}

            {/* Purchase Policy */}

            {/* Quantity + Actions */}
            <div className="flex flex-col gap-4 mt-2">
              {/* Quantity selector */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-secondary">Quantity</span>
                <div className="flex items-center rounded-xl border border-black/10 bg-white">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="grid h-10 w-10 place-items-center text-secondary/60 hover:text-secondary transition" disabled={quantity <= 1}>
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center text-sm font-bold text-secondary">{quantity}</span>
                  <button onClick={() => setQuantity(q => q + 1)} className="grid h-10 w-10 place-items-center text-secondary/60 hover:text-secondary transition">
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  className={`flex h-14 flex-1 items-center justify-center gap-3 rounded-2xl border-2 text-sm font-bold uppercase tracking-widest transition-all ${addedToCart ? "border-emerald-500 bg-emerald-500 text-white" : "border-black/5 bg-white text-secondary hover:border-black/10 hover:bg-gray-50"} ${!inStock || hasInvalidSelection ? "pointer-events-none opacity-50" : ""}`}
                  onClick={handleAddToCart}
                  disabled={!inStock || hasInvalidSelection}
                >
                  {addedToCart ? (<><Check size={20} />Added to Cart!</>) : (<><ShoppingCart size={20} />Add to Cart</>)}
                </button>
                <button
                  className={`flex h-14 flex-1 items-center justify-center gap-3 rounded-2xl bg-primary text-sm font-bold uppercase tracking-widest text-white transition hover:bg-primary/90 shadow-lg shadow-primary/20 ${!inStock || hasInvalidSelection ? "pointer-events-none opacity-50" : ""}`}
                  onClick={handleBuyNow}
                  disabled={!inStock || hasInvalidSelection}
                >
                  <Zap size={20} /> Checkout
                </button>
              </div>
              {hasInvalidSelection && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                  <span className="text-amber-500 text-base">⚠️</span>
                  <p className="text-xs font-semibold text-amber-700">The selected variant is unavailable. Please choose a different option.</p>
                </div>
              )}
            </div>

            {/* SMART CROSS-SELL / UPSELL VOUCHER */}
            {smartVouchers.filter(v => ['CROSS_SELL', 'BUNDLE_DEAL'].includes(v.type)).map((voucher, idx) => (
              <div key={idx} className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-emerald-50 p-4 mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-start gap-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/20 text-primary text-lg">
                    {voucher.icon || '🎁'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-secondary text-sm">{voucher.message}</h4>
                    {voucher.description && (
                      <p className="mt-1 text-xs text-secondary/60">{voucher.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(voucher.code); }}
                    className="h-10 rounded-xl bg-primary px-4 text-xs font-bold text-white hover:bg-primary/90 transition shadow-sm whitespace-nowrap"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            ))}

            <PurchasePolicy />

            {addError && <p className="text-sm font-medium text-red-500">{addError}</p>}
          </div>
        </div>
      </section>

      {/* Tabs Section */}
      <section className="bg-white py-10 lg:py-16">
        <div className="container-default max-w-5xl">
          <div className="flex flex-wrap gap-2 border-b border-black/10 pb-4">
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`relative rounded-full px-6 py-2.5 text-sm font-bold transition ${activeTab === tab ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-gray-100 text-secondary/60 hover:bg-gray-200 hover:text-secondary"}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="py-10">
            {activeTab === "Tech Specs" && (
              <div className="grid gap-8 md:grid-cols-2">
                <div>
                  <h3 className="font-heading text-2xl font-bold text-secondary mb-6">Complete Specifications</h3>
                  <div
                    className="rounded-3xl border border-black/5 bg-gray-50/50 p-6"
                    onMouseEnter={() => {
                      if (product) specHoverTimerRef.current['specs_area'] = Date.now();
                    }}
                    onMouseLeave={() => {
                      if (product && specHoverTimerRef.current['specs_area']) {
                        const holdMs = Date.now() - specHoverTimerRef.current['specs_area'];
                        trackHover(
                          product.id || (product as any)._id,
                          'specs_area',
                          holdMs,
                          { brand: resolveField((product as any).brand), category: resolveField((product as any).category) }
                        );
                        delete specHoverTimerRef.current['specs_area'];
                      }
                    }}
                  >
                    <ul className="divide-y divide-black/5 text-sm">
                      {product.specs && Object.keys(product.specs).length > 0 ? (
                        Object.entries(product.specs).map(([k, v]) => (
                          <li key={k} className="flex justify-between py-3">
                            <span className="font-semibold text-secondary/60">{k}</span>
                            <span className="font-bold text-secondary text-right">{v}</span>
                          </li>
                        ))
                      ) : (
                        <li className="py-3 text-secondary/50">No detailed specs available.</li>
                      )}
                    </ul>
                  </div>
                </div>
                <div className="space-y-6">
                  <h3 className="font-heading text-2xl font-bold text-secondary">Technologies</h3>
                  <div className="flex items-start gap-4 rounded-2xl bg-gray-50 p-5">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Zap size={24} /></div>
                    <div>
                      <h4 className="font-bold text-secondary">Aero-Frame Design</h4>
                      <p className="mt-1 text-sm text-secondary/60">Reduces air resistance for faster swing speeds and enhanced maneuverability.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 rounded-2xl bg-gray-50 p-5">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Shield size={24} /></div>
                    <div>
                      <h4 className="font-bold text-secondary">Graphite Resin</h4>
                      <p className="mt-1 text-sm text-secondary/60">Improves elasticity and holds the shuttlecock on the string bed longer.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "Description" && (
              <div className="">
                <div>
                  <h3 className="font-heading text-2xl font-bold text-secondary mb-4">Description</h3>
                  <p className="text-secondary/60 leading-relaxed mb-6">{product?.description}</p>
                </div>
              </div>
            )}

            {activeTab === "Reviews" && (
              <div className="max-w-3xl space-y-8">
                <div className="flex flex-col md:flex-row items-center gap-8 rounded-3xl bg-gray-50 p-8">
                  <div className="text-center md:text-left shrink-0">
                    <p className="font-bold text-3xl font-black text-secondary">{rating.toFixed(1)}/5</p>
                    <div className="mt-2 flex items-center justify-center md:justify-start gap-1">
                      {[1, 2, 3, 4, 5].map(s => <Star key={s} size={18} className={s <= Math.round(rating) ? "text-amber-400" : "text-gray-200"} fill={s <= Math.round(rating) ? "currentColor" : "none"} />)}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-secondary/40">Based on {realReviews.length} reviews</p>
                  </div>
                  <div className="flex-1 w-full space-y-2">
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = realReviews.filter(r => r.rating === star).length;
                      const pct = realReviews.length ? (count / realReviews.length) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-3 text-sm">
                          <span className="w-4 font-bold text-secondary/60">{star}</span>
                          <Star size={12} className="text-amber-400 shrink-0" fill="currentColor" />
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-black transition-all" style={{ width: `${pct}%` }} /></div>
                          <span className="w-8 text-right font-semibold text-secondary/40">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6 border-t border-black/5">
                  <div className="flex items-center gap-3">
                    <select value={reviewFilterRating} onChange={e => setReviewFilterRating(e.target.value === "all" ? "all" : Number(e.target.value))} className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-secondary outline-none focus:border-primary">
                      <option value="all">All Ratings</option>
                      {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                    </select>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-secondary">
                      <div className="relative flex items-center">
                        <input type="checkbox" checked={reviewFilterVerified} onChange={e => setReviewFilterVerified(e.target.checked)} className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-black/20 bg-white transition-all checked:border-primary checked:bg-primary" />
                        <Check size={14} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={3} />
                      </div>
                      Verified Only
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-secondary/60">Sort by:</span>
                    <select value={reviewSort} onChange={e => setReviewSort(e.target.value as any)} className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-secondary outline-none focus:border-primary">
                      <option value="newest">Newest First</option>
                      <option value="helpful">Most Helpful</option>
                      <option value="rating">Highest Rating</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4">
                  {processedReviews.slice(0, visibleReviewsCount).map(review => <ReviewCard key={review.id} review={review} />)}
                  {processedReviews.length === 0 && (
                    <div className="text-center py-10 bg-gray-50 rounded-2xl"><p className="text-secondary/50 font-semibold">No reviews found matching your criteria.</p></div>
                  )}
                </div>

                {visibleReviewsCount < processedReviews.length && (
                  <div className="text-center pt-4">
                    <button onClick={() => setVisibleReviewsCount(c => c + 4)} className="inline-flex items-center justify-center h-12 rounded-full border border-black/10 bg-white px-8 text-sm font-bold text-secondary transition hover:bg-gray-50 hover:border-black/20">See more reviews</button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "Performance" && (
              <div className="grid gap-10 md:grid-cols-2 items-center">
                <div>
                  <h3 className="font-heading text-2xl font-bold text-secondary mb-4">Performance Matrix</h3>
                  <p className="text-secondary/60 leading-relaxed mb-6">Based on laboratory testing and professional player feedback.</p>
                  <div className="space-y-5">
                    {[{ label: "Power", val: 85 }, { label: "Control", val: 92 }, { label: "Speed", val: 88 }, { label: "Defense", val: 78 }].map(stat => (
                      <div key={stat.label}>
                        <div className="flex justify-between text-sm font-bold text-secondary mb-1"><span>{stat.label}</span><span>{stat.val}/100</span></div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-black transition-all" style={{ width: `${stat.val}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative aspect-square max-w-[400px] mx-auto w-full">
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-full h-full rounded-full border border-dashed border-black/10 flex items-center justify-center">
                      <div className="w-3/4 h-3/4 rounded-full border border-dashed border-black/10 flex items-center justify-center">
                        <div className="w-1/2 h-1/2 rounded-full border border-dashed border-black/10 bg-gray-50/50" />
                      </div>
                    </div>
                    <Activity size={120} className="absolute text-primary/20" />
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                      <polygon points="50,20 80,50 60,85 30,70" fill="rgba(200, 240, 48, 0.4)" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>
            )}



            {activeTab === "Guide" && (
              <div className="space-y-8 max-w-4xl mx-auto">
                <div className="text-center">
                  <h3 className="font-heading text-3xl font-bold text-secondary">Is this right for you?</h3>
                  <p className="mt-2 text-secondary/60">Reduce returns and play your best by matching gear to your style.</p>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-[24px] bg-emerald-50 p-8 border border-emerald-100">
                    <div className="flex items-center gap-3 text-emerald-600 mb-6">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100"><ThumbsUp size={24} /></div>
                      <h4 className="text-xl font-bold">Highly Suitable For</h4>
                    </div>
                    <ul className="space-y-4">
                      <li className="flex items-start gap-3 text-secondary/80"><Check size={20} className="shrink-0 text-emerald-500 mt-0.5" /><span><strong>Aggressive Players:</strong> Players who rely on powerful attacks from the back court.</span></li>
                      <li className="flex items-start gap-3 text-secondary/80"><Check size={20} className="shrink-0 text-emerald-500 mt-0.5" /><span><strong>Intermediate to Pros:</strong> Designed for players with developed techniques.</span></li>
                    </ul>
                  </div>
                  <div className="rounded-[24px] bg-red-50 p-8 border border-red-100">
                    <div className="flex items-center gap-3 text-red-600 mb-6">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-red-100"><ThumbsDown size={24} /></div>
                      <h4 className="text-xl font-bold">Not Recommended For</h4>
                    </div>
                    <ul className="space-y-4">
                      <li className="flex items-start gap-3 text-secondary/80"><Minus size={20} className="shrink-0 text-red-500 mt-0.5" /><span><strong>Beginners:</strong> May cause arm fatigue without proper technique.</span></li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Content-Based Similar Products (AI Engine) */}
      <SimilarProducts
        productId={product.id || (product as any)._id}
        currentSlug={product.slug}
        limit={6}
      />
/*
      {/* Smart Recommendations Section 
      {(recommendedProducts.length > 0 || related.length > 0) && (
        <section className="section-padding bg-background">
          <div className="container-default space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-2xl font-bold text-secondary">
                  {recLabel || 'You May Also Like'}
                </h2>
                {recDescription && (
                  <p className="mt-1 text-sm text-secondary/50">{recDescription}</p>
                )}
              </div>
              <Link href={recommendations?.brand ? `/products?brand=${recommendations.brand}` : '/products'} className="flex items-center gap-1 text-sm font-semibold text-primary transition hover:gap-2">View all<ChevronRight size={16} /></Link>
            </div>
            <ProductGrid products={recommendedProducts.length > 0 ? recommendedProducts : related.slice(0, 6)} />
          </div>
        </section>
      )}
      */}
      {/* Smart Voucher Popup */}
      <SmartVoucherPopup vouchers={smartVouchers} />
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = ctx.params?.slug as string;
  try {
    const product = await fetchProductBySlug(slug);
    const catId = typeof product.category === "object" ? (product.category as any)?._id ?? (product.category as any)?.id : product.category;
    const relatedRes = await fetchProducts({ category: catId, limit: 100 });
    const allCategoryProducts = relatedRes.data || [];
    const related = allCategoryProducts.filter(p => p.slug !== product.slug).slice(0, 4);
    return { props: { product, related, allCategoryProducts } };
  } catch (error) {
    console.warn("Detail fallback to mock", error);
    const fallback = mockProducts.find(p => p.slug === slug) || null;
    const related = mockProducts.filter(p => p.category === fallback?.category && p.slug !== slug).slice(0, 4);
    const allCategoryProducts = mockProducts.filter(p => p.category === fallback?.category);
    return { props: { product: fallback, related, allCategoryProducts } };
  }
};
