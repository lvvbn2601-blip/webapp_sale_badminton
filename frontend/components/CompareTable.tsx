import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { X, Star, ExternalLink, AlertTriangle } from "lucide-react";
import { Product } from "../types";
import { useCompare } from "../context/CompareContext";
import {
  getCompareConfig,
  getSpecValue,
  resolveCategory,
  CompareRowConfig,
} from "../lib/compareConfig";
import { RecommendationRow } from "./RecommendationRow";

/* ── Helpers ──────────────────────────────────────────────── */

const getPrice = (p: Product): number =>
  Number(p.price ?? (p as any).basePrice ?? 0);

const getBrandName = (p: Product): string =>
  typeof p.brand === "object" ? (p.brand as any)?.name || "" : String(p.brand || "");

const getProductId = (p: Product): string => p.id || (p as any)._id || "";

/**
 * Check if all values are the same across products for a given spec key.
 */
const allSame = (products: Product[], specKey: string): boolean => {
  const values = products.map((p) =>
    getSpecValue(p.specs, specKey).toLowerCase().trim()
  );
  return values.every((v) => v === values[0]);
};

const getSuitability = (p: Product, catSlug: string): { type: string; color: string; desc: string }[] => {
  const badges: { type: string; color: string; desc: string }[] = [];

  // Default / generic logic if not a racket
  if (catSlug !== "vot-cau-long" && catSlug !== "rackets" && !p.name.toLowerCase().includes("vợt") && !p.name.toLowerCase().includes("racket")) {
    badges.push({ type: "All Players", color: "bg-blue-100 text-blue-700", desc: "Versatile product, suitable for most players." });
    return badges;
  }

  const getSpec = (specs: Record<string, string> | undefined, key: string) => {
    const val = getSpecValue(specs, key);
    return val === "—" ? "" : val;
  };

  // Extract specs safely (checking both common and specific DB keys)
  const balanceStr = (getSpec(p.specs, "Điểm cân bằng") || getSpec(p.specs, "Balance") || getSpec(p.specs, "Balance Point") || "").toLowerCase();
  const weightStr = (getSpec(p.specs, "Trọng lượng") || getSpec(p.specs, "Weight") || getSpec(p.specs, "Weight (U)") || getSpec(p.specs, "Weight(U)") || "").toLowerCase();
  const stiffnessStr = (getSpec(p.specs, "Độ cứng") || getSpec(p.specs, "Stiffness") || getSpec(p.specs, "Stick Stiffness (Flex)") || "").toLowerCase();

  // 1. Analyze Weight / Lực tay
  if (weightStr.includes("3u") || weightStr.includes("2u") || (weightStr.match(/\d+g/) && parseInt(weightStr.match(/\d+g/)![0]) > 85)) {
    badges.push({ type: "Strong Arm", color: "bg-orange-100 text-orange-800 border border-orange-200", desc: "Heavy (3U/2U), requires good physical strength." });
  } else if (weightStr.includes("5u") || weightStr.includes("6u") || weightStr.includes("f") || (weightStr.match(/\d+g/) && parseInt(weightStr.match(/\d+g/)![0]) < 80)) {
    badges.push({ type: "Weak Wrist / Ladies", color: "bg-green-100 text-green-800 border border-green-200", desc: "Super light, provides good power assistance." });
  } else if (weightStr.includes("4u") || weightStr.match(/\d+g/)) {
    badges.push({ type: "Average Arm", color: "bg-blue-100 text-blue-800 border border-blue-200", desc: "Standard weight (4U), easy to control." });
  }

  // 2. Analyze Balance / Lối chơi
  const balanceMatch = balanceStr.match(/\d{3}/);
  const balanceNum = balanceMatch ? parseInt(balanceMatch[0]) : 0;
  
  const isHeavyHead = balanceNum >= 300 || balanceStr.includes("nặng đầu") || balanceStr.includes("head heavy");
  const isLightHead = (balanceNum > 0 && balanceNum <= 290) || balanceStr.includes("nhẹ đầu") || balanceStr.includes("head light");
  const isEven = (balanceNum > 290 && balanceNum < 300) || balanceStr.includes("cân bằng") || balanceStr.includes("even");
  
  if (isHeavyHead) {
    badges.push({ type: "Attacking (Smasher)", color: "bg-red-100 text-red-800 border border-red-200", desc: "Head heavy, delivers powerful smashes." });
  } else if (isLightHead) {
    badges.push({ type: "Drive / Net Play", color: "bg-cyan-100 text-cyan-800 border border-cyan-200", desc: "Head light, extremely fast swing speed." });
  } else if (isEven) {
    badges.push({ type: "All-Around", color: "bg-purple-100 text-purple-800 border border-purple-200", desc: "Flexible transitions between offense and defense." });
  }

  // 3. Analyze Stiffness / Kỹ năng
  if (stiffnessStr.includes("cứng") || stiffnessStr.includes("stiff")) {
    badges.push({ type: "Advanced Technique", color: "bg-stone-100 text-stone-800 border border-stone-200", desc: "Stiff shaft, demands good technique." });
  } else if (stiffnessStr.includes("dẻo") || stiffnessStr.includes("flexible")) {
    badges.push({ type: "Power Assistance", color: "bg-pink-100 text-pink-800 border border-pink-200", desc: "Flexible shaft, makes clear shots easier." });
  } else if (stiffnessStr.includes("trung bình") || stiffnessStr.includes("medium")) {
    badges.push({ type: "Versatile", color: "bg-teal-100 text-teal-800 border border-teal-200", desc: "Medium stiff shaft, easy to control." });
  }

  // Fallback
  if (badges.length === 0) {
     badges.push({ type: "All Playstyles", color: "bg-gray-100 text-gray-800 border border-gray-200", desc: "Easy to get used to for beginners." });
  }

  return badges;
};

/* ── Component ───────────────────────────────────────────── */

export function CompareTable() {
  const { items, remove } = useCompare();

  // Resolve config
  const catSlug = items.length > 0 ? resolveCategory(items[0]) : "";
  const config = useMemo(() => getCompareConfig(catSlug), [catSlug]);

  // Filter rows to only show those that have at least one non-empty value
  const visibleRows = useMemo(() => {
    return config.rows.filter((row) =>
      items.some((p) => {
        const val = getSpecValue(p.specs, row.specKey);
        return val !== "—";
      })
    );
  }, [config.rows, items]);

  // Also collect any extra spec keys not covered by the config
  const extraRows = useMemo(() => {
    const configKeys = new Set(
      config.rows.map((r) => r.specKey.toLowerCase())
    );
    const extraKeys = new Set<string>();
    items.forEach((p) => {
      if (p.specs) {
        Object.keys(p.specs).forEach((k) => {
          if (!configKeys.has(k.toLowerCase())) extraKeys.add(k);
        });
      }
    });
    return Array.from(extraKeys).map<CompareRowConfig>((k) => ({
      specKey: k,
      label: k,
      highlight: true,
    }));
  }, [config.rows, items]);

  const allRows = [...visibleRows, ...extraRows];

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-3xl bg-white py-20 text-center shadow-sm ring-1 ring-black/5">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-gray-50">
          <AlertTriangle size={32} className="text-secondary/15" />
        </div>
        <div>
          <h3 className="font-heading text-lg font-bold text-secondary">
            No products to compare
          </h3>
          <p className="mt-1 text-sm text-secondary/50">
            Browse products and add at least 2 to start comparing.
          </p>
        </div>
        <Link
          href="/products"
          className="mt-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          Browse products
        </Link>
      </div>
    );
  }

  const colCount = items.length;

  return (
    <div className="space-y-6">
      {/* ── Table ───────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-card ring-1 ring-black/5">
        <table className="w-full border-collapse text-sm">
          {/* ─── Product Header Row ─────────────────────── */}
          <thead>
            <tr>
              {/* Label column */}
              <th className="sticky left-0 z-10 min-w-[140px] border-b border-r border-black/5 bg-gradient-to-br from-gray-50 to-gray-100/80 p-4 text-left text-xs font-bold uppercase tracking-widest text-secondary/40 sm:min-w-[180px]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary/60" />
                  {config.name}
                </span>
              </th>

              {/* Product columns */}
              {items.map((product, idx) => (
                <th
                  key={getProductId(product)}
                  className={`relative min-w-[200px] border-b border-black/5 p-4 ${
                    idx < colCount - 1 ? "border-r" : ""
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    {/* Remove button */}
                    <button
                      onClick={() => remove(getProductId(product))}
                      className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-secondary/40 transition hover:bg-red-100 hover:text-red-500"
                      title="Remove from comparison"
                    >
                      <X size={12} />
                    </button>

                    {/* Product image */}
                    <div className="relative h-28 w-28 overflow-hidden rounded-xl bg-gray-50 ring-1 ring-black/5 sm:h-32 sm:w-32">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="128px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-secondary/10">
                          {product.name?.charAt(0) || "?"}
                        </div>
                      )}
                    </div>

                    {/* Product name */}
                    <Link
                      href={`/products/${product.slug}`}
                      className="group flex items-center gap-1 text-center"
                    >
                      <h3 className="line-clamp-2 font-heading text-sm font-bold text-secondary transition group-hover:text-primary">
                        {product.name}
                      </h3>
                      <ExternalLink
                        size={10}
                        className="shrink-0 text-secondary/30 transition group-hover:text-primary"
                      />
                    </Link>

                    {/* Brand */}
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-secondary/40">
                      {getBrandName(product)}
                    </span>

                    {/* Rating */}
                    <div className="flex items-center gap-1">
                      <span className="text-amber-400">
                        {"★".repeat(Math.round(product.rating || 0))}
                        {"☆".repeat(5 - Math.round(product.rating || 0))}
                      </span>
                      {product.reviewCount != null && (
                        <span className="text-[10px] text-secondary/40">
                          ({product.reviewCount})
                        </span>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* ─── Price Row (always visible) ───────────── */}
            <tr className="bg-gradient-to-r from-primary/[0.03] to-transparent">
              <td className="sticky left-0 z-10 border-b border-r border-black/5 bg-gradient-to-r from-primary/[0.06] to-primary/[0.02] p-4 font-bold text-secondary">
                <span className="flex items-center gap-2 text-sm">
                  💰 Price
                </span>
              </td>
              {items.map((product, idx) => {
                const price = getPrice(product);
                const prices = items.map(getPrice);
                const isLowest = price === Math.min(...prices) && prices.filter(p => p === price).length < items.length;

                return (
                  <td
                    key={getProductId(product)}
                    className={`border-b border-black/5 p-4 text-center ${
                      idx < colCount - 1 ? "border-r" : ""
                    }`}
                  >
                    <span
                      className={`text-xl font-extrabold ${
                        isLowest
                          ? "text-green-600"
                          : "text-secondary"
                      }`}
                    >
                      ${price.toFixed(2)}
                    </span>
                    {isLowest && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                        Best price
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* ─── Dynamic Spec Rows ───────────────────── */}
            {allRows.map((row, rowIdx) => {
              const isDiff = row.highlight && !allSame(items, row.specKey);

              return (
                <tr
                  key={row.specKey}
                  className={`transition-colors ${
                    isDiff
                      ? "bg-amber-50/60"
                      : rowIdx % 2 === 0
                      ? "bg-white"
                      : "bg-gray-50/40"
                  }`}
                >
                  {/* Label */}
                  <td
                    className={`sticky left-0 z-10 border-b border-r border-black/5 p-4 ${
                      isDiff
                        ? "bg-amber-50/80"
                        : rowIdx % 2 === 0
                        ? "bg-white"
                        : "bg-gray-50/60"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-secondary/80">
                      {row.icon && <span className="text-base">{row.icon}</span>}
                      {row.label}
                      {isDiff && (
                        <span className="ml-auto flex h-2 w-2 rounded-full bg-amber-400" title="Values differ" />
                      )}
                    </span>
                  </td>

                  {/* Values */}
                  {items.map((product, idx) => {
                    const val = getSpecValue(product.specs, row.specKey);

                    return (
                      <td
                        key={getProductId(product)}
                        className={`border-b border-black/5 p-4 text-center ${
                          idx < colCount - 1 ? "border-r" : ""
                        }`}
                      >
                        <span
                          className={`text-sm ${
                            isDiff
                              ? "font-bold text-secondary"
                              : val === "—"
                              ? "text-secondary/25"
                              : "font-medium text-secondary/70"
                          }`}
                        >
                          {val}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* ─── Suitable For row ──────────────────────────── */}
            <tr className="bg-white">
              <td className="sticky left-0 z-10 border-b border-r border-black/5 bg-white p-4">
                <span className="flex items-center gap-2 text-sm font-semibold text-secondary/80">
                  🎯 Suitable For
                </span>
                <p className="mt-1 text-[10px] text-secondary/50 font-normal leading-tight max-w-[120px]">
                  Intelligent evaluation based on specs
                </p>
              </td>
              {items.map((product, idx) => {
                const suitability = getSuitability(product, catSlug);
                return (
                  <td
                    key={getProductId(product)}
                    className={`border-b border-black/5 p-4 align-top ${
                      idx < colCount - 1 ? "border-r" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-2.5">
                      {suitability.map((badge, i) => (
                        <div key={i} className={`flex flex-col items-start rounded-xl p-2.5 ${badge.color} bg-opacity-40`}>
                          <span className="text-[11px] font-bold tracking-wide uppercase mb-0.5">{badge.type}</span>
                          <span className="text-[10px] leading-snug opacity-90 text-left">{badge.desc}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* ─── Description rows ───────────────────── */}
            <tr className="bg-gray-50/40">
              <td className="sticky left-0 z-10 border-r border-black/5 bg-gray-50/60 p-4">
                <span className="flex items-center gap-2 text-sm font-semibold text-secondary/80">
                  📝 Description
                </span>
              </td>
              {items.map((product, idx) => (
                <td
                  key={getProductId(product)}
                  className={`p-4 text-center ${
                    idx < colCount - 1 ? "border-r border-black/5" : ""
                  }`}
                >
                  <p className="text-xs leading-relaxed text-secondary/60">
                    {product.description || "—"}
                  </p>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Recommendation CTA Row ─────────────────────── */}
      <RecommendationRow products={items} />
    </div>
  );
}
