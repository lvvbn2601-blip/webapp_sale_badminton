import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { AdminShell } from "../../components/admin/AdminShell";
import { Save, Building2, Truck, ShieldCheck, CreditCard, Image as ImageIcon, CheckCircle2, User, UserPlus, Edit3, Trash2 } from "lucide-react";

/* ══════════════════ MOCK DATA ══════════════════ */
const initialGeneral = {
  storeName: "Badminton Hub",
  logoUrl: "https://example.com/logo.png",
  hotline: "1900 1234",
  bankName: "Techcombank",
  bankAccountName: "BADMINTON HUB CO.",
  bankAccountNumber: "19034567890011"
};

const initialShipping = {
  flatFee: 30000,
  freeThreshold: 1000000 
};

// Roles config for UI
const rolesList = [
  { id: "admin", name: "Administrator", desc: "Full system access.", color: "bg-purple-100 text-purple-700" },
  { id: "warehouse_staff", name: "Warehouse Staff", desc: "Only see Product, Warehouse, and Order modules (no financial reports).", color: "bg-blue-100 text-blue-700" },
  { id: "knitter", name: "Knitter (Stringer)", desc: "Only see 'Pending knitting' orders to retrieve technical specifications.", color: "bg-emerald-100 text-emerald-700" }
];

import { fetchSettings, updateSettings, fetchUsers, createUser, updateUserRole, deleteUser } from "../../lib/api";

/* ══════════════════ MAIN COMPONENT ══════════════════ */
export default function AdminSettingsPage() {
  const router = useRouter();

  // Auth
  const [authChecked, setAuthChecked] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<"general" | "shipping" | "permissions">("general");

  // State
  const [general, setGeneral] = useState(initialGeneral);
  const [shipping, setShipping] = useState(initialShipping);
  const [users, setUsers] = useState<any[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "warehouse_staff" });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const t = localStorage.getItem("accessToken");
      const userRaw = localStorage.getItem("user");
      let u = null;
      try { u = userRaw ? JSON.parse(userRaw) : null; } catch {}
      
      if (!t || !u) { router.replace("/login?next=/admin/settings"); return; }
      if (u.role !== "admin") { router.replace("/"); return; }
      
      setAdminUser(u);
      setAuthChecked(true);

      // Fetch Data
      fetchSettings().then(d => {
        if (d) {
          setGeneral({
            storeName: d.storeName || "",
            logoUrl: d.logoUrl || "",
            hotline: d.hotline || "",
            bankName: d.bankName || "",
            bankAccountName: d.bankAccountName || "",
            bankAccountNumber: d.bankAccountNumber || ""
          });
          setShipping({
            flatFee: d.flatFee || 0,
            freeThreshold: d.freeThreshold || 0
          });
        }
      }).catch(console.error);

      fetchUsers(t).then(us => {
        const staff = us.filter((x: any) => x.role !== 'user');
        setUsers(staff.map((x: any) => ({
          id: x._id, name: x.name, email: x.email, role: x.role
        })));
      }).catch(console.error);
    }
  }, []);

  const handleSaveAll = async () => {
    setSaving(true);
    const t = localStorage.getItem("accessToken");
    try {
      if (t) {
        await updateSettings({ ...general, ...shipping }, t);
        showToast("Settings updated successfully!");
      }
    } catch {
      showToast("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUser = async () => {
    const t = localStorage.getItem("accessToken");
    if (!t) return;
    try {
      if (editingUserId) {
        await updateUserRole(editingUserId, userForm.role, t);
        setUsers(prev => prev.map(u => u.id === editingUserId ? { ...u, role: userForm.role } : u));
        showToast("User role updated");
      } else {
        const newUser = await createUser(userForm, t);
        setUsers(prev => [{ id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role }, ...prev]);
        showToast("Staff invited successfully");
      }
      setUserModalOpen(false);
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to save user");
    }
  };

  const handleDeleteUser = async (id: string) => {
    const t = localStorage.getItem("accessToken");
    if (!t) return;
    if (confirm("Are you sure you want to remove this staff? This will change their role to 'user'.")) {
      try {
        await updateUserRole(id, "user", t);
        setUsers(prev => prev.filter(u => u.id !== id));
        showToast("Staff access removed");
      } catch {
        alert("Failed to update user");
      }
    }
  };

  if (!authChecked) {
    return <div className="p-12 text-center text-sm font-semibold text-secondary/50">Loading settings...</div>;
  }

  return (
    <AdminShell
      title="System Settings"
      section="settings"
      onSectionChange={(s) => {
        if (s === "dashboard") router.push("/admin");
        else router.push(`/admin/${s}`);
      }}
      onLogout={() => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        router.push("/login");
      }}
    >
      <Head><title>Settings | Admin</title></Head>

      {/* TOAST */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg animate-in slide-in-from-top-2">
          <CheckCircle2 size={16} />
          {toast}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* SIDEBAR TABS */}
        <div className="w-full lg:w-64 shrink-0 space-y-2">
          <button
            onClick={() => setActiveTab("general")}
            className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
              activeTab === "general" ? "bg-primary text-white shadow-sm" : "bg-white text-secondary/60 hover:bg-gray-50 border border-black/5"
            }`}
          >
            <Building2 size={18} />
            General Settings
          </button>
          <button
            onClick={() => setActiveTab("shipping")}
            className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
              activeTab === "shipping" ? "bg-primary text-white shadow-sm" : "bg-white text-secondary/60 hover:bg-gray-50 border border-black/5"
            }`}
          >
            <Truck size={18} />
            Shipping Formats
          </button>
          <button
            onClick={() => setActiveTab("permissions")}
            className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
              activeTab === "permissions" ? "bg-primary text-white shadow-sm" : "bg-white text-secondary/60 hover:bg-gray-50 border border-black/5"
            }`}
          >
            <ShieldCheck size={18} />
            Permissions & Roles
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 space-y-6">
          
          {/* ══════════ GENERAL SETTINGS ══════════ */}
          {activeTab === "general" && (
            <div className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="border-b border-black/5 bg-gray-50/50 px-6 py-4">
                <h3 className="font-heading text-lg font-bold text-secondary">General Information</h3>
                <p className="text-xs font-semibold text-secondary/60 mt-0.5">Core store details and bank account for transfers.</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-secondary/60">Store Name</label>
                    <input 
                      value={general.storeName}
                      onChange={e => setGeneral({...general, storeName: e.target.value})}
                      className="w-full rounded-xl border border-black/10 bg-gray-50/50 px-4 py-2.5 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-secondary/60">Hotline Number</label>
                    <input 
                      value={general.hotline}
                      onChange={e => setGeneral({...general, hotline: e.target.value})}
                      className="w-full rounded-xl border border-black/10 bg-gray-50/50 px-4 py-2.5 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition"
                    />
                  </div>
                  <div className="col-span-full">
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-secondary/60">Logo URL</label>
                    <div className="flex gap-3 items-center">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-dashed border-black/20 bg-gray-50 text-secondary/40">
                        <ImageIcon size={20} />
                      </div>
                      <input 
                        value={general.logoUrl}
                        onChange={e => setGeneral({...general, logoUrl: e.target.value})}
                        className="flex-1 rounded-xl border border-black/10 bg-gray-50/50 px-4 py-2.5 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-black/5 bg-gray-50 p-5 mt-6 relative overflow-hidden">
                  <CreditCard className="absolute -right-4 -bottom-4 h-24 w-24 text-black/5" />
                  <h4 className="text-sm font-bold text-secondary mb-4 flex items-center gap-2">
                    <CreditCard size={16} className="text-secondary/60" />
                    Bank Transfer Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-secondary/50">Bank Name</label>
                      <input 
                        value={general.bankName}
                        onChange={e => setGeneral({...general, bankName: e.target.value})}
                        className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-secondary/50">Account Name</label>
                      <input 
                        value={general.bankAccountName}
                        onChange={e => setGeneral({...general, bankAccountName: e.target.value})}
                        className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-secondary/50">Account Number</label>
                      <input 
                        value={general.bankAccountNumber}
                        onChange={e => setGeneral({...general, bankAccountNumber: e.target.value})}
                        className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* ══════════ SHIPPING SETTINGS ══════════ */}
          {activeTab === "shipping" && (
            <div className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="border-b border-black/5 bg-gray-50/50 px-6 py-4">
                <h3 className="font-heading text-lg font-bold text-secondary">Shipping Configuration</h3>
                <p className="text-xs font-semibold text-secondary/60 mt-0.5">Control delivery fees and free shipping thresholds.</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                  {/* Flat Fee */}
                  <div className="rounded-xl border border-black/10 p-5 ring-1 ring-black/5 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-100 text-blue-600">
                        <Truck size={16} />
                      </div>
                      <h4 className="font-bold text-secondary">Flat Shipping Fee</h4>
                    </div>
                    <p className="text-xs text-secondary/60 mb-4 line-clamp-2">The standard delivery fee applied nationwide if criteria is not met.</p>
                    <div className="relative">
                      <input 
                        type="number"
                        value={shipping.flatFee}
                        onChange={e => setShipping({...shipping, flatFee: Number(e.target.value)})}
                        className="w-full rounded-xl border border-black/10 bg-gray-50/50 px-4 py-2.5 pl-12 text-lg font-bold text-secondary focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-secondary/40">VND</span>
                    </div>
                  </div>
                  
                  {/* Free Threshold */}
                  <div className="rounded-xl border border-black/10 p-5 ring-1 ring-emerald-500/10 shadow-sm relative overflow-hidden bg-emerald-50/30">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-600">
                        <CheckCircle2 size={16} />
                      </div>
                      <h4 className="font-bold text-secondary">Free Shipping Threshold</h4>
                    </div>
                    <p className="text-xs text-secondary/60 mb-4 line-clamp-2">Orders exceeding this total amount will have zero shipping fee.</p>
                    <div className="relative">
                      <input 
                        type="number"
                        value={shipping.freeThreshold}
                        onChange={e => setShipping({...shipping, freeThreshold: Number(e.target.value)})}
                        className="w-full rounded-xl border border-emerald-500/30 bg-white px-4 py-2.5 pl-12 text-lg font-bold text-emerald-700 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-emerald-600/50">VND</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* ══════════ PERMISSIONS & ROLES ══════════ */}
          {activeTab === "permissions" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {rolesList.map(r => (
                  <div key={r.id} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                    <div className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${r.color} mb-3`}>
                      {r.id.replace("_", " ")}
                    </div>
                    <h4 className="font-bold text-secondary">{r.name}</h4>
                    <p className="mt-1 text-xs text-secondary/60 leading-relaxed min-h-[40px]">{r.desc}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-black/5 bg-gray-50/50 px-6 py-4">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-secondary">Staff Accounts</h3>
                    <p className="text-xs font-semibold text-secondary/60">Manage your team and assign roles.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingUserId(null);
                      setUserForm({ name: "", email: "", password: "", role: "warehouse_staff" });
                      setUserModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-primary/90"
                  >
                    <UserPlus size={14} />
                    Invite Staff
                  </button>
                </div>
                
                <div className="divide-y divide-black/5">
                  {users.map(u => {
                    const roleCfg = rolesList.find(r => r.id === u.role);
                    return (
                      <div key={u.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition">
                        <div className="flex items-center gap-4">
                          <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary/10 to-primary/5 text-primary font-bold">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-secondary text-sm">{u.name}</p>
                            <p className="text-xs text-secondary/50">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`rounded-xl px-3 py-1 text-xs font-bold ${roleCfg?.color}`}>
                            {roleCfg?.name}
                          </span>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => {
                                setEditingUserId(u.id);
                                setUserForm({ name: u.name, email: u.email, password: "", role: u.role });
                                setUserModalOpen(true);
                              }}
                              className="p-2 text-secondary/40 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
                            >
                              <Edit3 size={15} />
                            </button>
                            {u.role !== "admin" && (
                              <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-secondary/40 hover:text-red-600 rounded-lg hover:bg-red-50 transition">
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SAVE BUTTON */}
          <div className="flex justify-end pt-2">
            <button 
              onClick={handleSaveAll}
              disabled={saving}
              className="btn-primary flex items-center gap-2 py-3 px-8 text-sm font-bold shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save size={16} />
              )}
              {saving ? "Saving Changes..." : "Save Settings"}
            </button>
          </div>

        </div>
      </div>

      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl animate-in zoom-in-95">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h3 className="font-heading text-lg font-bold text-secondary">
                  {editingUserId ? "Edit Staff" : "Invite Staff"}
                </h3>
                <p className="text-sm text-secondary/60">
                  {editingUserId ? "Update role for this user." : "Add a new team member."}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-secondary">Name</label>
                <input
                  value={userForm.name}
                  onChange={e => setUserForm({...userForm, name: e.target.value})}
                  disabled={!!editingUserId}
                  className="w-full rounded-xl border border-black/10 px-4 py-2 text-sm shadow-sm focus:border-primary disabled:opacity-50"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-secondary">Email</label>
                <input
                  value={userForm.email}
                  onChange={e => setUserForm({...userForm, email: e.target.value})}
                  disabled={!!editingUserId}
                  type="email"
                  className="w-full rounded-xl border border-black/10 px-4 py-2 text-sm shadow-sm focus:border-primary disabled:opacity-50"
                  placeholder="john@example.com"
                />
              </div>
              {!editingUserId && (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-secondary">Password</label>
                  <input
                    value={userForm.password}
                    onChange={e => setUserForm({...userForm, password: e.target.value})}
                    type="password"
                    className="w-full rounded-xl border border-black/10 px-4 py-2 text-sm shadow-sm focus:border-primary"
                    placeholder="Enter password"
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-semibold text-secondary">Role</label>
                <select
                  value={userForm.role}
                  onChange={e => setUserForm({...userForm, role: e.target.value})}
                  className="w-full rounded-xl border border-black/10 px-4 py-2 text-sm shadow-sm focus:border-primary bg-white"
                >
                  <option value="admin">Administrator</option>
                  <option value="warehouse_staff">Warehouse Staff</option>
                  <option value="knitter">Knitter (Stringer)</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setUserModalOpen(false)}
                className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-bold text-secondary transition hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                disabled={!editingUserId && (!userForm.name || !userForm.email || !userForm.password)}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
              >
                Save Staff
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminShell>
  );
}
