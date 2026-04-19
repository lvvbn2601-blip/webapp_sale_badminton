import { Truck, RotateCcw, Shield, HeadphonesIcon } from "lucide-react";

const POLICIES = [
  { icon: Truck, title: "Free Shipping", desc: "On orders over $100", color: "text-emerald-500", bg: "bg-emerald-50" },
  { icon: RotateCcw, title: "7-Day Return", desc: "Easy returns & exchanges", color: "text-blue-500", bg: "bg-blue-50" },
  { icon: Shield, title: "100% Authentic", desc: "Verified genuine products", color: "text-amber-500", bg: "bg-amber-50" },
  { icon: HeadphonesIcon, title: "24/7 Support", desc: "Chat or call anytime", color: "text-purple-500", bg: "bg-purple-50" },
];

export default function PurchasePolicy() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {POLICIES.map(p => (
        <div key={p.title} className={`flex flex-col items-center gap-2 rounded-2xl ${p.bg} p-4 text-center`}>
          <div className={`grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm ${p.color}`}>
            <p.icon size={20} />
          </div>
          <span className="text-xs font-bold text-secondary">{p.title}</span>
          <span className="text-[10px] text-secondary/50">{p.desc}</span>
        </div>
      ))}
    </div>
  );
}
