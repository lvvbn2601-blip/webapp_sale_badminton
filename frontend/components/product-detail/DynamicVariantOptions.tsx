import { useState, useMemo, useEffect } from "react";
import { Check, Info } from "lucide-react";
import { Product } from "../../types";
import { fetchStringSpools } from "../../lib/api";

/* ── Spec options map — reuse the same structure as FilterSidebar ── */
export const SPEC_OPTIONS: Record<string, string[]> = {
  "Weight (U)": ["2U", "3U", "4U", "5U", "F (6U)"],
  "Grip Circumference (G)": ["G4", "G5", "G6"],
  "Stick Stiffness (Flex)": ["Flexible", "Medium", "Stiff", "Very Stiff"],
  "Balance Point": [
    "All-around Offensive/Defensive",
    "Head Heavy (Offensive)",
    "Head Light (Defensive)",
  ],
  "Maximum Tension": ["< 10kg", "10-11kg", "11-12kg", "> 12kg"],
  Type: ["Feather (Bird/Swallow)", "Hybrid", "Nylon"],
  Speed: ["76", "77", "78"],
  Packaging: ["Tube of 12", "Tube of 6", "Single"],
  "Size (EU)": [
    "36", "37", "38", "39", "40", "41", "42", "43", "44", "45",
  ],
  Gender: ["Male", "Female", "Unisex"],
  "Key Features": [
    "Power Cushion",
    "Ankle support",
    "Ultralightweight",
    "Grip sole",
  ],
  Color: [
    "Red", "Orange", "Yellow", "Green", "Blue",
    "Purple", "Pink", "Black", "White", "Grey", "Navy",
  ],
  "Bag Type": [
    "Backpack",
    "Rectangular bag (2 compartments)",
    "Specialized bag (3 compartments)",
    "Drawstring bag",
  ],
  Capacity: ["1-3 rackets", "6 rackets", "9 rackets", "12 rackets"],
  Features: ["Separate shoe compartment", "Insulated", "Waterproof"],
  "Accessory Type": [
    "Grid (Liner)",
    "Grip Tape",
    "Wrist/Headband",
    "Socks",
    "Clothing",
  ],
  Thickness: ["0.6mm", "0.65mm", "0.7mm", "0.75mm"],
  Feel: ["Repulsion", "Durability", "Hitting Sound"],
};

/* ── Color hex map for visual swatches ── */
const COLOR_MAP: Record<string, string> = {
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

/* ── Icons per spec key (emoji-based) ── */
const SPEC_ICONS: Record<string, string> = {
  "Weight (U)": "⚖️",
  "Grip Circumference (G)": "✊",
  "Stick Stiffness (Flex)": "🏏",
  "Balance Point": "⚡",
  "Maximum Tension": "🔧",
  Type: "🪶",
  Speed: "💨",
  Packaging: "📦",
  "Size (EU)": "📏",
  Gender: "👤",
  "Key Features": "⭐",
  Color: "🎨",
  "Bag Type": "👜",
  Capacity: "🎒",
  Features: "✨",
  "Accessory Type": "🧵",
  Thickness: "📐",
  Feel: "🎯",
};

/* ── Racket-specific: Stringing service constants ── */
// Deprecated hardcoded list, now fetched dynamically
// export const STRING_TYPES = [...]

const getTensionZone = (t: number) => {
  if (t <= 21) return { label: "Soft", color: "text-sky-500", bg: "bg-sky-50", desc: "Maximum repulsion, forgiving sweet spot. Best for beginners." };
  if (t <= 25) return { label: "Medium", color: "text-emerald-600", bg: "bg-emerald-50", desc: "Balanced control & power. Best for most players." };
  if (t <= 28) return { label: "High", color: "text-amber-600", bg: "bg-amber-50", desc: "Precision control, smaller sweet spot. For advanced players." };
  return { label: "Hard", color: "text-red-600", bg: "bg-red-50", desc: "Maximum control, very small sweet spot. Tournament level play." };
};

/* ── Racket detection helper ── */
const RACKET_SPEC_KEYS = ["Weight (U)", "Grip Circumference (G)", "Stick Stiffness (Flex)", "Maximum Tension"];

type Props = {
  product: Product;
  allProducts?: Product[];
  selections: Record<string, string>;
  onSelect: (key: string, value: string) => void;
  /* Stringing service */
  addStringService?: boolean;
  onToggleStringService?: () => void;
  stringType?: string;
  onStringTypeChange?: (id: string) => void;
  tension?: number;
  onTensionChange?: (t: number) => void;
};

/* ── Helper: count products whose spec matches a given value ── */
export function getSpecCount(products: Product[], specKey: string, specValue: string): number {
  const normalize = (s: any) => String(s || "").toLowerCase().replace(/[^a-z0-9]/gi, "");
  const targetKey = normalize(specKey);
  const targetVal = normalize(specValue);
  return products.filter((p) => {
    if (!p.specs) return false;
    const entry = Object.entries(p.specs).find(([pk]) => normalize(pk) === targetKey);
    if (!entry) return false;
    return normalize(entry[1]) === targetVal;
  }).length;
}

export default function DynamicVariantOptions({
  product,
  allProducts = [],
  selections,
  onSelect,
  addStringService = false,
  onToggleStringService,
  stringType = "bg66u",
  onStringTypeChange,
  tension = 24,
  onTensionChange,
}: Props) {
  const specs = product.specs || {};

  /* Derive which spec keys this product actually has (that are in the config) */
  const specEntries = useMemo(() => {
    return Object.entries(specs).filter(([key]) => key in SPEC_OPTIONS);
  }, [specs]);

  /* Detect if this is a racket (has racket-specific spec keys) */
  const isRacket = useMemo(() => {
    const specKeys = Object.keys(specs);
    return RACKET_SPEC_KEYS.filter((k) => specKeys.includes(k)).length >= 2;
  }, [specs]);

  const [strings, setStrings] = useState<any[]>([]);

  useEffect(() => {
    if (isRacket) {
      fetchStringSpools().then(data => setStrings(data)).catch(console.warn);
    }
  }, [isRacket]);

  const zone = getTensionZone(tension);
  const selectedStringObj = strings.find((s) => s._id === stringType) || strings[0] || { name: "", price: 0 };

  if (specEntries.length === 0) return null;

  return (
    <div className="space-y-6">
      {specEntries.map(([specKey, productValue]) => {
        const allOptions = SPEC_OPTIONS[specKey] || [];
        const selectedValue = selections[specKey] ?? String(productValue);
        const icon = SPEC_ICONS[specKey] || "🔹";
        const isColor = specKey === "Color";

        return (
          <div key={specKey}>
            {/* Section header */}
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-secondary flex items-center gap-2">
                <span className="text-base">{icon}</span>
                {specKey}
              </h3>
              {selectedValue && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  {selectedValue}
                </span>
              )}
            </div>

            {/* Options */}
            {isColor ? (
              /* ── Color swatches ── */
              <div className="flex flex-wrap gap-3">
                {allOptions.map((opt) => {
                  const active = selectedValue === opt;
                  const hex = COLOR_MAP[opt] || opt.toLowerCase();
                  const isLight = opt === "White" || opt === "Yellow";
                  const count = allProducts.length > 0 ? getSpecCount(allProducts, specKey, opt) : null;
                  const isDisabled = count !== null && count === 0;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => !isDisabled && onSelect(specKey, opt)}
                      disabled={isDisabled}
                      className={`group relative flex flex-col items-center gap-1.5 transition ${isDisabled ? "cursor-not-allowed opacity-40" : ""}`}
                      title={`${opt}${count !== null ? ` (${count})` : ""}${isDisabled ? " — Unavailable" : ""}`}
                    >
                      <div
                        className={`grid h-10 w-10 place-items-center rounded-full border-2 transition ${
                          isDisabled
                            ? "border-black/5 grayscale"
                            : active
                              ? "border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/30 ring-offset-2 scale-110"
                              : "border-black/10 hover:border-black/20 hover:shadow-sm"
                        }`}
                        style={{ backgroundColor: hex }}
                      >
                        {active && !isDisabled && (
                          <span className={`text-xs font-bold ${isLight ? "text-gray-800" : "text-white"}`}>
                            ✓
                          </span>
                        )}
                        {isDisabled && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-[1.5px] w-8 rotate-45 bg-red-400/70 rounded-full" />
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] font-medium ${isDisabled ? "text-secondary/30 line-through" : active ? "text-primary font-bold" : "text-secondary/50"}`}>
                        {opt}
                        {count !== null && (
                          <span className="ml-0.5 opacity-70">({count})</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* ── Pill / chip buttons ── */
              <div className="flex flex-wrap gap-2">
                {allOptions.map((opt) => {
                  const active = selectedValue === opt;
                  const count = allProducts.length > 0 ? getSpecCount(allProducts, specKey, opt) : null;
                  const isDisabled = count !== null && count === 0;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => !isDisabled && onSelect(specKey, opt)}
                      disabled={isDisabled}
                      className={`relative rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 ${
                        isDisabled
                          ? "bg-gray-100/60 text-secondary/25 ring-1 ring-black/5 cursor-not-allowed line-through"
                          : active
                            ? "bg-primary text-white shadow-md shadow-primary/20 ring-1 ring-primary scale-[1.02]"
                            : "bg-gray-50 text-secondary/70 hover:bg-gray-100 hover:text-secondary ring-1 ring-black/5"
                      }`}
                    >
                      {opt}
                      {count !== null && (
                        <span className={`ml-1.5 ${isDisabled ? "text-secondary/20" : active ? "text-white/70" : "text-secondary/40"} text-[10px] font-medium`}>
                          ({count})
                        </span>
                      )}
                      {active && !isDisabled && (
                        <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-[8px] text-white shadow">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Stringing Service (Racket-only) ── */}
      {isRacket && onToggleStringService && (
        <>
          {/* Toggle */}
          <div
            className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${
              addStringService
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-black/5 hover:border-black/10 bg-white"
            }`}
            onClick={onToggleStringService}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition ${addStringService ? "border-primary bg-primary text-white" : "border-black/20"}`}>
                  {addStringService && <Check size={14} className="stroke-[3]" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-secondary">🔧 Pro Stringing Service</p>
                  <p className="text-xs text-secondary/50 mt-0.5">Custom string + tension (+1-2 business days)</p>
                </div>
              </div>
              <span className={`font-mono text-sm font-bold ${addStringService ? "text-primary" : "text-secondary/60"}`}>
                +{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(selectedStringObj.price || 0)}
              </span>
            </div>
          </div>

          {/* Expanded stringing options */}
          {addStringService && (
            <div className="space-y-5 rounded-2xl border border-primary/15 bg-white p-5 animate-in slide-in-from-top-2 fade-in duration-300">
              {/* String Type */}
              <div>
                <label className="mb-3 block text-sm font-bold text-secondary">String Type</label>
                <div className="grid gap-2">
                  {strings.map((s) => (
                    <button
                      key={s._id}
                      onClick={(e) => { e.stopPropagation(); onStringTypeChange?.(s._id); }}
                      className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-all ${
                        stringType === s._id
                          ? "border-primary bg-primary/5"
                          : "border-black/5 hover:border-black/15 bg-gray-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`grid h-5 w-5 place-items-center rounded-full border ${stringType === s._id ? "border-primary bg-primary text-white" : "border-black/15"}`}>
                          {stringType === s._id && <Check size={10} strokeWidth={3} />}
                        </div>
                        <div className="flex flex-col">
                          <div>
                            <span className="text-sm font-bold text-secondary">{s.name}</span>
                            <span className="ml-2 text-xs text-secondary/50">{s.desc}</span>
                          </div>
                          {s.addedBy && (
                            <span className="text-[10px] text-primary/70 font-semibold tracking-wide uppercase mt-0.5">Added by: {s.addedBy.name}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-primary">{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(s.price)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tension Slider */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-bold text-secondary">String Tension</label>
                  <span className="rounded-lg bg-primary/10 px-3 py-1 text-sm font-black text-primary">{tension} lbs</span>
                </div>
                <input
                  type="range" min="18" max="32" step="1" value={tension}
                  onChange={(e) => { e.stopPropagation(); onTensionChange?.(Number(e.target.value)); }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full h-2 appearance-none rounded-full bg-black/10 accent-primary cursor-pointer"
                />
                <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-wider text-secondary/40">
                  <span className={tension <= 21 ? "text-sky-500" : ""}>18 lbs</span>
                  <span className={tension > 21 && tension <= 25 ? "text-emerald-600" : ""}>Balanced</span>
                  <span className={tension > 25 && tension <= 28 ? "text-amber-600" : ""}>High</span>
                  <span className={tension > 28 ? "text-red-600" : ""}>32 lbs</span>
                </div>
                {/* Zone Indicator */}
                <div className={`mt-3 flex items-start gap-2 rounded-xl ${zone.bg} p-3`}>
                  <Info size={16} className={`shrink-0 mt-0.5 ${zone.color}`} />
                  <div>
                    <span className={`text-xs font-black uppercase tracking-wider ${zone.color}`}>{zone.label}</span>
                    <p className="text-xs text-secondary/60 mt-0.5">{zone.desc}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
