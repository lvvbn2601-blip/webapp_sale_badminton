import { Check, Package } from "lucide-react";

const BAG_TYPES = [
  {
    id: "2-compartment",
    label: "2-Compartment Stand",
    icon: "🎒",
    capacity: "Up to 3 rackets",
    desc: "Compact with shoe pocket. Perfect for casual players who travel light.",
    features: ["Shoe compartment", "Side pocket", "Padded straps"],
  },
  {
    id: "3-compartment",
    label: "3-Compartment Stand",
    icon: "👜",
    capacity: "Up to 6 rackets",
    desc: "Spacious with thermal lining. Ideal for club players with multiple rackets.",
    features: ["Thermal lining", "Wet pocket", "Accessory pouch", "Shoe compartment"],
  },
  {
    id: "backpack",
    label: "Backpack Style",
    icon: "🎒",
    capacity: "Up to 2 rackets",
    desc: "Urban design with laptop pocket. Great for commuting players.",
    features: ["Laptop pocket", "USB charging port", "Rain cover", "Ergonomic back"],
  },
];

const BAG_COLORS = [
  { id: "black", label: "Black", bg: "#212121" },
  { id: "navy", label: "Navy", bg: "#1a237e" },
  { id: "red", label: "Red", bg: "#c62828" },
  { id: "white", label: "White", bg: "#f5f5f5" },
];

type Props = {
  selectedBagType: string;
  setSelectedBagType: (t: string) => void;
  selectedColor: string;
  setSelectedColor: (c: string) => void;
};

export default function BagOptions({ selectedBagType, setSelectedBagType, selectedColor, setSelectedColor }: Props) {
  return (
    <div className="space-y-6 rounded-[24px] border border-black/5 bg-gray-50/50 p-6">
      {/* Bag Type — Radio Cards */}
      <div>
        <label className="mb-3 block text-sm font-bold text-secondary">Bag Type</label>
        <div className="grid gap-3">
          {BAG_TYPES.map(bag => (
            <button
              key={bag.id}
              onClick={() => setSelectedBagType(bag.id)}
              className={`relative text-left rounded-2xl border-2 p-5 transition-all ${selectedBagType === bag.id ? "border-primary bg-primary/5 shadow-sm" : "border-black/5 bg-white hover:border-black/15"}`}
            >
              <div className="flex items-start gap-4">
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl ${selectedBagType === bag.id ? "bg-primary/10" : "bg-gray-100"}`}>
                  {bag.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-secondary">{bag.label}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-secondary/60 uppercase tracking-wide">{bag.capacity}</span>
                  </div>
                  <p className="text-xs text-secondary/60 mb-2">{bag.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {bag.features.map(f => (
                      <span key={f} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-secondary/70">
                        <Check size={8} strokeWidth={3} className="text-emerald-500" /> {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {selectedBagType === bag.id && (
                <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-primary text-white shadow-sm">
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="mb-3 block text-sm font-bold text-secondary">Color</label>
        <div className="flex gap-3">
          {BAG_COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedColor(c.id)}
              className={`group relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-5 py-3 transition-all ${selectedColor === c.id ? "border-primary bg-primary/5 shadow-sm" : "border-black/5 bg-white hover:border-black/15"}`}
            >
              <div className="h-8 w-8 rounded-full shadow-inner ring-1 ring-black/10" style={{ backgroundColor: c.bg }} />
              <span className="text-[10px] font-bold text-secondary/60">{c.label}</span>
              {selectedColor === c.id && (
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-white shadow-sm">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
