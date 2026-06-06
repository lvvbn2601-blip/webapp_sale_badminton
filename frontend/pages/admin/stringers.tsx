import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { AdminShell } from "../../components/admin/AdminShell";
import { Clock, Package, Users, BarChart3, Plus, Minus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  fetchStringers,
  createStringer,
  updateStringerApi,
  deleteStringerApi,
  fetchStringingTasks,
  createStringingTask,
  startStringingTask,
  assignStringingTask,
  completeStringingTask,
  autoAssignTasks,
  approveLevelUp,
  fetchStringSpools,
  createStringSpool,
  updateStringSpoolMeters,
} from "../../lib/api";
import StringingBoardTab from "../../components/admin/stringers/StringingBoardTab";
import StringerManagementTab from "../../components/admin/stringers/StringerManagementTab";
import PerformanceTab from "../../components/admin/stringers/PerformanceTab";

// ── Inventory types (existing feature, preserved) ──
type StringSpool = {
  _id: string; name: string; color: string; brand: string;
  currentMeters: number; totalMeters: number; alertThreshold: number;
  addedBy?: { name: string; email?: string };
};

type TabKey = "board" | "team" | "performance" | "inventory";

export default function AdminStringersPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("board");

  // Data states
  const [stringers, setStringers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [tick, setTick] = useState(0);

  // String inventory
  const [inventory, setInventory] = useState<StringSpool[]>([]);
  const [showAddSpool, setShowAddSpool] = useState(false);
  const [newSpool, setNewSpool] = useState({ name: "", brand: "Yonex", color: "White", totalMeters: 200, price: 150000 });

  // Auth & initial data load
  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    setToken(t);
    if (!t) { setAuthChecked(true); router.replace("/login?next=/admin"); return; }
    setAuthChecked(true);
    loadData(t);
  }, []);

  // Timer for in-progress tasks
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async (t: string) => {
    try {
      const [s, tk, spools] = await Promise.all([fetchStringers(t), fetchStringingTasks(t), fetchStringSpools()]);
      setStringers(Array.isArray(s) ? s : []);
      setTasks(Array.isArray(tk) ? tk : []);
      setInventory(Array.isArray(spools) ? spools : []);
    } catch (e) { console.warn("Failed to load stringer data", e); }
  };

  // ── Stringer handlers ──
  const handleAddStringer = useCallback(async (data: any) => {
    if (!token) return;
    const s = await createStringer(data, token);
    setStringers(prev => [...prev, s]);
  }, [token]);

  const handleUpdateStringer = useCallback(async (id: string, data: any) => {
    if (!token) return;
    const s = await updateStringerApi(id, data, token);
    setStringers(prev => prev.map(x => x._id === id ? s : x));
  }, [token]);

  const handleDeleteStringer = useCallback(async (id: string) => {
    if (!token) return;
    await deleteStringerApi(id, token);
    setStringers(prev => prev.filter(x => x._id !== id));
  }, [token]);

  const handleLevelUp = useCallback(async (id: string) => {
    if (!token) return;
    const s = await approveLevelUp(id, token);
    setStringers(prev => prev.map(x => x._id === id ? s : x));
  }, [token]);

  // ── Task handlers ──
  const handleCreateTask = useCallback(async (data: any) => {
    if (!token) return;
    const t = await createStringingTask(data, token);
    setTasks(prev => [t, ...prev]);
    // Refresh stringers to update currentLoad
    const s = await fetchStringers(token);
    setStringers(Array.isArray(s) ? s : []);
  }, [token]);

  const handleStartTask = useCallback(async (id: string) => {
    if (!token) return;
    const t = await startStringingTask(id, token);
    setTasks(prev => prev.map(x => x._id === id ? t : x));
  }, [token]);

  const handleAssignTask = useCallback(async (taskId: string, stringerId: string) => {
    if (!token) return;
    const t = await assignStringingTask(taskId, stringerId, token);
    setTasks(prev => prev.map(x => x._id === taskId ? t : x));
    const s = await fetchStringers(token);
    setStringers(Array.isArray(s) ? s : []);
  }, [token]);

  const handleCompleteTask = useCallback(async (id: string) => {
    if (!token) return;
    const t = await completeStringingTask(id, token);
    setTasks(prev => prev.map(x => x._id === id ? t : x));
    const s = await fetchStringers(token);
    setStringers(Array.isArray(s) ? s : []);
  }, [token]);

  const handleAutoAssign = useCallback(async () => {
    if (!token) return;
    await autoAssignTasks(token);
    await loadData(token);
  }, [token]);

  // ── Inventory helpers ──
  const getProgressColor = (current: number, total: number, threshold: number) => {
    const pct = (current / total) * 100;
    if (current <= threshold && current > 0) return "bg-yellow-500";
    if (current === 0 || pct < 10) return "bg-red-500";
    return "bg-green-500";
  };

  const updateInventoryMeters = async (id: string, amount: number) => {
    if (!token) return;
    try {
      const sp = await updateStringSpoolMeters(id, amount, token);
      setInventory(prev => prev.map(spool => spool._id === id ? { ...spool, currentMeters: sp.currentMeters } : spool));
    } catch (e) { console.warn(e); }
  };

  const handleAddSpoolSubmit = async () => {
    if (!token || !newSpool.name) return;
    try {
      const spool = await createStringSpool(newSpool, token);
      setInventory(prev => [spool, ...prev]);
      setShowAddSpool(false);
      setNewSpool({ name: "", brand: "Yonex", color: "White", totalMeters: 200, price: 150000 });
    } catch (e) { console.warn(e); }
  };

  if (!authChecked) return null;

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: "board", label: "Stringing Board", icon: <Clock size={16} /> },
    { key: "team", label: "Stringer Team", icon: <Users size={16} /> },
    { key: "performance", label: "Performance", icon: <BarChart3 size={16} /> },
    { key: "inventory", label: "String Inventory", icon: <Package size={16} /> },
  ];

  return (
    <AdminShell title="Stringers" section="stringers" onSectionChange={() => {}} onLogout={() => {}}>
      <Head><title>Stringers | Admin</title></Head>

      {/* Tab Navigation */}
      <div className="mb-6 flex gap-3 border-b border-black/5 pb-4 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-primary text-white shadow-sm"
                : "bg-white text-secondary hover:bg-black/5 shadow-sm"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === "board" && (
          <StringingBoardTab
            key="board"
            tasks={tasks}
            stringers={stringers}
            onCreateTask={handleCreateTask}
            onStart={handleStartTask}
            onAssign={handleAssignTask}
            onComplete={handleCompleteTask}
            onAutoAssign={handleAutoAssign}
            tick={tick}
          />
        )}

        {activeTab === "team" && (
          <StringerManagementTab
            key="team"
            stringers={stringers}
            onAdd={handleAddStringer}
            onUpdate={handleUpdateStringer}
            onDelete={handleDeleteStringer}
            onLevelUp={handleLevelUp}
          />
        )}

        {activeTab === "performance" && token && (
          <PerformanceTab key="performance" token={token} />
        )}

        {activeTab === "inventory" && (
          <motion.div
            key="inventory"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl font-semibold text-secondary">String Inventory</h2>
              <button onClick={() => setShowAddSpool(true)} className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-secondary/90">
                <Plus size={16} /> Add New Spool
              </button>
            </div>

            {/* Add Spool Modal */}
            <AnimatePresence>
              {showAddSpool && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="bg-white border border-black/5 p-6 rounded-3xl shadow-sm mb-2 grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-xs font-bold text-secondary mb-1 block">Name</label>
                      <input value={newSpool.name} onChange={e => setNewSpool(s => ({ ...s, name: e.target.value }))} className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary" placeholder="e.g. BG66 Ultimax" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-secondary mb-1 block">Brand</label>
                      <input value={newSpool.brand} onChange={e => setNewSpool(s => ({ ...s, brand: e.target.value }))} className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-secondary mb-1 block">Color</label>
                      <input value={newSpool.color} onChange={e => setNewSpool(s => ({ ...s, color: e.target.value }))} className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-secondary mb-1 block">Length (m)</label>
                      <input type="number" value={newSpool.totalMeters} onChange={e => setNewSpool(s => ({ ...s, totalMeters: Number(e.target.value) }))} className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-secondary mb-1 block">Price (VND)</label>
                      <input type="number" value={newSpool.price} onChange={e => setNewSpool(s => ({ ...s, price: Number(e.target.value) }))} className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary" />
                    </div>
                    <div className="col-span-2 md:col-span-1 flex gap-2">
                      <button onClick={() => setShowAddSpool(false)} className="flex-1 rounded-xl bg-black/5 py-2 text-sm font-semibold text-secondary transition hover:bg-black/10">Cancel</button>
                      <button onClick={handleAddSpoolSubmit} disabled={!newSpool.name} className="flex-1 rounded-xl bg-primary py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50">Save</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {inventory.map(spool => {
                const isLow = spool.currentMeters <= spool.alertThreshold;
                const isOut = spool.currentMeters === 0;
                const progressColor = getProgressColor(spool.currentMeters, spool.totalMeters, spool.alertThreshold);
                const percent = (spool.currentMeters / spool.totalMeters) * 100;

                return (
                  <div key={spool._id} className={`flex flex-col gap-4 rounded-3xl border p-5 shadow-sm transition hover:shadow-card bg-white ${isOut ? "border-red-200 bg-red-50/10" : isLow ? "border-yellow-200" : "border-black/5"}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm ${isOut ? "border-red-200 bg-red-50 text-red-500" : isLow ? "border-yellow-200 bg-yellow-50 text-yellow-600" : "border-black/5 bg-black/5"}`}>
                          <Package size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-secondary text-lg">{spool.name}</p>
                          <p className="text-sm text-secondary/60">{spool.brand} • {spool.color}</p>
                          {spool.addedBy && <p className="text-[10px] text-primary/70 mt-1 font-semibold uppercase tracking-wider">Added by: {spool.addedBy.name}</p>}
                        </div>
                      </div>
                      {isOut ? (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold text-red-600 uppercase tracking-wider">Out of Stock</span>
                      ) : isLow ? (
                        <span className="rounded-full bg-yellow-100 px-2 py-1 text-[10px] font-bold text-yellow-700 uppercase tracking-wider">Low Stock</span>
                      ) : null}
                    </div>

                    <div className="mt-2 flex flex-col gap-2">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-secondary/70">Remaining</span>
                        <span className={`font-bold ${isOut ? "text-red-600" : isLow ? "text-yellow-600" : "text-green-600"}`}>
                          {spool.currentMeters}m <span className="text-secondary/40 font-normal">/ {spool.totalMeters}m</span>
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-black/5">
                        <div className={`h-full transition-all duration-500 rounded-full ${progressColor}`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-black/5 pt-4">
                      <p className="text-xs text-secondary/50 font-medium">Quick Adjust (10m)</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateInventoryMeters(spool._id, -10)} disabled={spool.currentMeters === 0} className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/5 text-secondary transition hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:hover:bg-black/5 disabled:hover:text-secondary">
                          <Minus size={14} />
                        </button>
                        <button onClick={() => updateInventoryMeters(spool._id, 10)} disabled={spool.currentMeters >= spool.totalMeters} className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/5 text-secondary transition hover:bg-green-500 hover:text-white disabled:opacity-50 disabled:hover:bg-black/5 disabled:hover:text-secondary">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminShell>
  );
}
