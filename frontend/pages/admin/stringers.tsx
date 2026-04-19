import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import { AdminShell } from "../../components/admin/AdminShell";
import { Search, Clock, CheckCircle2, AlertTriangle, User, Play, Package, Plus, Minus, Printer, FileText, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchAdminOrders, updateStringingStatus } from "../../lib/api";

// Mock Data Types
type StringingOrder = {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  racketModel: string;
  stringType: string;
  tension: string;
  fee: number;
  isUrgent: boolean;
  status: "queue" | "in_progress" | "done";
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  deliveryTime?: string;
};

type StringSpool = {
  id: string;
  name: string;
  color: string;
  brand: string;
  currentMeters: number;
  totalMeters: number;
  alertThreshold: number;
};

export default function AdminStringersPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  
  // States
  const [activeTab, setActiveTab] = useState<"board" | "inventory">("board");
  const [editOrderModal, setEditOrderModal] = useState<StringingOrder | null>(null);
  const [editForm, setEditForm] = useState({ stringType: "", tension: "", fee: 0 });
  
  const [allAdminOrders, setAllAdminOrders] = useState<any[]>([]);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    setToken(t);
    if (!t) {
      setAuthChecked(true);
      router.replace("/login?next=/admin");
      return;
    }
    setAuthChecked(true);
    fetchAdminOrders(t).then(data => {
      setAllAdminOrders(Array.isArray(data) ? data : []);
    }).catch(e => {
      console.warn("Failed to fetch admin orders", e);
    });
  }, []);

  const orders: StringingOrder[] = useMemo(() => {
    return allAdminOrders
      .filter(o => o.needsStringing && ['confirmed', 'shipped', 'delivered', 'received'].includes(o.status))
      .map(o => {
        // Find the specific item requiring stringing
        const stringItem = o.items?.find((i: any) => i.needsStringing) || o.items?.[0] || {};
        
        return {
          id: o._id,
          orderId: `#${o._id.slice(-8).toUpperCase()}`,
          customerName: o.recipientName || o.user?.name || "Customer",
          customerPhone: o.recipientPhone || o.user?.phone || "No Phone",
          racketModel: stringItem?.product?.name || stringItem?.name || "Customer Racket",
          stringType: stringItem?.stringType || "Standard String",
          tension: stringItem?.stringTension ? `${stringItem.stringTension} lbs` : "26 lbs",
          fee: 15, // Backend might calculate stringing fee, but static 15 is fine for display
          isUrgent: false,
          status: o.stringingStatus === 'pending' ? 'queue' : (o.stringingStatus === 'completed' ? 'done' : o.stringingStatus) || "queue",
          createdAt: o.createdAt,
          // Delivery/Date info usually comes from order timeline
          startedAt: undefined,
          completedAt: undefined,
        };
    });
  }, [allAdminOrders]);

  const [inventory, setInventory] = useState<StringSpool[]>([
    { id: "sp_01", name: "BG80 Power", color: "White", brand: "Yonex", currentMeters: 40, totalMeters: 200, alertThreshold: 50 },
    { id: "sp_02", name: "BG66 Ultimax", color: "Yellow", brand: "Yonex", currentMeters: 180, totalMeters: 200, alertThreshold: 50 },
    { id: "sp_03", name: "Aerosonic", color: "White", brand: "Yonex", currentMeters: 15, totalMeters: 200, alertThreshold: 30 },
    { id: "sp_04", name: "No.1", color: "Black", brand: "Li-Ning", currentMeters: 120, totalMeters: 200, alertThreshold: 40 },
    { id: "sp_05", name: "Exbolt 63", color: "White", brand: "Yonex", currentMeters: 5, totalMeters: 200, alertThreshold: 50 }, // Critical
  ]);

  // Timer refresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const queueOrders = useMemo(() => {
    return orders.filter(o => o.status === "queue").sort((a, b) => {
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [orders]);

  const inProgressOrders = useMemo(() => orders.filter(o => o.status === "in_progress"), [orders]);
  const doneOrders = useMemo(() => orders.filter(o => o.status === "done").sort((a,b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()), [orders]);

  const handleStartStringing = (order: StringingOrder) => {
    setEditForm({ stringType: order.stringType, tension: order.tension, fee: order.fee });
    setEditOrderModal(order);
  };

  const handleConfirmStart = async () => {
    if (!editOrderModal) return;
    if (token) {
      try {
        await updateStringingStatus(editOrderModal.id, "in_progress", token);
      } catch (e) {
        console.error(e);
      }
    }
    setAllAdminOrders(prev => prev.map(o => o._id === editOrderModal.id ? { 
      ...o, 
      stringingStatus: "in_progress", 
    } : o));
    setEditOrderModal(null);
  };

  const handleCompleteStringing = async (id: string) => {
    if (token) {
      try {
        await updateStringingStatus(id, "completed", token);
      } catch (e) {
        console.error(e);
      }
    }
    setAllAdminOrders(prev => prev.map(o => o._id === id ? { ...o, stringingStatus: "completed" } : o));
  };

  const formatDuration = (startTime?: string) => {
    if (!startTime) return "00:00";
    const start = new Date(startTime).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - start);
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePrintSlip = (order: StringingOrder) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Pop-up blocked");
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Delivery Slip - ${order.orderId}</title>
          <style>
            body { font-family: monospace; padding: 20px; text-align: center; }
            .slip { border: 1px dashed #ccc; padding: 20px; max-width: 300px; margin: 0 auto; }
            h2 { margin: 0 0 10px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .divider { border-bottom: 1px dashed #ccc; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="slip">
            <h2>BADMINTON HUB</h2>
            <p>Stringing Service Delivery</p>
            <div class="divider"></div>
            <div class="row"><span>Order ID:</span> <span>${order.orderId}</span></div>
            <div class="row"><span>Customer:</span> <span>${order.customerName}</span></div>
            <div class="row"><span>Phone:</span> <span>${order.customerPhone}</span></div>
            <div class="divider"></div>
            <div class="row"><span>String:</span> <span>${order.stringType}</span></div>
            <div class="row"><span>Tension:</span> <span>${order.tension}</span></div>
            <div class="divider"></div>
            <div class="row"><span>Fee:</span> <span>$${order.fee}</span></div>
            <div class="row"><span>Delivery:</span> <span>${order.deliveryTime || 'Ready'}</span></div>
            <div class="divider"></div>
            <p>Thank you for choosing us!</p>
          </div>
          <script>
            window.onload = () => { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getProgressColor = (current: number, total: number, threshold: number) => {
    const percentage = (current / total) * 100;
    if (current <= threshold && current > 0) return "bg-yellow-500";
    if (current === 0 || percentage < 10) return "bg-red-500";
    return "bg-green-500";
  };

  const updateInventoryMeters = (id: string, amount: number) => {
    setInventory(prev => prev.map(spool => {
      if (spool.id === id) {
        return { ...spool, currentMeters: Math.max(0, Math.min(spool.totalMeters, spool.currentMeters + amount)) };
      }
      return spool;
    }));
  };

  if (!authChecked) return null;

  return (
    <AdminShell
      title="Stringers"
      section="stringers"
      onSectionChange={() => {}}
      onLogout={() => {}}
    >
      <Head>
        <title>Stringers | Admin</title>
      </Head>

      <div className="mb-6 flex gap-4 border-b border-black/5 pb-4">
        <button
          onClick={() => setActiveTab("board")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "board" ? "bg-primary text-white" : "bg-white text-secondary hover:bg-black/5 shadow-sm"
          }`}
        >
          <Clock size={16} />
          Stringing Board
        </button>
        <button
          onClick={() => setActiveTab("inventory")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "inventory" ? "bg-primary text-white" : "bg-white text-secondary hover:bg-black/5 shadow-sm"
          }`}
        >
          <Package size={16} />
          String Inventory
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "board" ? (
          <motion.div
            key="board"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 gap-6 lg:grid-cols-3"
          >
            {/* QUEUE */}
            <div className="flex flex-col gap-4 rounded-3xl bg-black/5 p-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="flex items-center gap-2 font-heading font-semibold text-secondary">
                  <span>📋</span> Queue
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10 text-xs">{queueOrders.length}</span>
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {queueOrders.map(order => (
                  <div key={order.id} className={`group relative flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md ${order.isUrgent ? 'border-2 border-red-500' : 'border border-black/5'}`}>
                    {order.isUrgent && (
                      <div className="absolute -top-3 right-4 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm flex items-center gap-1">
                        <AlertTriangle size={10} />
                        URGENT
                      </div>
                    )}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold text-secondary/60">{order.orderId}</p>
                        <p className="font-semibold text-secondary">{order.customerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">${order.fee}</p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-black/5 p-3 text-sm">
                      <p className="font-semibold text-secondary">{order.racketModel}</p>
                      <p className="text-secondary/70">{order.stringType} • {order.tension}</p>
                    </div>
                    <button
                      onClick={() => handleStartStringing(order)}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-2 text-sm font-semibold text-white transition hover:bg-secondary/90"
                    >
                      <Play size={14} /> Start Stringing
                    </button>
                  </div>
                ))}
                {queueOrders.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/20 py-10 text-center text-sm font-medium text-secondary/50">
                    No orders in queue
                  </div>
                )}
              </div>
            </div>

            {/* IN PROGRESS */}
            <div className="flex flex-col gap-4 rounded-3xl bg-black/5 p-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="flex items-center gap-2 font-heading font-semibold text-secondary">
                  <span>⚙️</span> In Progress
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-xs text-primary font-bold">{inProgressOrders.length}</span>
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {inProgressOrders.map(order => (
                  <div key={order.id} className="group relative flex flex-col gap-3 rounded-2xl border border-primary/20 bg-white p-4 shadow-sm transition hover:shadow-md ring-1 ring-primary/10">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold text-secondary/60">{order.orderId}</p>
                        <p className="font-semibold text-primary">{order.customerName}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-right">
                        <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                          <Clock size={12} className="animate-pulse" />
                          {formatDuration(order.startedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-primary/5 p-3 text-sm border border-primary/10">
                      <p className="font-semibold text-secondary">{order.racketModel}</p>
                      <p className="text-secondary/70">{order.stringType} • {order.tension}</p>
                    </div>
                    <button
                      onClick={() => handleCompleteStringing(order.id)}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2 text-sm font-semibold text-white transition hover:bg-primary/90 shadow-sm"
                    >
                      <CheckCircle2 size={14} /> Complete
                    </button>
                  </div>
                ))}
                {inProgressOrders.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/20 py-10 text-center text-sm font-medium text-secondary/50">
                    No active stringing jobs
                  </div>
                )}
              </div>
            </div>

            {/* DONE */}
            <div className="flex flex-col gap-4 rounded-3xl bg-black/5 p-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="flex items-center gap-2 font-heading font-semibold text-secondary">
                  <span>✅</span> Done
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20 text-xs text-green-700 font-bold">{doneOrders.length}</span>
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {doneOrders.map(order => (
                  <div key={order.id} className="relative flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm opacity-80 hover:opacity-100 transition">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold text-secondary/60">{order.orderId}</p>
                        <p className="font-semibold text-secondary">{order.customerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-block">Finished</p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-black/5 p-3 text-sm">
                      <p className="font-semibold text-secondary text-xs mb-1">Delivery: {order.deliveryTime}</p>
                      <p className="text-secondary/70 text-xs">{order.racketModel}</p>
                    </div>
                    <button
                      onClick={() => handlePrintSlip(order)}
                      className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-white py-2 text-sm font-semibold text-secondary transition hover:bg-black/5"
                    >
                      <Printer size={14} /> Print Slip
                    </button>
                  </div>
                ))}
                {doneOrders.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/20 py-10 text-center text-sm font-medium text-secondary/50">
                    No completed jobs yet
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="inventory"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl font-semibold text-secondary">String Inventory</h2>
              <button className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-secondary/90">
                <Plus size={16} /> Add New Spool
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {inventory.map(spool => {
                const isLow = spool.currentMeters <= spool.alertThreshold;
                const isOut = spool.currentMeters === 0;
                const progressColor = getProgressColor(spool.currentMeters, spool.totalMeters, spool.alertThreshold);
                const percent = (spool.currentMeters / spool.totalMeters) * 100;

                return (
                  <div key={spool.id} className={`flex flex-col gap-4 rounded-3xl border p-5 shadow-sm transition hover:shadow-card bg-white ${isOut ? 'border-red-200 bg-red-50/10' : isLow ? 'border-yellow-200' : 'border-black/5'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm ${isOut ? 'border-red-200 bg-red-50 text-red-500' : isLow ? 'border-yellow-200 bg-yellow-50 text-yellow-600' : 'border-black/5 bg-black/5'}`}>
                          <Package size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-secondary text-lg">{spool.name}</p>
                          <p className="text-sm text-secondary/60">{spool.brand} • {spool.color}</p>
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
                        <span className={`font-bold ${isOut ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-green-600'}`}>
                          {spool.currentMeters}m <span className="text-secondary/40 font-normal">/ {spool.totalMeters}m</span>
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-black/5">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${progressColor}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-black/5 pt-4">
                      <p className="text-xs text-secondary/50 font-medium">Quick Adjust (10m)</p>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => updateInventoryMeters(spool.id, -10)}
                          disabled={spool.currentMeters === 0}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/5 text-secondary transition hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:hover:bg-black/5 disabled:hover:text-secondary"
                        >
                          <Minus size={14} />
                        </button>
                        <button 
                          onClick={() => updateInventoryMeters(spool.id, 10)}
                          disabled={spool.currentMeters >= spool.totalMeters}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/5 text-secondary transition hover:bg-green-500 hover:text-white disabled:opacity-50 disabled:hover:bg-black/5 disabled:hover:text-secondary"
                        >
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

      {/* Edit Form Modal before starting */}
      <AnimatePresence>
        {editOrderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
            >
              <div className="mb-4">
                <h3 className="font-heading text-lg font-bold text-secondary">Verify Parameters</h3>
                <p className="text-sm text-secondary/60">Adjust stringing parameters before starting order {editOrderModal.orderId}.</p>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-secondary">String Type</label>
                  <input
                    type="text"
                    value={editForm.stringType}
                    onChange={(e) => setEditForm(prev => ({ ...prev, stringType: e.target.value }))}
                    className="w-full rounded-xl border border-black/10 px-4 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-secondary">Tension</label>
                  <input
                    type="text"
                    value={editForm.tension}
                    onChange={(e) => setEditForm(prev => ({ ...prev, tension: e.target.value }))}
                    className="w-full rounded-xl border border-black/10 px-4 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-secondary">Fee ($)</label>
                  <input
                    type="number"
                    value={editForm.fee}
                    onChange={(e) => setEditForm(prev => ({ ...prev, fee: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-black/10 px-4 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setEditOrderModal(null)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-secondary hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmStart}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 shadow-sm"
                >
                  Confirm & Start
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminShell>
  );
}
