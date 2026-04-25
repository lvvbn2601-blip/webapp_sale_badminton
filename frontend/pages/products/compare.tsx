import Head from "next/head";
import Link from "next/link";
import { ChevronRight, Scale, ArrowLeft, Trash2 } from "lucide-react";
import { Layout } from "../../components/Layout";
import { CompareTable } from "../../components/CompareTable";
import { useCompare } from "../../context/CompareContext";
import { getCompareConfig } from "../../lib/compareConfig";

export default function ComparePage() {
  const { items, clear, categorySlug, count } = useCompare();
  const config = getCompareConfig(categorySlug);

  return (
    <Layout>
      <Head>
        <title>
          {count > 0
            ? `Compare ${config.name} (${count}) | Badminton Hub`
            : "Product Comparison | Badminton Hub"}
        </title>
        <meta
          name="description"
          content="Compare badminton products side-by-side. View specs, prices, and ratings to find your perfect gear."
        />
      </Head>

      {/* ── Breadcrumb ──────────────────────────── */}
      <div className="border-b border-black/5 bg-white/60 backdrop-blur-sm">
        <nav className="container-default flex items-center gap-2 py-3 text-xs text-secondary/50">
          <Link href="/" className="transition hover:text-secondary">
            Home
          </Link>
          <ChevronRight size={12} />
          <Link href="/products" className="transition hover:text-secondary">
            Products
          </Link>
          <ChevronRight size={12} />
          <span className="font-semibold text-secondary/70">Compare</span>
        </nav>
      </div>

      {/* ── Hero Header ─────────────────────────── */}
      <section className="bg-gradient-to-b from-white to-background pb-2 pt-8">
        <div className="container-default">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-red-600 text-white shadow-lg shadow-primary/20">
                <Scale size={22} />
              </div>
              <div>
                <h1 className="font-heading text-2xl font-bold text-secondary sm:text-3xl">
                  Product Comparison
                </h1>
                <p className="mt-0.5 text-sm text-secondary/50">
                  {count > 0
                    ? `Comparing ${count} ${config.name.toLowerCase()} side-by-side`
                    : "Select products to compare them side-by-side"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-xs font-semibold text-secondary shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <ArrowLeft size={14} />
                Back to Products
              </Link>
              {count > 0 && (
                <button
                  onClick={clear}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600 transition hover:-translate-y-0.5 hover:bg-red-100 hover:shadow-sm"
                >
                  <Trash2 size={14} />
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content ────────────────────────── */}
      <section className="section-padding !pt-6">
        <div className="container-default">
          <CompareTable />
        </div>
      </section>
    </Layout>
  );
}
