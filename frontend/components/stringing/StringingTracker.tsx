import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, User, Star, CheckCircle2, Package, Zap, ChevronDown, ChevronUp, Check } from "lucide-react";
import { rateStringingTask } from "../../lib/api";

type Task = {
  _id: string; customerName: string; racketModel: string; stringType: string;
  stringPattern: string; tension: number; difficulty: string;
  isUrgent: boolean; status: string; fee: number;
  stringer?: { _id: string; name: string; level: number; rating: number };
  startedAt?: string; completedAt?: string; assignedAt?: string;
  createdAt: string; customerRating?: number; serviceType?: string;
};

type Props = {
  tasks: Task[];
  token: string;
  onRefresh: () => void;
};

const STATUS_STEPS = [
  { key: "pending", label: "Waiting for Acceptance", icon: "⏳", desc: "Your booking is in queue" },
  { key: "assigned", label: "Stringer Assigned", icon: "👤", desc: "A professional stringer has been assigned" },
  { key: "in_progress", label: "Stringing in Progress", icon: "⚙️", desc: "Your racket is being strung now" },
  { key: "completed", label: "Ready for Pickup", icon: "✅", desc: "Your racket is ready!" },
];

const PATTERN_LABEL: Record<string, string> = { "2_knots": "2 Knots", "4_knots": "4 Knots", "pro_pattern": "Pro" };
const DIFF_COLORS: Record<string, string> = { easy: "bg-green-100 text-green-700", medium: "bg-yellow-100 text-yellow-700", hard: "bg-red-100 text-red-700" };

const formatVND = (n: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

function getStatusIndex(status: string) {
  const idx = STATUS_STEPS.findIndex(s => s.key === status);
  return idx >= 0 ? idx : 0;
}

function timeSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function StringingTracker({ tasks, token, onRefresh }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(tasks.length > 0 ? tasks[0]._id : null);
  const [ratingTaskId, setRatingTaskId] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingNote, setRatingNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRate = async () => {
    if (!ratingTaskId || !token) return;
    setSubmitting(true);
    try {
      await rateStringingTask(ratingTaskId, ratingValue, ratingNote, token);
      setRatingTaskId(null);
      setRatingNote("");
      onRefresh();
    } catch (e) { console.error(e); }
    setSubmitting(false);
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-black/15 py-16 text-center">
        <Package size={40} className="text-secondary/15 mb-3" />
        <h3 className="font-heading text-lg font-semibold text-secondary/60">No Stringing Orders Yet</h3>
        <p className="text-sm text-secondary/40 mt-1">Book your first stringing service above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map(task => {
        const statusIdx = getStatusIndex(task.status);
        const isExpanded = expandedId === task._id;
        const isCompleted = task.status === "completed";
        const canRate = isCompleted && !task.customerRating;

        return (
          <div key={task._id} className={`rounded-3xl border bg-white shadow-sm transition hover:shadow-md ${task.isUrgent ? "border-red-200" : "border-black/5"}`}>
            {/* Header */}
            <button onClick={() => setExpandedId(isExpanded ? null : task._id)}
              className="flex w-full items-center justify-between px-5 py-4 text-left">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl text-lg ${isCompleted ? "bg-emerald-100" : "bg-primary/10"}`}>
                  {STATUS_STEPS[statusIdx]?.icon || "📋"}
                </div>
                <div>
                  <p className="font-semibold text-secondary text-sm">{task.racketModel}</p>
                  <p className="text-xs text-secondary/50">{task.stringType} • {task.tension} lbs • {PATTERN_LABEL[task.stringPattern]}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {task.isUrgent && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">EXPRESS</span>}
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${DIFF_COLORS[task.difficulty]}`}>{task.difficulty}</span>
                <span className="text-xs text-secondary/40">{timeSince(task.createdAt)}</span>
                {isExpanded ? <ChevronUp size={16} className="text-secondary/30" /> : <ChevronDown size={16} className="text-secondary/30" />}
              </div>
            </button>

            {/* Expanded Detail */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="border-t border-black/5 px-5 pb-5 pt-4 space-y-5">
                    {/* Status Timeline */}
                    <div className="flex items-start gap-0">
                      {STATUS_STEPS.map((s, i) => {
                        const isActive = i <= statusIdx;
                        const isCurrent = i === statusIdx;
                        return (
                          <div key={s.key} className="flex-1 flex flex-col items-center relative">
                            {/* Connector line */}
                            {i > 0 && (
                              <div className={`absolute top-4 right-1/2 w-full h-0.5 -z-10 ${i <= statusIdx ? "bg-primary" : "bg-black/10"}`} />
                            )}
                            {/* Node */}
                            <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm transition ${isCurrent ? "border-primary bg-primary text-white shadow-md shadow-primary/30 scale-110" : isActive ? "border-primary bg-primary/10 text-primary" : "border-black/10 bg-white text-secondary/30"}`}>
                              {isActive ? (isCurrent ? <span className="text-xs">{s.icon}</span> : <Check size={12} />) : <span className="text-xs">{i + 1}</span>}
                            </div>
                            <p className={`mt-2 text-center text-[10px] font-bold leading-tight ${isCurrent ? "text-primary" : isActive ? "text-secondary/70" : "text-secondary/30"}`}>
                              {s.label}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Current status description */}
                    <div className={`rounded-2xl p-4 text-center ${isCompleted ? "bg-emerald-50 border border-emerald-200" : "bg-primary/5 border border-primary/10"}`}>
                      <p className={`text-sm font-bold ${isCompleted ? "text-emerald-700" : "text-primary"}`}>{STATUS_STEPS[statusIdx]?.desc}</p>
                    </div>

                    {/* Assigned Stringer Info */}
                    {task.stringer && (
                      <div className="flex items-center gap-4 rounded-2xl border border-black/5 bg-gray-50/50 p-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary font-bold text-lg">
                          {task.stringer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-secondary">{task.stringer.name}</p>
                          <p className="text-xs text-secondary/50">Professional Stringer • Level {task.stringer.level}</p>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Star size={14} className="text-amber-500 fill-amber-500" />
                          <span className="font-bold text-secondary">{task.stringer.rating?.toFixed(1) || "New"}</span>
                        </div>
                      </div>
                    )}

                    {/* Order Details */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-black/5 p-3">
                        <p className="text-[10px] font-bold text-secondary/40 uppercase">Fee</p>
                        <p className="font-bold text-secondary">{formatVND(task.fee)}</p>
                      </div>
                      <div className="rounded-xl bg-black/5 p-3">
                        <p className="text-[10px] font-bold text-secondary/40 uppercase">Booked</p>
                        <p className="font-bold text-secondary">{new Date(task.createdAt).toLocaleDateString("vi-VN")}</p>
                      </div>
                    </div>

                    {/* Rating */}
                    {task.customerRating && (
                      <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
                        <span className="text-sm font-bold text-amber-700">Your rating:</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} size={14} className={s <= task.customerRating! ? "text-amber-500 fill-amber-500" : "text-gray-200"} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rate Button */}
                    {canRate && ratingTaskId !== task._id && (
                      <button onClick={() => { setRatingTaskId(task._id); setRatingValue(5); setRatingNote(""); }}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-amber-300 bg-amber-50 py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-100">
                        <Star size={16} /> Rate Your Experience
                      </button>
                    )}

                    {/* Rating Form */}
                    {ratingTaskId === task._id && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 space-y-4">
                        <p className="text-sm font-bold text-secondary">How was the stringing service?</p>
                        <div className="flex justify-center gap-2">
                          {[1, 2, 3, 4, 5].map(s => (
                            <button key={s} onClick={() => setRatingValue(s)}>
                              <Star size={32} className={s <= ratingValue ? "text-amber-500 fill-amber-500" : "text-gray-200"} />
                            </button>
                          ))}
                        </div>
                        <textarea value={ratingNote} onChange={e => setRatingNote(e.target.value)}
                          placeholder="Any feedback? (optional)"
                          rows={2}
                          className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none" />
                        <div className="flex gap-2">
                          <button onClick={() => setRatingTaskId(null)} className="flex-1 rounded-xl border border-black/10 py-2 text-sm font-semibold text-secondary hover:bg-white">Cancel</button>
                          <button onClick={handleRate} disabled={submitting}
                            className="flex-1 rounded-xl bg-amber-500 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50">
                            {submitting ? "Submitting..." : "Submit Rating"}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
