import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, CheckCircle2, Clock, AlertTriangle, Printer, Plus, X, ChevronDown, User } from "lucide-react";

type Task = {
  _id: string; customerName: string; customerPhone?: string; racketModel: string;
  stringType: string; stringPattern: string; tension: number; difficulty: string;
  isUrgent: boolean; status: string; fee: number; commission: number;
  startedAt?: string; completedAt?: string; assignedAt?: string;
  stringer?: { _id: string; name: string; level: number }; pickupTime?: string;
  createdAt: string; assignmentScore?: number;
};

type Stringer = { _id: string; name: string; level: number; skills: string[] };

type Props = {
  tasks: Task[];
  stringers: Stringer[];
  onCreateTask: (data: any) => Promise<void>;
  onStart: (id: string) => Promise<void>;
  onAssign: (taskId: string, stringerId: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  onAutoAssign: () => Promise<void>;
  tick: number;
};

const DIFF_COLORS: Record<string, string> = {
  easy: "bg-green-100 text-green-700", medium: "bg-yellow-100 text-yellow-700", hard: "bg-red-100 text-red-700",
};
const DIFF_LABEL: Record<string, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
const PATTERN_LABEL: Record<string, string> = { "2_knots": "2 Knots", "4_knots": "4 Knots", "pro_pattern": "Pro Pattern" };

const defaultForm = {
  customerName: "", customerPhone: "", racketModel: "", stringType: "",
  stringPattern: "2_knots", tension: 24, isUrgent: false, fee: 50000, pickupTime: "leave_at_shop",
};

export default function StringingBoardTab({ tasks, stringers, onCreateTask, onStart, onAssign, onComplete, onAutoAssign, tick }: Props) {
  const [showNewTask, setShowNewTask] = useState(false);
  const [form, setForm] = useState<any>(defaultForm);

  const pending = useMemo(() => tasks.filter(t => ["pending", "assigned"].includes(t.status)).sort((a, b) => (a.isUrgent === b.isUrgent ? 0 : a.isUrgent ? -1 : 1)), [tasks]);
  const inProgress = useMemo(() => tasks.filter(t => t.status === "in_progress"), [tasks]);
  const completed = useMemo(() => tasks.filter(t => t.status === "completed").sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()).slice(0, 20), [tasks]);

  const formatDuration = (start?: string) => {
    if (!start) return "00:00";
    const diff = Math.max(0, Date.now() - new Date(start).getTime());
    const m = Math.floor(diff / 60000); const s = Math.floor((diff % 60000) / 1000);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleCreate = async () => {
    if (!form.customerName || !form.racketModel || !form.stringType) return;
    await onCreateTask({ ...form, tension: Number(form.tension), fee: Number(form.fee) });
    setForm(defaultForm); setShowNewTask(false);
  };

  const handlePrint = (t: Task) => {
    const w = window.open("", "_blank");
    if (!w) return alert("Pop-up blocked");
    w.document.write(`<html><head><title>Slip - ${t._id.slice(-8)}</title><style>body{font-family:monospace;padding:20px;text-align:center}.slip{border:1px dashed #ccc;padding:20px;max-width:300px;margin:0 auto}.row{display:flex;justify-content:space-between;margin-bottom:5px}.divider{border-bottom:1px dashed #ccc;margin:10px 0}</style></head><body><div class="slip"><h2>BADMINTON HUB</h2><p>Stringing Service</p><div class="divider"></div><div class="row"><span>Customer:</span><span>${t.customerName}</span></div><div class="row"><span>Racket:</span><span>${t.racketModel}</span></div><div class="row"><span>String:</span><span>${t.stringType}</span></div><div class="row"><span>Tension:</span><span>${t.tension} lbs</span></div><div class="row"><span>Pattern:</span><span>${PATTERN_LABEL[t.stringPattern]}</span></div><div class="divider"></div><div class="row"><span>Fee:</span><span>${t.fee.toLocaleString()}₫</span></div><div class="row"><span>Pickup:</span><span>${t.pickupTime || "At shop"}</span></div><div class="divider"></div><p>Thank you!</p></div><script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  const renderCard = (t: Task, type: "pending" | "in_progress" | "completed") => (
    <div key={t._id} className={`group relative flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md ${t.isUrgent && type === "pending" ? "border-2 border-red-500" : "border border-black/5"} ${type === "completed" ? "opacity-80 hover:opacity-100" : ""}`}>
      {t.isUrgent && type === "pending" && (
        <div className="absolute -top-3 right-4 flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
          <AlertTriangle size={10} /> URGENT
        </div>
      )}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold text-secondary/50">#{t._id.slice(-8).toUpperCase()}</p>
          <p className="font-semibold text-secondary">{t.customerName}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${DIFF_COLORS[t.difficulty]}`}>{DIFF_LABEL[t.difficulty]}</span>
          {type === "in_progress" && (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              <Clock size={10} className="animate-pulse" /> {formatDuration(t.startedAt)}
            </span>
          )}
        </div>
      </div>
      <div className={`rounded-xl p-3 text-sm ${type === "in_progress" ? "bg-primary/5 border border-primary/10" : "bg-black/5"}`}>
        <p className="font-semibold text-secondary">{t.racketModel}</p>
        <p className="text-secondary/70 text-xs">{t.stringType} • {t.tension} lbs • {PATTERN_LABEL[t.stringPattern]}</p>
      </div>
      {t.stringer && (
        <div className="flex items-center gap-2 text-xs text-secondary/70">
          <User size={12} />
          <span className="font-semibold">{t.stringer.name}</span>
          <span className="text-secondary/40">Lv.{t.stringer.level}</span>
          {t.assignmentScore && <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">Score: {t.assignmentScore}</span>}
        </div>
      )}
      {type === "pending" && t.status === "assigned" && (
        <button onClick={() => onStart(t._id)} className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-2 text-sm font-semibold text-white transition hover:bg-secondary/90">
          <Play size={14} /> Start Stringing
        </button>
      )}
      {type === "pending" && t.status === "pending" && (
        <div className="mt-1 flex flex-col gap-2 rounded-xl bg-yellow-50 border border-yellow-200 p-2">
          <p className="text-center text-xs font-semibold text-yellow-700 mb-1">⏳ Awaiting Assignment</p>
          <select
            className="w-full rounded-lg border border-yellow-300 bg-white px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
            onChange={(e) => {
              if (e.target.value) onAssign(t._id, e.target.value);
            }}
            defaultValue=""
          >
            <option value="" disabled>Assign stringer...</option>
            {stringers.map(s => (
              <option key={s._id} value={s._id}>{s.name} (Lv.{s.level})</option>
            ))}
          </select>
        </div>
      )}
      {type === "in_progress" && (
        <button onClick={() => onComplete(t._id)} className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2 text-sm font-semibold text-white transition hover:bg-primary/90">
          <CheckCircle2 size={14} /> Complete
        </button>
      )}
      {type === "completed" && (
        <button onClick={() => handlePrint(t)} className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-white py-2 text-sm font-semibold text-secondary transition hover:bg-black/5">
          <Printer size={14} /> Print Slip
        </button>
      )}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowNewTask(true)} className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-secondary/90">
            <Plus size={16} /> New Task
          </button>
          <button onClick={onAutoAssign} className="flex items-center gap-2 rounded-2xl bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20">
            ⚡ Auto-Assign Pending
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Queue */}
        <div className="flex flex-col gap-4 rounded-3xl bg-black/5 p-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="flex items-center gap-2 font-heading font-semibold text-secondary">
              📋 Queue <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10 text-xs">{pending.length}</span>
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {pending.map(t => renderCard(t, "pending"))}
            {pending.length === 0 && <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/20 py-10 text-center text-sm font-medium text-secondary/50">No pending tasks</div>}
          </div>
        </div>

        {/* In Progress */}
        <div className="flex flex-col gap-4 rounded-3xl bg-black/5 p-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="flex items-center gap-2 font-heading font-semibold text-secondary">
              ⚙️ In Progress <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-xs text-primary font-bold">{inProgress.length}</span>
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {inProgress.map(t => renderCard(t, "in_progress"))}
            {inProgress.length === 0 && <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/20 py-10 text-center text-sm font-medium text-secondary/50">No active jobs</div>}
          </div>
        </div>

        {/* Done */}
        <div className="flex flex-col gap-4 rounded-3xl bg-black/5 p-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="flex items-center gap-2 font-heading font-semibold text-secondary">
              ✅ Completed <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20 text-xs text-green-700 font-bold">{completed.length}</span>
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {completed.map(t => renderCard(t, "completed"))}
            {completed.length === 0 && <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/20 py-10 text-center text-sm font-medium text-secondary/50">No completed tasks</div>}
          </div>
        </div>
      </div>

      {/* New Task Modal */}
      <AnimatePresence>
        {showNewTask && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-heading text-lg font-bold text-secondary">New Stringing Task</h3>
                <button onClick={() => setShowNewTask(false)} className="rounded-full p-1 hover:bg-black/5"><X size={18} /></button>
              </div>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-secondary">Customer Name *</label>
                    <input value={form.customerName} onChange={e => setForm((p: any) => ({ ...p, customerName: e.target.value }))} className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-secondary">Phone</label>
                    <input value={form.customerPhone} onChange={e => setForm((p: any) => ({ ...p, customerPhone: e.target.value }))} className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-secondary">Racket Model *</label>
                  <input value={form.racketModel} onChange={e => setForm((p: any) => ({ ...p, racketModel: e.target.value }))} placeholder="e.g. Yonex Astrox 99 Pro" className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-secondary">String Type *</label>
                  <input value={form.stringType} onChange={e => setForm((p: any) => ({ ...p, stringType: e.target.value }))} placeholder="e.g. BG80 Power" className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-secondary">Stringing Pattern</label>
                    <select value={form.stringPattern} onChange={e => setForm((p: any) => ({ ...p, stringPattern: e.target.value }))} className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                      <option value="2_knots">2 Knots</option>
                      <option value="4_knots">4 Knots</option>
                      <option value="pro_pattern">Pro Pattern</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-secondary">Tension (lbs)</label>
                    <input type="number" min={18} max={35} value={form.tension} onChange={e => setForm((p: any) => ({ ...p, tension: e.target.value }))} className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-secondary">Fee (₫)</label>
                    <input type="number" value={form.fee} onChange={e => setForm((p: any) => ({ ...p, fee: e.target.value }))} className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-secondary">Pickup</label>
                    <select value={form.pickupTime} onChange={e => setForm((p: any) => ({ ...p, pickupTime: e.target.value }))} className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                      <option value="immediate">Immediate</option>
                      <option value="leave_at_shop">Leave at Shop</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isUrgent} onChange={e => setForm((p: any) => ({ ...p, isUrgent: e.target.checked }))} className="rounded" />
                  <span className="text-sm font-semibold text-red-600">⚡ Urgent (Express 1-2 hours)</span>
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowNewTask(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-secondary hover:bg-black/5">Cancel</button>
                <button onClick={handleCreate} className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90">Create & Auto-Assign</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
