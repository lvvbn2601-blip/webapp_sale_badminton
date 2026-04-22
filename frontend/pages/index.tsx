import Head from "next/head";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Layout } from "../components/Layout";
import { CategoryCard } from "../components/CategoryCard";
import { ProductGrid } from "../components/ProductGrid";
import { ReviewCard } from "../components/ReviewCard";
import { categories as mockCategories, products as mockProducts, reviews } from "../data/mockData";
import { ArrowRight, Sparkles } from "lucide-react";
import { GetServerSideProps } from "next";
import { fetchCategories, fetchTrending, fetchBestSellers, fetchFeaturedReviews, fetchProducts } from "../lib/api";
import { Category, Product } from "../types";
import { useTracking } from "../lib/useTracking";
import SmartVoucherPopup from "../components/SmartVoucherPopup";
import { RacketQuizModal } from "../components/RacketQuizModal";

type Props = {
  categories: Category[];
  trending: Product[];
  bestSellers: Product[];
  featuredReviews: any[];
  initialProducts: Product[];
};

export default function HomePage({ categories, trending, bestSellers, featuredReviews, initialProducts }: Props) {
  const { recommendations, fetchRecommendations, fetchSmartVouchers, smartVouchers, behavioralProfile } = useTracking();
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  const showTrendingFirst = recommendations?.strategy === 'trending_best_sellers' || recommendations?.strategy === 'sale_hunting';
  const isBrandLoyalist = behavioralProfile === 'brand_loyalist';
  const isBeginner = behavioralProfile === 'beginner';
  const isGhostShopper = behavioralProfile === 'ghost_shopper';
  const isGearGeek = behavioralProfile === 'gear_geek';

  useEffect(() => {
    fetchRecommendations();
    fetchSmartVouchers();
  }, []);

  return (
    <Layout>
      <Head>
        <title>Badminton Hub | Premium Badminton Accessories</title>
      </Head>

      <section className="section-padding">
        <div className="container-default grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <span className="pill bg-primary/10 text-primary">New Drop</span>
            <h1 className="font-heading text-4xl font-semibold leading-tight sm:text-5xl">
              Upgrade every rally with pro-level badminton accessories.
            </h1>
            <p className="text-lg text-secondary/70">
              From tournament rackets to grip tape and shuttlecocks, everything you need for match-day
              control, speed, and consistency.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/products" className="btn-primary">
                Shop Now
              </Link>
              <Link href="/products?category=rackets" className="btn-outline">
                Explore Rackets
              </Link>
              <button
                onClick={() => setIsQuizOpen(true)}
                className="btn-outline flex items-center gap-2 border-orange-400 text-orange-500 hover:bg-gradient-to-r from-red-500 to-orange-500 hover:text-white transition-all hover:-translate-y-1 shadow-lg shadow-orange-500/20"
              >
                <Sparkles size={18} /> Racket Quiz
              </button>
            </div>
            <div className="flex items-center gap-6 text-sm text-secondary/70">
              <div>
                <div className="text-xl font-semibold text-secondary">4.8★</div>
                Trusted by 10k+ badminton players
              </div>
              <div>
                <div className="text-xl font-semibold text-secondary">48h</div>
                Fast tracked shipping
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -left-12 -top-12 h-24 w-24 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-white to-gray-50 shadow-card">
              <Image
                src="https://t4.ftcdn.net/jpg/03/08/07/57/360_F_308075782_n2CmkdBKAqF956PUbTKhIg8D2yTws1iW.jpg"
                alt="Badminton player training"
                width={1200}
                height={900}
                className="h-full w-full object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-secondary/70 via-secondary/20 to-transparent" />
              <div className="absolute bottom-6 left-6 space-y-2 text-white">
                <p className="pill bg-white/20 text-xs text-white">Featured • Astrox 88D</p>
                <h3 className="text-2xl font-semibold">Power. Precision. Control.</h3>
                <p className="text-sm text-white/80">
                  Designed for players who want sharper net play and stronger back-court attacks.
                </p>
              </div>

              {/* Floating Quiz Badge */}
              <div className="absolute top-6 right-6 z-10">
                <button
                  onClick={() => setIsQuizOpen(true)}
                  className="group flex flex-col items-center justify-center animate-bounce"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 backdrop-blur shadow-xl ring-4 ring-white/50 transition-transform group-hover:scale-110">
                    <span className="text-2xl">🏸</span>
                  </div>
                  <span className="mt-2 rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-3 py-1 text-xs font-bold text-white backdrop-blur transition-colors">
                    Find Your Racket
                  </span>
                </button>
              </div>
            </div>
            <RacketQuizModal
              isOpen={isQuizOpen}
              onClose={() => setIsQuizOpen(false)}
              products={initialProducts || []}
            />
          </div>
        </div>
      </section>

      {/* Highlighted section for segmented users (bonus personalized section) */}


      <section className="section-padding bg-white">
        <div className="container-default space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-2xl font-semibold">Shop by Category</h2>
            <Link href="/products" className="text-sm font-semibold text-secondary/70 hover:text-secondary">
              View all
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category, idx) => (
              <CategoryCard key={(category as any)._id || category.id || idx} category={category} />
            ))}
          </div>
        </div>
      </section>

      {/* Trending Now — ranked by real search/view/click data */}
      <section className="section-padding">
        <div className="container-default space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-2xl font-semibold">Trending Now</h2>
            <Link href="/products" className="flex items-center gap-2 text-sm font-semibold text-primary">
              See trending <ArrowRight size={16} />
            </Link>
          </div>
          <ProductGrid products={trending.slice(0, 6)} loading={!trending.length} />
        </div>
      </section>

      {/* Best Sellers — ranked by real sales data from "received" orders */}
      <section className="section-padding bg-white">
        <div className="container-default space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-2xl font-semibold">Best Sellers</h2>
            <Link href="/products" className="text-sm font-semibold text-secondary/70 hover:text-secondary">
              View collection
            </Link>
          </div>
          <ProductGrid products={bestSellers.slice(0, 6)} loading={!bestSellers.length} />
        </div>
      </section>

      {/* ── Profile-Aware: Brand Loyalist Section ── */}
      {isBrandLoyalist && recommendations?.brand && (
        <section className="section-padding bg-gradient-to-br from-gray-50 to-white">
          <div className="container-default space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <span className="pill bg-indigo-100 text-indigo-700 mb-2 inline-block shadow-sm">💎 Ecosystem {recommendations.brand}</span>
                <h2 className="font-heading text-2xl font-semibold">{recommendations.brand} products are for you</h2>
              </div>
              <Link href={`/products?brand=${recommendations.brand}`} className="flex items-center gap-2 text-sm font-semibold text-primary">
                View all <ArrowRight size={16} />
              </Link>
            </div>
            <ProductGrid
              products={(
                recommendations?.products?.length
                  ? recommendations.products.slice(0, 6)
                  : bestSellers.slice(0, 6)
              )}
              loading={false}
            />
          </div>
        </section>
      )}

      {/* ── Profile-Aware: Beginner Section ── */}
      {isBeginner && (
        <section className="section-padding bg-gradient-to-br from-emerald-50 to-white">
          <div className="container-default space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <span className="pill bg-emerald-100 text-emerald-700 mb-2 inline-block shadow-sm">🌟 For beginners</span>
                <h2 className="font-heading text-2xl font-semibold">Starter Kit — Start badminton easily</h2>
                <p className="mt-1 text-sm text-secondary/60">The product is easy to play, affordable, and suitable for beginners.</p>
              </div>
              <Link href="/products?sort=price-asc" className="flex items-center gap-2 text-sm font-semibold text-primary">
                View all <ArrowRight size={16} />
              </Link>
            </div>
            <ProductGrid
              products={(
                recommendations?.products?.length
                  ? recommendations.products.slice(0, 6)
                  : trending.slice(0, 6)
              )}
              loading={false}
            />
          </div>
        </section>
      )}

      {/* ── Profile-Aware: Ghost Shopper Section ── */}
      {isGhostShopper && (
        <section className="section-padding bg-gradient-to-br from-purple-50 to-white">
          <div className="container-default space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-2xl font-semibold">🔥 Featured products</h2>
                <p className="mt-1 text-sm text-secondary/60">Hot deals for you</p>
              </div>
              <Link href="/products?sort=price-asc" className="flex items-center gap-2 text-sm font-semibold text-primary">
                View all <ArrowRight size={16} />
              </Link>
            </div>
            <ProductGrid
              products={(
                recommendations?.products?.length
                  ? recommendations.products.slice(0, 6)
                  : trending.slice(0, 6)
              )}
              loading={false}
            />
          </div>
        </section>
      )}

      {/* ── Profile-Aware: Gear Geek Section ── */}
      {isGearGeek && (
        <section className="section-padding bg-gradient-to-br from-purple-50 to-white">
          <div className="container-default space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-2xl font-semibold">Matches your playing style.</h2>
                <p className="mt-1 text-sm text-secondary/60">Based on the specifications you are interested in.</p>
              </div>
              <Link href="/products?sort=price-asc" className="flex items-center gap-2 text-sm font-semibold text-primary">
                View all <ArrowRight size={16} />
              </Link>
            </div>
            <ProductGrid
              products={(
                recommendations?.products?.length
                  ? recommendations.products.slice(0, 6)
                  : trending.slice(0, 6)
              )}
              loading={false}
            />
          </div>
        </section>
      )}


      <section className="section-padding">
        <div className="container-default grid gap-8 lg:grid-cols-[3fr_2fr]">
          <div className="space-y-5">
            <h3 className="font-heading text-2xl font-semibold">What players say</h3>
            <p className="text-secondary/70">
              Real feedback from badminton players on feel, durability, and on-court performance.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {(featuredReviews?.length > 0 ? featuredReviews : reviews).slice(0, 4).map((review) => (
                <Link href={`/products/${review.product?.slug}`}>
                  <ReviewCard key={review.id || review._id} review={review} />
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-[32px] bg-secondary p-6 text-white shadow-card">
            <h3 className="font-heading text-2xl font-semibold">Join the newsletter</h3>
            <p className="mt-2 text-white/70">
              Get early access to new drops, restring guides, and members-only badminton deals.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                className="w-full rounded-full bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Email address"
              />
              <button className="btn-primary w-full sm:w-auto">Subscribe</button>
            </div>
            <p className="mt-3 text-xs text-white/60">We respect your inbox. Unsubscribe anytime.</p>
          </div>
        </div>
      </section>

      {/* Smart Voucher Popup */}
      <SmartVoucherPopup vouchers={smartVouchers} />
    </Layout>
  );
}

const mapProductForGrid = (p: any) => ({
  _id: p._id || p.id || null,
  id: p.id || p._id || null,
  name: p.name || "",
  slug: p.slug || "",
  image: p.image || null,
  price: p.price || p.basePrice || 0,
  basePrice: p.basePrice || 0,
  brand: typeof p.brand === 'object' ? { name: p.brand?.name } : p.brand || null,
  rating: p.rating || 0,
  reviews: p.reviews || 0,
  badges: p.badges || [],
  specs: p.specs || {},
  category: p.category || null,
  description: p.description || "",
});

const mapCategory = (c: any) => ({
  _id: c._id || c.id || null,
  id: c.id || c._id || null,
  name: c.name || "",
  slug: c.slug || "",
  image: c.image || null,
});

export const getServerSideProps: GetServerSideProps<any> = async () => {
  try {
    // 1. Fetch categories first to find the Rackets category ID
    const categoriesRaw = await fetchCategories();
    const categories = (categoriesRaw || []).map(mapCategory);

    const racketCat = categories.find((c: any) =>
      c.slug === 'rackets' || c.slug === 'racket' || String(c.name).toLowerCase().includes('racket')
    );
    const racketCatId = racketCat?._id || racketCat?.id;

    // 2. Fetch the rest of the data, using the correct category ID for products
    const [trending, bestSellers, featuredReviewsRes, productsData] = await Promise.all([
      fetchTrending(),
      fetchBestSellers(),
      fetchFeaturedReviews(),
      fetchProducts({ category: racketCatId, limit: 100 })
    ]);

    return {
      props: {
        categories,
        trending: (trending || []).map(mapProductForGrid),
        bestSellers: (bestSellers || []).map(mapProductForGrid),
        featuredReviews: (featuredReviewsRes || []).map((r: any) => ({
          ...r,
          id: r._id || r.id,
          date: r.createdAt || r.date || new Date().toISOString()
        })),
        initialProducts: (productsData?.data || []).map(mapProductForGrid)
      }
    };
  } catch (error) {
    console.warn("Falling back to mock data", error);
    return {
      props: {
        categories: mockCategories.map(mapCategory),
        trending: mockProducts.slice(0, 8).map(mapProductForGrid) as any,
        bestSellers: mockProducts.slice(1, 9).map(mapProductForGrid) as any,
        featuredReviews: reviews,
        initialProducts: mockProducts.map(mapProductForGrid) as any
      },
    };
  }
};

