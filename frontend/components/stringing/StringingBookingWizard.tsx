import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, ChevronLeft, Camera, Upload, Info,
  Check, AlertTriangle, Zap, Clock, Star, ShoppingCart,
} from "lucide-react";
import { useEffect } from "react";
import { uploadImage, fetchStringSpools } from "../../lib/api";

/* ── String catalog (dynamic) ── */
type StringSpool = {
  _id: string; name: string; price: number; power: number;
  sound: number; control: number; desc: string;
  addedBy?: { name: string };
};

const SERVICE_TYPES = [
  { id: "standard", label: "Standard Service", time: "Delivered within 24 hours", price: 0, icon: "🕐" },
  { id: "express", label: "Express Service ⚡", time: "Delivered within 2 hours", price: 50000, icon: "🚀" },
];

const formatVND = (n: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const getTensionZone = (t: number) => {
  if (t <= 21) return { label: "Soft", color: "text-sky-600", bg: "bg-sky-50 border-sky-200", bar: "bg-sky-500", desc: "Maximum repulsion, forgiving sweet spot. Best for beginners.", pct: 20 };
  if (t <= 25) return { label: "Medium", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", bar: "bg-emerald-500", desc: "Balanced control & power. Best for most players.", pct: 50 };
  if (t <= 28) return { label: "High", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", bar: "bg-amber-500", desc: "Precision control, smaller sweet spot. Advanced players.", pct: 75 };
  return { label: "Extreme ⚠️", color: "text-red-600", bg: "bg-red-50 border-red-200", bar: "bg-red-500", desc: "Maximum control, risk of frame damage. Tournament level only.", pct: 95 };
};

const getDifficulty = (pattern: string, tension: number) => {
  if (pattern === "pro_pattern" || tension >= 29) return { label: "Hard", color: "bg-red-100 text-red-700" };
  if (pattern === "4_knots" || tension >= 26) return { label: "Medium", color: "bg-yellow-100 text-yellow-700" };
  return { label: "Easy", color: "bg-green-100 text-green-700" };
};

type Props = {
  onSubmit: (data: any) => Promise<void>;
  isSubmitting: boolean;
};

export default function StringingBookingWizard({ onSubmit, isSubmitting }: Props) {
  const [step, setStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Racket Info
  const [racketSource, setRacketSource] = useState<"bring_to_shop" | "new_from_cart">("bring_to_shop");
  const [racketModel, setRacketModel] = useState("");
  const [racketCondition, setRacketCondition] = useState("");
  const [racketImage, setRacketImage] = useState("");
  const [uploading, setUploading] = useState(false);

  // Step 2: String Parameters
  const [strings, setStrings] = useState<StringSpool[]>([]);
  const [selectedString, setSelectedString] = useState("");
  const [tension, setTension] = useState(24);
  const [stringPattern, setStringPattern] = useState<"2_knots" | "4_knots">("2_knots");

  useEffect(() => {
    fetchStringSpools().then(data => {
      setStrings(data);
      if (data.length > 0) setSelectedString(data[0]._id);
    }).catch(e => console.warn(e));
  }, []);

  // Step 3: Service Type
  const [serviceType, setServiceType] = useState("standard");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const stringObj = strings.find(s => s._id === selectedString) || strings[0] || { name: "", price: 0 };
  const serviceObj = SERVICE_TYPES.find(s => s.id === serviceType) || SERVICE_TYPES[0];
  const zone = getTensionZone(tension);
  const difficulty = getDifficulty(stringPattern, tension);

  const totalFee = stringObj.price + serviceObj.price;

  const canProceed1 = racketModel.trim().length > 0;
  const canProceed2 = true;
  const canSubmit = customerName.trim().length > 0 && customerPhone.trim().length > 0;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setRacketImage(url);
    } catch { }
    setUploading(false);
  };

  const handleSubmit = async () => {
    await onSubmit({
      racketSource, racketModel, racketCondition, racketImage,
      stringType: stringObj.name, stringPattern, tension,
      serviceType, isUrgent: serviceType === "express",
      fee: totalFee, customerName, customerPhone,
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[
          { n: 1, label: "Racket Info" },
          { n: 2, label: "String Setup" },
          { n: 3, label: "Service & Book" },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <button
              onClick={() => { if (s.n < step) setStep(s.n); }}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${step === s.n ? "bg-primary text-white shadow-md shadow-primary/20" : step > s.n ? "bg-primary/10 text-primary" : "bg-black/5 text-secondary/40"}`}
            >
              {step > s.n ? <Check size={14} /> : <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-xs font-bold">{s.n}</span>}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < 2 && <ChevronRight size={16} className="text-secondary/20" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ═══ STEP 1: Racket Information ═══ */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
            <div className="text-center mb-2">
              <h2 className="font-heading text-2xl font-bold text-secondary">🏸 Racket Information</h2>
              <p className="text-sm text-secondary/60 mt-1">Tell us about the racket you'd like strung</p>
            </div>

            {/* Racket Source */}
            <div>
              <label className="mb-3 block text-sm font-bold text-secondary">Racket Source</label>
              <div className="grid gap-3">
                {[
                  { id: "bring_to_shop" as const, label: "Bring to Shop", desc: "I'll bring my racket in", icon: "🏪" },
                  
                ].map(opt => (
                  <button key={opt.id} onClick={() => setRacketSource(opt.id)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-5 transition ${racketSource === opt.id ? "border-primary bg-primary/5 shadow-sm" : "border-black/5 hover:border-black/10"}`}>
                    <span className="text-2xl">{opt.icon}</span>
                    <span className="text-sm font-bold text-secondary">{opt.label}</span>
                    <span className="text-[11px] text-secondary/50">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Racket Model */}
            <div>
              <label className="mb-2 block text-sm font-bold text-secondary">Racket Model *</label>
              <input value={racketModel} onChange={e => setRacketModel(e.target.value)}
                placeholder="e.g. Yonex Astrox 99 Pro"
                className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>

            {/* Condition Notes (for bring_to_shop) */}
            {racketSource === "bring_to_shop" && (
              <div className="space-y-4 rounded-2xl border border-black/5 bg-gray-50/50 p-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-secondary">Racket Condition Notes</label>
                  <textarea value={racketCondition} onChange={e => setRacketCondition(e.target.value)}
                    placeholder="e.g. Slight crack at the 2 o'clock position, grommet worn at T-joint..."
                    rows={3}
                    className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-secondary">Upload Racket Photo</label>
                  <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
                  {racketImage ? (
                    <div className="relative w-40 h-40 rounded-2xl overflow-hidden border-2 border-primary/20">
                      <img src={racketImage} alt="Racket" className="w-full h-full object-cover" />
                      <button onClick={() => setRacketImage("")} className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white text-xs">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                      className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 px-6 py-4 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50">
                      {uploading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" /> : <Camera size={20} />}
                      {uploading ? "Uploading..." : "Take / Upload Photo"}
                    </button>
                  )}
                  <p className="mt-2 text-xs text-secondary/40">Helps the stringer assess frame condition before stringing</p>
                </div>
              </div>
            )}

            <button disabled={!canProceed1} onClick={() => setStep(2)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none">
              Continue to String Setup <ChevronRight size={16} />
            </button>
          </motion.div>
        )}

        {/* ═══ STEP 2: String Parameters ═══ */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
            <div className="text-center mb-2">
              <h2 className="font-heading text-2xl font-bold text-secondary">🔧 Customize Stringing</h2>
              <p className="text-sm text-secondary/60 mt-1">Choose your string, tension, and pattern</p>
            </div>

            {/* String Selection */}
            <div>
              <label className="mb-3 block text-sm font-bold text-secondary">Choose String</label>
              <div className="grid gap-2">
                {strings.map(s => (
                  <button key={s._id} onClick={() => setSelectedString(s._id)}
                    className={`flex items-center justify-between rounded-2xl border-2 px-4 py-3.5 transition ${selectedString === s._id ? "border-primary bg-primary/5 shadow-sm" : "border-black/5 hover:border-black/10"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`grid h-5 w-5 place-items-center rounded-full border ${selectedString === s._id ? "border-primary bg-primary text-white" : "border-black/15"}`}>
                        {selectedString === s._id && <Check size={10} strokeWidth={3} />}
                      </div>
                      <div className="text-left flex flex-col">
                        <div>
                          <span className="text-sm font-bold text-secondary">{s.name}</span>
                          <span className="ml-2 text-xs text-secondary/50">{s.desc}</span>
                        </div>
                        {s.addedBy && (
                          <span className="text-[10px] text-primary/70 font-semibold tracking-wide uppercase mt-0.5">Added by: {s.addedBy.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Mini performance bars */}
                      <div className="hidden sm:flex items-center gap-2">
                        {[{ label: "PWR", val: s.power }, { label: "SND", val: s.sound }, { label: "CTR", val: s.control }].map(stat => (
                          <div key={stat.label} className="flex flex-col items-center gap-0.5">
                            <div className="h-1 w-8 rounded-full bg-black/5 overflow-hidden">
                              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${stat.val}%` }} />
                            </div>
                            <span className="text-[8px] font-bold text-secondary/40">{stat.label}</span>
                          </div>
                        ))}
                      </div>
                      <span className="text-sm font-bold text-primary">{formatVND(s.price)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tension Slider */}
            <div className="rounded-2xl border border-black/5 bg-gray-50/50 p-5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-secondary">String Tension</label>
                <span className={`rounded-xl px-3 py-1 text-sm font-black ${zone.color} ${zone.bg} border`}>{tension} lbs</span>
              </div>
              <input type="range" min={20} max={32} step={1} value={tension}
                onChange={e => setTension(Number(e.target.value))}
                className="w-full h-2.5 appearance-none rounded-full bg-black/10 accent-primary cursor-pointer" />
              <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-wider text-secondary/40">
                <span className={tension <= 21 ? "text-sky-500" : ""}>20 lbs</span>
                <span className={tension > 21 && tension <= 25 ? "text-emerald-600" : ""}>Medium</span>
                <span className={tension > 25 && tension <= 28 ? "text-amber-600" : ""}>High</span>
                <span className={tension > 28 ? "text-red-600" : ""}>32 lbs</span>
              </div>

              {/* Alert */}
              <div className={`mt-3 flex items-start gap-2 rounded-xl border p-3 ${zone.bg}`}>
                {tension > 28 ? <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-500" /> : <Info size={16} className={`shrink-0 mt-0.5 ${zone.color}`} />}
                <div>
                  <span className={`text-xs font-black uppercase tracking-wider ${zone.color}`}>{zone.label}</span>
                  <p className="text-xs text-secondary/60 mt-0.5">{zone.desc}</p>
                  {tension > 28 && (
                    <p className="text-xs font-bold text-red-600 mt-1">⚠️ High tension above 28 lbs increases risk of frame damage. Please confirm your racket supports this tension.</p>
                  )}
                </div>
              </div>
            </div>

            {/* String Pattern */}
            <div>
              <label className="mb-3 block text-sm font-bold text-secondary">Stringing Pattern</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "2_knots" as const, label: "2 Knots", desc: "Standard, faster", icon: "🔗" },
                  { id: "4_knots" as const, label: "4 Knots", desc: "Better tension hold", icon: "🔗🔗" },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setStringPattern(opt.id)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition ${stringPattern === opt.id ? "border-primary bg-primary/5 shadow-sm" : "border-black/5 hover:border-black/10"}`}>
                    <span className="text-lg">{opt.icon}</span>
                    <span className="text-sm font-bold text-secondary">{opt.label}</span>
                    <span className="text-[11px] text-secondary/50">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex items-center gap-1 rounded-2xl border border-black/10 px-5 py-3 text-sm font-semibold text-secondary hover:bg-gray-50">
                <ChevronLeft size={16} /> Back
              </button>
              <button onClick={() => setStep(3)}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90">
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══ STEP 3: Service & Summary ═══ */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
            <div className="text-center mb-2">
              <h2 className="font-heading text-2xl font-bold text-secondary">📋 Confirm & Book</h2>
              <p className="text-sm text-secondary/60 mt-1">Choose your service tier and review the order</p>
            </div>

            {/* Service Type */}
            <div>
              <label className="mb-3 block text-sm font-bold text-secondary">Service Package</label>
              <div className="grid grid-cols-2 gap-3">
                {SERVICE_TYPES.map(st => (
                  <button key={st.id} onClick={() => setServiceType(st.id)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-5 transition ${serviceType === st.id ? "border-primary bg-primary/5 shadow-sm" : "border-black/5 hover:border-black/10"}`}>
                    <span className="text-3xl">{st.icon}</span>
                    <span className="text-sm font-bold text-secondary">{st.label}</span>
                    <span className="text-xs text-secondary/50">{st.time}</span>
                    <span className={`text-sm font-bold ${st.price > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {st.price > 0 ? `+ ${formatVND(st.price)}` : "Free"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-secondary">Your Name *</label>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                  placeholder="Nguyen Van A"
                  className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-secondary">Phone *</label>
                <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="090 xxx xxxx"
                  className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>

            {/* ── Order Summary Widget ── */}
            <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-white p-6 shadow-sm">
              <h3 className="font-heading text-lg font-bold text-secondary mb-4 flex items-center gap-2">
                <ShoppingCart size={18} className="text-primary" /> Order Summary
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-secondary/60">Racket</span><span className="font-semibold text-secondary">{racketModel || "—"}</span></div>
                <div className="flex justify-between"><span className="text-secondary/60">String</span><span className="font-semibold text-secondary">{stringObj.name}</span></div>
                <div className="flex justify-between"><span className="text-secondary/60">Tension</span><span className={`font-bold ${zone.color}`}>{tension} lbs ({zone.label})</span></div>
                <div className="flex justify-between"><span className="text-secondary/60">Pattern</span><span className="font-semibold text-secondary">{stringPattern === "2_knots" ? "2 Knots" : "4 Knots"}</span></div>
                <div className="flex justify-between"><span className="text-secondary/60">Difficulty</span><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${difficulty.color}`}>{difficulty.label}</span></div>
                <div className="flex justify-between"><span className="text-secondary/60">Service</span><span className="font-semibold text-secondary">{serviceObj.label}</span></div>
                <hr className="border-black/5" />
                <div className="flex justify-between"><span className="text-secondary/60">String</span><span className="font-semibold">{formatVND(stringObj.price)}</span></div>
                {serviceObj.price > 0 && (
                  <div className="flex justify-between"><span className="text-secondary/60">Express surcharge</span><span className="font-semibold text-amber-600">+{formatVND(serviceObj.price)}</span></div>
                )}
                <hr className="border-black/5" />
                <div className="flex justify-between text-lg">
                  <span className="font-bold text-secondary">Total</span>
                  <span className="font-black text-primary">{formatVND(totalFee)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex items-center gap-1 rounded-2xl border border-black/10 px-5 py-3 text-sm font-semibold text-secondary hover:bg-gray-50">
                <ChevronLeft size={16} /> Back
              </button>
              <button disabled={!canSubmit || isSubmitting} onClick={handleSubmit}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:translate-y-0">
                {isSubmitting ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Zap size={16} />}
                {isSubmitting ? "Booking..." : "Confirm & Book Service"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
