import { useState } from "react";
import { Check, ExternalLink, X } from "lucide-react";

const SHOE_COLORS = [
  { id: "white-red", label: "White / Red", bg: "linear-gradient(135deg, #fff 50%, #c62828 50%)" },
  { id: "black-gold", label: "Black / Gold", bg: "linear-gradient(135deg, #212121 50%, #ffd600 50%)" },
  { id: "navy-silver", label: "Navy / Silver", bg: "linear-gradient(135deg, #1a237e 50%, #bdbdbd 50%)" },
  { id: "white-mint", label: "White / Mint", bg: "linear-gradient(135deg, #fafafa 50%, #00897b 50%)" },
];

const EU_SIZES = [
  { size: "38", inStock: true },
  { size: "39", inStock: true },
  { size: "40", inStock: true },
  { size: "40.5", inStock: false },
  { size: "41", inStock: true },
  { size: "42", inStock: true },
  { size: "42.5", inStock: false },
  { size: "43", inStock: true },
  { size: "44", inStock: true },
  { size: "44.5", inStock: false },
  { size: "45", inStock: true },
  { size: "46", inStock: true },
];

const SIZE_CHART = [
  { eu: "38", us: "5.5", uk: "5", cm: "24" },
  { eu: "39", us: "6.5", uk: "6", cm: "24.5" },
  { eu: "40", us: "7", uk: "6.5", cm: "25" },
  { eu: "41", us: "8", uk: "7.5", cm: "26" },
  { eu: "42", us: "8.5", uk: "8", cm: "26.5" },
  { eu: "43", us: "9.5", uk: "9", cm: "27.5" },
  { eu: "44", us: "10", uk: "9.5", cm: "28" },
  { eu: "45", us: "11", uk: "10.5", cm: "29" },
  { eu: "46", us: "12", uk: "11", cm: "29.5" },
];

type Props = {
  selectedColor: string;
  setSelectedColor: (c: string) => void;
  selectedSize: string;
  setSelectedSize: (s: string) => void;
};

export default function ShoeOptions({ selectedColor, setSelectedColor, selectedSize, setSelectedSize }: Props) {
  const [showSizeChart, setShowSizeChart] = useState(false);

  return (
    <div className="space-y-6 rounded-[24px] border border-black/5 bg-gray-50/50 p-6">
      {/* Color */}
      <div>
        <label className="mb-3 block text-sm font-bold text-secondary">Color</label>
        <div className="flex flex-wrap gap-3">
          {SHOE_COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedColor(c.id)}
              className={`group relative flex items-center gap-2.5 rounded-xl border-2 px-4 py-2.5 transition-all ${selectedColor === c.id ? "border-primary bg-primary/5 shadow-sm" : "border-black/5 bg-white hover:border-black/15"}`}
            >
              <div className="h-6 w-6 rounded-full shadow-inner ring-1 ring-black/10" style={{ background: c.bg }} />
              <span className="text-xs font-semibold text-secondary/80">{c.label}</span>
              {selectedColor === c.id && (
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-white shadow-sm">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* EU Size */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-bold text-secondary">EU Size</label>
          <button
            onClick={() => setShowSizeChart(true)}
            className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary hover:underline"
          >
            <ExternalLink size={12} /> Size Chart
          </button>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {EU_SIZES.map(s => (
            <button
              key={s.size}
              disabled={!s.inStock}
              onClick={() => s.inStock && setSelectedSize(s.size)}
              className={`relative h-11 rounded-xl border-2 text-sm font-bold transition-all
                ${!s.inStock ? "border-black/5 bg-gray-100 text-secondary/25 cursor-not-allowed line-through" : ""}
                ${s.inStock && selectedSize === s.size ? "border-primary bg-primary/5 text-primary shadow-sm" : ""}
                ${s.inStock && selectedSize !== s.size ? "border-black/5 bg-white text-secondary hover:border-black/15" : ""}
              `}
            >
              {s.size}
              {!s.inStock && (
                <span className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-red-100 text-red-500">
                  <X size={8} strokeWidth={3} />
                </span>
              )}
              {selectedSize === s.size && s.inStock && (
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-white shadow-sm">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          ))}
        </div>
        {selectedSize && (
          <p className="mt-2 text-xs text-secondary/50">Selected: EU {selectedSize}</p>
        )}
      </div>

      {/* Size Chart Modal */}
      {showSizeChart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowSizeChart(false)}>
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl mx-4 animate-in zoom-in-95 fade-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-secondary">Shoe Size Chart</h3>
              <button onClick={() => setShowSizeChart(false)} className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 text-secondary/60 hover:bg-gray-200 transition">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-black/5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-secondary/70 text-left">
                    <th className="px-4 py-3 font-bold">EU</th>
                    <th className="px-4 py-3 font-bold">US</th>
                    <th className="px-4 py-3 font-bold">UK</th>
                    <th className="px-4 py-3 font-bold">CM</th>
                  </tr>
                </thead>
                <tbody>
                  {SIZE_CHART.map(row => (
                    <tr key={row.eu} className="border-t border-black/5 hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-bold text-secondary">{row.eu}</td>
                      <td className="px-4 py-2.5 text-secondary/70">{row.us}</td>
                      <td className="px-4 py-2.5 text-secondary/70">{row.uk}</td>
                      <td className="px-4 py-2.5 text-secondary/70">{row.cm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-secondary/40 text-center">Measure heel-to-toe length and compare with CM column</p>
          </div>
        </div>
      )}
    </div>
  );
}
