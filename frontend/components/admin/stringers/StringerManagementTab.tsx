import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Star, Edit2, Trash2, User, Zap, X } from "lucide-react";

type Stringer = {
  _id: string; name: string; phone?: string; level: number;
  skills: string[]; currentLoad: number; maxLoad: number;
  rating: number; totalTasksCompleted: number; avgCompletionTime: number;
  isActive: boolean; commissionRate: number; levelUpSuggested: boolean;
};

type Props = {
  stringers: Stringer[];
  onAdd: (data: any) => Promise<void>;
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onLevelUp: (id: string) => Promise<void>;
};

const SKILLS = [
  { value: "2_knots", label: "2 Knots" },
  { value: "4_knots", label: "4 Knots" },
  { value: "pro_pattern", label: "Pro Pattern" },
];

const LEVEL_LABELS: Record<number, string> = {
  1: "Beginner", 2: "Intermediate", 3: "Skilled", 4: "Expert", 5: "Master"
};
const LEVEL_COLORS: Record<number, string> = {
  1: "bg-gray-100 text-gray-700", 2: "bg-blue-100 text-blue-700",
  3: "bg-green-100 text-green-700", 4: "bg-purple-100 text-purple-700",
  5: "bg-amber-100 text-amber-700",
};

const defaultForm = { name: "", phone: "", level: 1, skills: ["2_knots"], maxLoad: 3, commissionRate: 10 };

export default function StringerManagementTab({ stringers, onAdd, onUpdate, onDelete, onLevelUp }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const openAdd = () => { setForm(defaultForm); setEditId(null); setShowModal(true); };
  const openEdit = (s: Stringer) => {
    setForm({ name: s.name, phone: s.phone || "", level: s.level, skills: [...s.skills], maxLoad: s.maxLoad, commissionRate: s.commissionRate });
    setEditId(s._id); setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    if (editId) await onUpdate(editId, form);
    else await onAdd(form);
    setShowModal(false);
  };

  const toggleSkill = (skill: string) => {
    setForm((prev: any) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s: string) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-xl font-semibold text-secondary">Stringer Team</h2>
          <p className="text-sm text-secondary/60 mt-1">{stringers.length} stringers registered</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-secondary/90">
          <Plus size={16} /> Add Stringer
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stringers.map(s => (
          <div key={s._id} className={`relative flex flex-col gap-4 rounded-3xl border p-5 shadow-sm bg-white transition hover:shadow-md ${!s.isActive ? "opacity-60" : ""} ${s.levelUpSuggested ? "border-amber-300 ring-2 ring-amber-100" : "border-black/5"}`}>
            {s.levelUpSuggested && (
              <div className="absolute -top-3 right-4 flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow">
                <Zap size={10} /> LEVEL UP READY
              </div>
            )}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary font-bold text-lg">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-secondary">{s.name}</p>
                  <p className="text-xs text-secondary/60">{s.phone || "No phone"}</p>
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${LEVEL_COLORS[s.level] || LEVEL_COLORS[1]}`}>
                Lv.{s.level} {LEVEL_LABELS[s.level]}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {s.skills.map(sk => (
                <span key={sk} className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  {SKILLS.find(x => x.value === sk)?.label || sk}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-2xl bg-black/5 p-3">
              <div className="text-center">
                <p className="text-lg font-bold text-secondary">{s.currentLoad}/{s.maxLoad}</p>
                <p className="text-[10px] text-secondary/50 font-medium">Load</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-secondary flex items-center justify-center gap-1">
                  <Star size={12} className="text-amber-500 fill-amber-500" />{s.rating > 0 ? s.rating.toFixed(1) : "—"}
                </p>
                <p className="text-[10px] text-secondary/50 font-medium">Rating</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-secondary">{s.totalTasksCompleted}</p>
                <p className="text-[10px] text-secondary/50 font-medium">Done</p>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-black/5 pt-3">
              <button onClick={() => openEdit(s)} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-black/5 py-2 text-xs font-semibold text-secondary transition hover:bg-black/10">
                <Edit2 size={12} /> Edit
              </button>
              {s.levelUpSuggested && (
                <button onClick={() => onLevelUp(s._id)} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2 text-xs font-semibold text-white transition hover:bg-amber-600">
                  <Zap size={12} /> Level Up
                </button>
              )}
              <button onClick={() => setDeleteConfirm(s._id)} className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {stringers.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/20 py-16 text-center">
            <User size={32} className="text-secondary/30 mb-2" />
            <p className="text-sm font-medium text-secondary/50">No stringers yet. Add your first stringer to get started.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-heading text-lg font-bold text-secondary">{editId ? "Edit" : "Add"} Stringer</h3>
                <button onClick={() => setShowModal(false)} className="rounded-full p-1 hover:bg-black/5"><X size={18} /></button>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-secondary">Name *</label>
                  <input value={form.name} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} className="w-full rounded-xl border border-black/10 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-secondary">Phone</label>
                  <input value={form.phone} onChange={e => setForm((p: any) => ({ ...p, phone: e.target.value }))} className="w-full rounded-xl border border-black/10 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-secondary">Level (1-5)</label>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(lv => (
                      <button key={lv} onClick={() => setForm((p: any) => ({ ...p, level: lv }))} className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${form.level === lv ? "bg-primary text-white" : "bg-black/5 text-secondary hover:bg-black/10"}`}>
                        {lv}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-secondary">Skills</label>
                  <div className="flex flex-wrap gap-2">
                    {SKILLS.map(sk => (
                      <button key={sk.value} onClick={() => toggleSkill(sk.value)} className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${form.skills.includes(sk.value) ? "bg-primary text-white" : "bg-black/5 text-secondary hover:bg-black/10"}`}>
                        {sk.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-secondary">Max Load</label>
                    <input type="number" min={1} max={10} value={form.maxLoad} onChange={e => setForm((p: any) => ({ ...p, maxLoad: Number(e.target.value) }))} className="w-full rounded-xl border border-black/10 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-secondary">Commission %</label>
                    <input type="number" min={0} max={100} value={form.commissionRate} onChange={e => setForm((p: any) => ({ ...p, commissionRate: Number(e.target.value) }))} className="w-full rounded-xl border border-black/10 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-secondary hover:bg-black/5">Cancel</button>
                <button onClick={handleSubmit} className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90">{editId ? "Save Changes" : "Add Stringer"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100"><Trash2 size={20} className="text-red-500" /></div>
              <h3 className="font-heading text-lg font-bold text-secondary">Delete Stringer?</h3>
              <p className="mt-1 text-sm text-secondary/60">This action cannot be undone.</p>
              <div className="mt-5 flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl bg-black/5 py-2.5 text-sm font-semibold text-secondary hover:bg-black/10">Cancel</button>
                <button onClick={async () => { await onDelete(deleteConfirm); setDeleteConfirm(null); }} className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
