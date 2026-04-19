import { Check, Thermometer } from "lucide-react";

const MATERIALS = [
  { id: "feather", label: "Natural Feather", icon: "🪶", desc: "Premium duck/goose feather. Superior flight & feel.", priceNote: "Premium" },
  { id: "nylon", label: "Nylon", icon: "🔵", desc: "Durable synthetic. Best for training & beginners.", priceNote: "Economy" },
];

const SPEED_OPTIONS = [
  { speed: 75, temp: "27°C+", tempRange: "Hot climate", color: "from-red-400 to-orange-400", icon: "🌡️", desc: "Slow — Ideal for hot, humid conditions" },
  { speed: 76, temp: "22–27°C", tempRange: "Warm climate", color: "from-orange-400 to-yellow-400", icon: "☀️", desc: "Medium slow — Standard warm weather" },
  { speed: 77, temp: "17–22°C", tempRange: "Mild climate", color: "from-green-400 to-teal-400", icon: "🌤️", desc: "Medium — Most common, standard play" },
  { speed: 78, temp: "Below 17°C", tempRange: "Cool climate", color: "from-blue-400 to-indigo-400", icon: "❄️", desc: "Fast — Cold weather, indoor winter" },
];

const BOX_UNITS = [
  { qty: 1, label: "1 Tube", pieces: "12 pcs", discount: "" },
  { qty: 3, label: "3 Tubes", pieces: "36 pcs", discount: "-5%" },
  { qty: 6, label: "6 Tubes", pieces: "72 pcs", discount: "-10%" },
  { qty: 12, label: "12 Tubes (1 Box)", pieces: "144 pcs", discount: "-15%" },
];

type Props = {
  selectedMaterial: string;
  setSelectedMaterial: (m: string) => void;
  selectedSpeed: number;
  setSelectedSpeed: (s: number) => void;
  purchaseUnit: number;
  setPurchaseUnit: (u: number) => void;
};

export default function ShuttlecockOptions({
  selectedMaterial, setSelectedMaterial,
  selectedSpeed, setSelectedSpeed,
  purchaseUnit, setPurchaseUnit,
}: Props) {
  return (
    <div className="space-y-6 rounded-[24px] border border-black/5 bg-gray-50/50 p-6">
      {/* Material */}
      <div>
        <label className="mb-3 block text-sm font-bold text-secondary">Material</label>
        <div className="grid grid-cols-2 gap-3">
          {MATERIALS.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMaterial(m.id)}
              className={`relative text-left rounded-2xl border-2 p-4 transition-all ${selectedMaterial === m.id ? "border-primary bg-primary/5 shadow-sm" : "border-black/5 bg-white hover:border-black/15"}`}
            >
              <div className="text-2xl mb-2">{m.icon}</div>
              <p className="text-sm font-bold text-secondary">{m.label}</p>
              <p className="text-xs text-secondary/50 mt-0.5">{m.desc}</p>
              <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${m.id === "feather" ? "bg-amber-50 text-amber-600" : "bg-sky-50 text-sky-600"}`}>
                {m.priceNote}
              </span>
              {selectedMaterial === m.id && (
                <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-primary text-white shadow-sm">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Speed Selection — Visual Cards */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-bold text-secondary">Speed (Based on Temperature)</label>
          <Thermometer size={16} className="text-secondary/40" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {SPEED_OPTIONS.map(s => (
            <button
              key={s.speed}
              onClick={() => setSelectedSpeed(s.speed)}
              className={`relative text-left rounded-2xl border-2 p-4 transition-all overflow-hidden ${selectedSpeed === s.speed ? "border-primary shadow-sm" : "border-black/5 hover:border-black/15"}`}
            >
              <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${s.color}`} />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-2xl font-black text-secondary">{s.speed}</span>
                </div>
                <p className="text-xs font-bold text-secondary">{s.tempRange}</p>
                <p className="text-[10px] text-secondary/50 mt-0.5">{s.temp}</p>
                <p className="text-[10px] text-secondary/40 mt-1">{s.desc}</p>
              </div>
              {selectedSpeed === s.speed && (
                <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-primary text-white shadow-sm">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Purchase Unit */}
      <div>
        <label className="mb-3 block text-sm font-bold text-secondary">Purchase Unit</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {BOX_UNITS.map(b => (
            <button
              key={b.qty}
              onClick={() => setPurchaseUnit(b.qty)}
              className={`relative flex flex-col items-center gap-1 rounded-xl border-2 py-3 transition-all ${purchaseUnit === b.qty ? "border-primary bg-primary/5 shadow-sm" : "border-black/5 bg-white hover:border-black/15"}`}
            >
              <span className="text-sm font-bold text-secondary">{b.label}</span>
              <span className="text-[10px] text-secondary/50">{b.pieces}</span>
              {b.discount && (
                <span className="mt-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                  {b.discount}
                </span>
              )}
              {purchaseUnit === b.qty && (
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
