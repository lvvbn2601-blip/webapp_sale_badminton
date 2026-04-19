import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, SlidersHorizontal, X, RotateCcw, Star } from "lucide-react";
import { Category, Brand } from "../types";
import { useTracking } from "../lib/useTracking";

/* ── Types ──────────────────────────────────────────── */
export type FilterState = {
  categories: string[];
  brands: string[];
  priceMin: number;
  priceMax: number;
  rating: number;
  sortBy: string;
  specs: Record<string, string[]>;
};

export const defaultFilters: FilterState = {
  categories: [],
  brands: [],
  priceMin: 0,
  priceMax: 500,
  rating: 0,
  sortBy: "featured",
  specs: {},
};

type Props = {
  categories: Category[];
  brands: Brand[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  totalResults: number;
  products?: any[];
  onOpenQuiz?: () => void;
};

/* ── Collapsible Section ───────────────────────────── */
function Section({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<string | number>(defaultOpen ? "auto" : 0);

  useEffect(() => {
    if (!bodyRef.current) return;
    if (open) {
      setHeight(bodyRef.current.scrollHeight);
      const timer = setTimeout(() => setHeight("auto"), 300);
      return () => clearTimeout(timer);
    } else {
      setHeight(bodyRef.current.scrollHeight);
      requestAnimationFrame(() => setHeight(0));
    }
  }, [open]);

  return (
    <div className="border-b border-black/5 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-semibold text-secondary transition hover:text-primary"
      >
        <span className="flex items-center gap-2">
          {title}
          {count != null && count > 0 && (
            <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
              {count}
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={`text-secondary/40 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        style={{ height, overflow: "hidden", transition: "height 0.3s ease" }}
      >
        <div ref={bodyRef} className="pb-4">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Price Range Slider ────────────────────────────── */
function PriceRange({
  min,
  max,
  valueMin,
  valueMax,
  onChange,
}: {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const leftPct = ((valueMin - min) / (max - min)) * 100;
  const rightPct = ((valueMax - min) / (max - min)) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-secondary/60">
        <span className="rounded-lg bg-gray-50 px-2.5 py-1.5 font-semibold text-secondary">
          ${valueMin}
        </span>
        <span className="text-secondary/30">—</span>
        <span className="rounded-lg bg-gray-50 px-2.5 py-1.5 font-semibold text-secondary">
          ${valueMax}
        </span>
      </div>
      <div ref={trackRef} className="relative h-1.5 rounded-full bg-gray-100">
        <div
          className="absolute h-full rounded-full bg-gradient-to-r from-primary to-primary/80"
          style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
        />
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={5}
          value={valueMin}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v < valueMax) onChange(v, valueMax);
          }}
          className="range-thumb pointer-events-none absolute inset-0 w-full appearance-none bg-transparent"
          style={{ zIndex: 3 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={5}
          value={valueMax}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v > valueMin) onChange(valueMin, v);
          }}
          className="range-thumb pointer-events-none absolute inset-0 w-full appearance-none bg-transparent"
          style={{ zIndex: 4 }}
        />
      </div>
    </div>
  );
}

/* ── Star Rating Row ───────────────────────────────── */
function StarRow({
  value,
  selected,
  onClick,
}: {
  value: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${selected
        ? "bg-primary/10 ring-1 ring-primary/30"
        : "hover:bg-gray-50"
        }`}
    >
      <span className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            size={14}
            className={s <= value ? "fill-amber-400 text-amber-400" : "text-gray-200"}
          />
        ))}
      </span>
      <span className="text-xs text-secondary/60">{value === 5 ? "only" : "& up"}</span>
    </button>
  );
}

export function FilterSidebar({ categories, brands, filters, onChange, totalResults, products, onOpenQuiz }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { trackFilterUse } = useTracking();

  const activeSpecsCount = Object.values(filters.specs || {}).reduce((sum, arr) => sum + arr.length, 0);
  const activeCount =
    filters.categories.length +
    filters.brands.length +
    (filters.rating > 0 ? 1 : 0) +
    (filters.priceMin > 0 || filters.priceMax < 500 ? 1 : 0) +
    activeSpecsCount;

  const getCategoryCount = (catId: string) => {
    if (!products) return null;
    return products.filter((p) => {
      const pc = typeof p.category === 'object' && p.category ? p.category._id || p.category.id : p.category;
      return String(pc) === String(catId);
    }).length;
  };

  const getBrandCount = (brandId: string) => {
    if (!products) return null;
    return products.filter((p) => {
      const pb = typeof p.brand === 'object' && p.brand ? p.brand._id || p.brand.id : p.brand;
      return String(pb) === String(brandId);
    }).length;
  };

  const getSpecCount = (specName: string, specValue: string) => {
    if (!products) return null;
    return products.filter((p) => {
      if (!p.specs) return false;
      const normalize = (s: any) => String(s || "").toLowerCase().replace(/[^a-z0-9]/gi, "");
      const targetKeyRaw = normalize(specName);
      const productSpecEntry = Object.entries(p.specs).find(([pk]) => normalize(pk) === targetKeyRaw);
      if (!productSpecEntry) return false;
      return normalize(productSpecEntry[1]) === normalize(specValue);
    }).length;
  };

  const toggle = useCallback(
    (key: "categories" | "brands", value: string) => {
      const list = filters[key];
      const next = list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value];
      onChange({ ...filters, [key]: next });

      // Track filter usage for segmentation (brand loyalist detection)
      if (key === 'brands' && !list.includes(value)) {
        const brandObj = brands.find(b => (b._id || b.id) === value);
        if (brandObj) {
          trackFilterUse(`brand:${brandObj.name}`);
        }
      }
      if (key === 'categories' && !list.includes(value)) {
        const catObj = categories.find(c => (c._id || c.id) === value);
        if (catObj) {
          trackFilterUse(`category:${catObj.name}`);
        }
      }
    },
    [filters, onChange, brands, categories, trackFilterUse]
  );

  const toggleSpec = useCallback((key: string, value: string) => {
    const list = filters.specs[key] || [];
    const next = list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
    onChange({ ...filters, specs: { ...filters.specs, [key]: next } });
  }, [filters, onChange]);

  const reset = useCallback(() => onChange(defaultFilters), [onChange]);

  // Determine what specs to show based on selected categories, or all if none
  const specOptions: Record<string, string[]> = {
    "Weight (U)": ["2U", "3U", "4U", "5U", "F (6U)"],
    "Grip Circumference (G)": ["G4", "G5", "G6"],
    "Stick Stiffness (Flex)": ["Flexible", "Medium", "Stiff", "Very Stiff"],
    "Balance Point": ["All-around Offensive/Defensive", "Head Heavy (Offensive)", "Head Light (Defensive)"],
    "Maximum Tension": ["< 10kg", "10-11kg", "11-12kg", "> 12kg"],
    "Type": ["Feather (Bird/Swallow)", "Hybrid", "Nylon"],
    "Speed": ["76", "77", "78"],
    "Packaging": ["Tube of 12", "Tube of 6", "Single"],
    "Size (EU)": ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    "Gender": ["Male", "Female", "Unisex"],
    "Key Features": ["Power Cushion", "Ankle support", "Ultralightweight", "Grip sole"],
    "Color": ["Red", "Orange", "Yellow", "Green", "Blue", "Purple", "Pink", "Black", "White", "Grey", "Navy"],
    "Bag Type": ["Backpack", "Rectangular bag (2 compartments)", "Specialized bag (3 compartments)", "Drawstring bag"],
    "Capacity": ["1-3 rackets", "6 rackets", "9 rackets", "12 rackets"],
    "Features": ["Separate shoe compartment", "Insulated", "Waterproof"],
    "Accessory Type": ["Grid (Liner)", "Grip Tape", "Wrist/Headband", "Socks", "Clothing"],
    "Thickness": ["0.6mm", "0.65mm", "0.7mm", "0.75mm"],
    "Feel": ["Repulsion", "Durability", "Hitting Sound"]
  };

  const colorMap: Record<string, string> = {
    Red: "#ef4444",
    Orange: "#f97316",
    Yellow: "#eab308",
    Green: "#22c55e",
    Blue: "#3b82f6",
    Purple: "#a855f7",
    Pink: "#ec4899",
    Black: "#000000",
    White: "#ffffff",
    Grey: "#9ca3af",
    Navy: "#1e3a8a",
  };

  // Extract selected categories
  const selectedCats = categories.filter((c) => filters.categories.includes(c._id || c.id));

  // Find which specific specs to show
  const activeSpecNames = new Set<string>();

  selectedCats.forEach((c) => {
    const s = (c.slug + " " + c.name).toLowerCase();
    if (s.includes('racket') || s.includes('vot') || s.includes('vợt')) {
      ["Weight (U)", "Grip Circumference (G)", "Stick Stiffness (Flex)", "Balance Point", "Maximum Tension"].forEach(x => activeSpecNames.add(x));
    }
    if (s.includes('footwear') || s.includes('shoe') || s.includes('giay') || s.includes('giày')) {
      ["Size (EU)", "Gender", "Key Features", "Color"].forEach(x => activeSpecNames.add(x));
    }
    if (s.includes('shuttle') || s.includes('cau') || s.includes('cầu')) {
      ["Type", "Speed", "Packaging"].forEach(x => activeSpecNames.add(x));
    }
    if (s.includes('bag') || s.includes('tui') || s.includes('balo') || s.includes('túi')) {
      ["Bag Type", "Capacity", "Features"].forEach(x => activeSpecNames.add(x));
    }
    if (s.includes('string') || s.includes('day') || s.includes('dây') || s.includes('cước') || s.includes('accessories') || s.includes('phu') || s.includes('phụ') || s.includes('grip') || s.includes('quấn')) {
      ["Accessory Type", "Thickness", "Feel", "Color"].forEach(x => activeSpecNames.add(x));
    }
  });

  const content = (
    <div className="flex h-full flex-col">
      {/* Quiz Banner */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 p-5 text-white shadow-md relative overflow-hidden group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5">
        <div className="relative z-10">
          <span className="inline-block rounded-full bg-white/20 px-2 py-0.5 mb-2 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">For Beginners</span>
          <h4 className="font-heading text-lg font-bold">Unsure what to buy?</h4>
          <p className="mt-1 text-xs text-blue-100">Take a 1-minute quiz to find your perfect "weapon" on the court.</p>
          <button
            onClick={onOpenQuiz}
            className="mt-3 rounded-lg bg-white px-4 py-1.5 text-xs font-bold text-blue-600 shadow-sm transition-transform group-hover:scale-105"
          >
            Take Quiz Now &rarr;
          </button>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl"></div>
        <div className="absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-white/10 blur-xl"></div>
      </div>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/5 px-6 py-4 lg:px-0 lg:pb-4 lg:pt-0">
        <div className="flex items-center gap-2">

          <SlidersHorizontal size={18} className="text-secondary/50" />

          <h3 className="font-heading text-base font-bold text-secondary">Filters</h3>
          {activeCount > 0 && (
            <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition hover:bg-primary/5"
            >
              <RotateCcw size={12} />
              Clear All
            </button>
          )}
          {/* Mobile close button */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-full border border-black/5 text-secondary/50 transition hover:bg-gray-50 lg:hidden"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Scrollable filters */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-0 mt-4">

        {/* Category */}
        <Section title="Category" count={filters.categories.length} defaultOpen={true}>
          <div className="space-y-1">
            {categories.map((cat) => {
              const catId = cat._id || cat.id;
              const catName = cat.name;
              const selected = filters.categories.includes(catId);
              const count = getCategoryCount(catId);
              return (
                <button
                  key={catId}
                  type="button"
                  onClick={() => toggle("categories", catId)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${selected
                    ? "bg-primary/10 font-semibold text-primary ring-1 ring-primary/20"
                    : "text-secondary/70 hover:bg-gray-50 hover:text-secondary"
                    }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className={`grid h-5 w-5 place-items-center rounded-md border text-[10px] transition ${selected
                        ? "border-primary bg-primary text-white"
                        : "border-black/10 bg-white"
                        }`}
                    >
                      {selected && "✓"}
                    </span>
                    {catName}
                  </span>
                  {count !== null && (
                    <span className="text-[10px] font-medium text-secondary/40">
                      ({count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Brand */}
        <Section title="Brand" count={filters.brands.length} defaultOpen={false}>
          <div className="flex flex-wrap gap-2">
            {brands.map((brand) => {
              const brandId = brand._id || brand.id;
              const selected = filters.brands.includes(brandId);
              const count = getBrandCount(brandId);
              return (
                <button
                  key={brandId}
                  type="button"
                  onClick={() => toggle("brands", brandId)}
                  className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${selected
                    ? "bg-red-500 text-white shadow-sm"
                    : "bg-gray-50 text-secondary/70 hover:bg-gray-100 hover:text-secondary"
                    }`}
                >
                  {brand.name} {count !== null && <span className="opacity-70 font-normal">({count})</span>}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Price Range */}
        <Section title="Price Range" count={filters.priceMin > 0 || filters.priceMax < 500 ? 1 : 0} defaultOpen={false}>
          <PriceRange
            min={0}
            max={500}
            valueMin={filters.priceMin}
            valueMax={filters.priceMax}
            onChange={(pMin, pMax) =>
              onChange({ ...filters, priceMin: pMin, priceMax: pMax })
            }
          />
        </Section>

        {/* Rating */}
        <Section title="Rating" count={filters.rating > 0 ? 1 : 0} defaultOpen={false}>
          <div className="space-y-1">
            {[5, 4, 3, 2, 1].map((r) => (
              <StarRow
                key={r}
                value={r}
                selected={filters.rating === r}
                onClick={() =>
                  onChange({ ...filters, rating: filters.rating === r ? 0 : r })
                }
              />
            ))}
          </div>
        </Section>

        {/* Dynamic Specs */}
        {activeSpecNames.size > 0 ? (
          <div className="border-t border-black/5 pt-4 mt-2">
            <h4 className="px-3 mb-2 font-heading text-sm font-bold text-secondary uppercase tracking-wider text-opacity-80">
              Advanced Filters
            </h4>
            {Object.entries(specOptions)
              .filter(([specName]) => activeSpecNames.has(specName))
              .map(([specName, options]) => {
                const selectedList = filters.specs[specName] || [];
                return (
                  <Section key={specName} title={specName} count={selectedList.length} defaultOpen={true}>
                    <div className="flex flex-wrap gap-2">
                      {options.map((opt) => {
                        const selected = selectedList.includes(opt);
                        const count = getSpecCount(specName, opt);

                        // Color swatches specifically requested by user
                        if (specName === "Color") {
                          const isLight = opt === "White" || opt === "Yellow";
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => toggleSpec(specName, opt)}
                              className={`group relative grid h-8 w-8 place-items-center rounded-full border transition ${selected
                                ? "border-primary shadow-md ring-2 ring-primary/30 ring-offset-2"
                                : "border-black/10 hover:border-black/30 hover:shadow-sm"
                                }`}
                              style={{ backgroundColor: colorMap[opt] || opt.toLowerCase() }}
                              title={`${opt} ${count !== null ? `(${count})` : ''}`}
                            >
                              {selected && (
                                <span className={`text-xs ${isLight ? "text-black" : "text-white"}`}>
                                  ✓
                                </span>
                              )}
                            </button>
                          );
                        }

                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => toggleSpec(specName, opt)}
                            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${selected
                              ? "bg-primary text-white shadow-sm ring-1 ring-primary"
                              : "bg-gray-50 text-secondary/70 hover:bg-gray-100 hover:text-secondary ring-1 ring-black/5"
                              }`}
                          >
                            {opt} {count !== null && <span className="opacity-70 font-normal">({count})</span>}
                          </button>
                        );
                      })}
                    </div>
                  </Section>
                );
              })}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-black/10 bg-gray-50/50 p-4 text-center">
            <p className="text-xs text-secondary/50">
              Advanced filters are only available after selecting a specific <span className="font-semibold text-secondary/70">Category</span>.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-3 border-t border-black/5 px-6 py-4 lg:px-0 lg:pt-4 lg:pb-6">
        {activeCount > 0 && (
          <button
            type="button"
            onClick={reset}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 py-3 text-sm font-semibold text-secondary transition hover:bg-gray-200"
          >
            <RotateCcw size={14} />
            Clear All Filters
          </button>
        )}
        <p className="text-center text-xs text-secondary/40">
          {totalResults} {totalResults === 1 ? "product" : "products"} found
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="flex items-center gap-2 rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm font-semibold text-secondary shadow-sm transition hover:shadow-card lg:hidden"
      >
        <SlidersHorizontal size={16} />
        Filters
        {activeCount > 0 && (
          <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 transition lg:hidden ${mobileOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
      >
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition duration-300 ${mobileOpen ? "opacity-100" : "opacity-0"
            }`}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          {content}
        </aside>
      </div>

      {/* Desktop sidebar */}
      <aside className="sticky top-24 hidden h-fit rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 lg:block">
        {content}
      </aside>
    </>
  );
}
