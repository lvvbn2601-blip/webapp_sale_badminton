import { useState } from "react";
import { Check, Info } from "lucide-react";

const GRIP_SPECS: Record<string, { circ: string; desc: string }> = {
  G4: { circ: "3.5″ (89mm)", desc: "Large — Power grip for big hands" },
  G5: { circ: "3.25″ (83mm)", desc: "Standard — Most popular size" },
  G6: { circ: "3.0″ (76mm)", desc: "Small — For quick wrist play" },
};

const COLOR_OPTIONS = [
  { id: "navy-gold", label: "Navy / Gold", from: "#1a237e", to: "#ffd600" },
  { id: "red-black", label: "Red / Black", from: "#c62828", to: "#212121" },
  { id: "teal-white", label: "Teal / White", from: "#00695c", to: "#e0e0e0" },
  { id: "purple-silver", label: "Purple / Silver", from: "#6a1b9a", to: "#bdbdbd" },
  { id: "orange-carbon", label: "Orange / Carbon", from: "#e65100", to: "#37474f" },
];

const STRING_TYPES = [
  { id: "bg65", name: "Yonex BG65", desc: "All-round durability", price: 12 },
  { id: "bg66u", name: "Yonex BG66 Ultimax", desc: "High repulsion power", price: 15 },
  { id: "bg80", name: "Yonex BG80", desc: "Hard hitting feel", price: 14 },
  { id: "nanogy99", name: "Yonex Nanogy 99", desc: "Control & feel", price: 16 },
  { id: "li-no1", name: "Li-Ning No.1", desc: "Explosive power", price: 13 },
];

const getTensionZone = (t: number) => {
  if (t <= 21) return { label: "Soft", color: "text-sky-500", bg: "bg-sky-50", desc: "Maximum repulsion, forgiving sweet spot. Best for beginners." };
  if (t <= 25) return { label: "Medium", color: "text-emerald-600", bg: "bg-emerald-50", desc: "Balanced control & power. Best for most players." };
  if (t <= 28) return { label: "High", color: "text-amber-600", bg: "bg-amber-50", desc: "Precision control, smaller sweet spot. For advanced players." };
  return { label: "Hard", color: "text-red-600", bg: "bg-red-50", desc: "Maximum control, very small sweet spot. Tournament level play." };
};

type Props = {
  selectedColor: string;
  setSelectedColor: (c: string) => void;
  selectedGrip: string;
  setSelectedGrip: (g: string) => void;
  addStringService: boolean;
  setAddStringService: (v: boolean) => void;
  stringType: string;
  setStringType: (s: string) => void;
  tension: number;
  setTension: (t: number) => void;
};

export default function RacketOptions({
  selectedColor, setSelectedColor,
  selectedGrip, setSelectedGrip,
  addStringService, setAddStringService,
  stringType, setStringType,
  tension, setTension,
}: Props) {
  const [showGripInfo, setShowGripInfo] = useState("");
  const zone = getTensionZone(tension);
  const selectedString = STRING_TYPES.find(s => s.id === stringType) || STRING_TYPES[0];

  return (
    <div className="space-y-6 rounded-[24px] border border-black/5 bg-gray-50/50 p-6">
      {/* Color Selection */}
      <div>
        <label className="mb-3 block text-sm font-bold text-secondary">Color Variant</label>
        <div className="flex flex-wrap gap-3">
          {COLOR_OPTIONS.map(clr => (
            <button
              key={clr.id}
              onClick={() => setSelectedColor(clr.id)}
              className={`group relative flex items-center gap-2.5 rounded-xl border-2 px-4 py-2.5 transition-all ${selectedColor === clr.id ? "border-primary bg-primary/5 shadow-sm" : "border-black/5 bg-white hover:border-black/15"}`}
            >
              <div
                className="h-6 w-6 rounded-full shadow-inner ring-1 ring-black/10"
                style={{ background: `linear-gradient(135deg, ${clr.from} 50%, ${clr.to} 50%)` }}
              />
              <span className="text-xs font-semibold text-secondary/80">{clr.label}</span>
              {selectedColor === clr.id && (
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-white shadow-sm">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Grip Size */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-bold text-secondary">Grip Size</label>
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary cursor-pointer hover:underline">Size Guide</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(GRIP_SPECS).map(([g, spec]) => (
            <button
              key={g}
              onClick={() => setSelectedGrip(g)}
              onMouseEnter={() => setShowGripInfo(g)}
              onMouseLeave={() => setShowGripInfo("")}
              className={`relative flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 transition-all ${selectedGrip === g ? "border-primary bg-primary/5" : "border-black/5 bg-white hover:border-black/15"}`}
            >
              <span className="text-base font-black text-secondary">{g}</span>
              <span className="text-[10px] font-medium text-secondary/50">{spec.circ}</span>
              {selectedGrip === g && (
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-white shadow-sm">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
              {showGripInfo === g && (
                <div className="absolute -bottom-12 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
                  {spec.desc}
                  <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Stringing Service Toggle */}
      <div
        className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${addStringService ? "border-primary bg-primary/5 shadow-sm" : "border-black/5 hover:border-black/10 bg-white"}`}
        onClick={() => setAddStringService(!addStringService)}
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
            +${selectedString.price}.00
          </span>
        </div>
      </div>

      {/* Stringing Details (expanded) */}
      {addStringService && (
        <div className="space-y-5 rounded-2xl border border-primary/15 bg-white p-5 animate-in slide-in-from-top-2 fade-in duration-300">
          {/* String Type */}
          <div>
            <label className="mb-3 block text-sm font-bold text-secondary">String Type</label>
            <div className="grid gap-2">
              {STRING_TYPES.map(s => (
                <button
                  key={s.id}
                  onClick={(e) => { e.stopPropagation(); setStringType(s.id); }}
                  className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-all ${stringType === s.id ? "border-primary bg-primary/5" : "border-black/5 hover:border-black/15 bg-gray-50/50"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`grid h-5 w-5 place-items-center rounded-full border ${stringType === s.id ? "border-primary bg-primary text-white" : "border-black/15"}`}>
                      {stringType === s.id && <Check size={10} strokeWidth={3} />}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-secondary">{s.name}</span>
                      <span className="ml-2 text-xs text-secondary/50">{s.desc}</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-primary">${s.price}</span>
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
              onChange={(e) => { e.stopPropagation(); setTension(Number(e.target.value)); }}
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
    </div>
  );
}

export { STRING_TYPES };
