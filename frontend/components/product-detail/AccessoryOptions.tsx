import { Check, Info } from "lucide-react";

const ACCESSORY_TYPES = [
  { id: "strings", label: "Strings", icon: "🧵", basePrice: 12, desc: "Badminton racket strings" },
  { id: "grip", label: "Overgrip", icon: "🤚", basePrice: 5, desc: "Replacement grip tape" },
  { id: "shoe-soles", label: "Shoe Insoles", icon: "👟", basePrice: 18, desc: "Shock absorbing insoles" },
  { id: "wristband", label: "Wristbands", icon: "💪", basePrice: 8, desc: "Sweat-absorbing wristbands" },
  { id: "towel-grip", label: "Towel Grip", icon: "🧤", basePrice: 6, desc: "Cotton towel wrap grip" },
  { id: "shuttlecock-holder", label: "Shuttle Holder", icon: "🎯", basePrice: 4, desc: "Clip-on shuttlecock holder" },
];

const getTensionZone = (t: number) => {
  if (t <= 21) return { label: "Soft", color: "text-sky-500", bg: "bg-sky-50", desc: "Maximum repulsion & comfort." };
  if (t <= 25) return { label: "Medium", color: "text-emerald-600", bg: "bg-emerald-50", desc: "Balanced control & power." };
  if (t <= 28) return { label: "High", color: "text-amber-600", bg: "bg-amber-50", desc: "Precision control." };
  return { label: "Hard", color: "text-red-600", bg: "bg-red-50", desc: "Maximum control. Tournament level." };
};

type Props = {
  accessoryType: string;
  setAccessoryType: (t: string) => void;
  tension: number;
  setTension: (t: number) => void;
  dynamicPrice: number;
};

export default function AccessoryOptions({ accessoryType, setAccessoryType, tension, setTension, dynamicPrice }: Props) {
  const zone = getTensionZone(tension);

  return (
    <div className="space-y-6 rounded-[24px] border border-black/5 bg-gray-50/50 p-6">
      {/* Type Selector */}
      <div>
        <label className="mb-3 block text-sm font-bold text-secondary">Accessory Type</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ACCESSORY_TYPES.map(acc => (
            <button
              key={acc.id}
              onClick={() => setAccessoryType(acc.id)}
              className={`relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-4 transition-all ${accessoryType === acc.id ? "border-primary bg-primary/5 shadow-sm" : "border-black/5 bg-white hover:border-black/15"}`}
            >
              <span className="text-xl">{acc.icon}</span>
              <span className="text-xs font-bold text-secondary text-center leading-tight">{acc.label}</span>
              <span className="text-[10px] font-bold text-primary">${acc.basePrice}</span>
              {accessoryType === acc.id && (
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-white shadow-sm">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Description of selected type */}
      {accessoryType && (
        <div className="flex items-center gap-2 rounded-xl bg-white border border-black/5 p-3">
          <Info size={14} className="shrink-0 text-primary" />
          <span className="text-xs text-secondary/70">
            {ACCESSORY_TYPES.find(a => a.id === accessoryType)?.desc}
          </span>
          <span className="ml-auto text-sm font-black text-primary">${dynamicPrice}</span>
        </div>
      )}

      {/* Tension slider — only for strings */}
      {accessoryType === "strings" && (
        <div className="rounded-2xl border border-primary/15 bg-white p-5 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-bold text-secondary">Recommended Tension</label>
            <span className="rounded-lg bg-primary/10 px-3 py-1 text-sm font-black text-primary">{tension} lbs</span>
          </div>
          <input
            type="range" min="18" max="32" step="1" value={tension}
            onChange={(e) => setTension(Number(e.target.value))}
            className="w-full h-2 appearance-none rounded-full bg-black/10 accent-primary cursor-pointer"
          />
          <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-wider text-secondary/40">
            <span className={tension <= 21 ? "text-sky-500" : ""}>Soft</span>
            <span className={tension > 21 && tension <= 25 ? "text-emerald-600" : ""}>Medium</span>
            <span className={tension > 25 && tension <= 28 ? "text-amber-600" : ""}>High</span>
            <span className={tension > 28 ? "text-red-600" : ""}>Hard</span>
          </div>
          <div className={`mt-3 flex items-start gap-2 rounded-xl ${zone.bg} p-3`}>
            <Info size={16} className={`shrink-0 mt-0.5 ${zone.color}`} />
            <div>
              <span className={`text-xs font-black uppercase tracking-wider ${zone.color}`}>{zone.label}</span>
              <p className="text-xs text-secondary/60 mt-0.5">{zone.desc}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { ACCESSORY_TYPES };
