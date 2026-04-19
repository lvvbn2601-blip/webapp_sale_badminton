import { ReactNode, useEffect, useMemo, useState } from "react";
import { Bell, Search, User, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";

export type AdminSection =
  | "dashboard"
  | "products"
  | "brands"
  | "categories"
  | "orders"
  | "stringers"
  | "users"
  | "reviews"
  | "vouchers"
  | "notifications"
  | "settings";

type Props = {
  title: string;
  section: AdminSection;
  onSectionChange: (s: AdminSection) => void;
  onLogout: () => void;
  children: ReactNode;
  notificationCount?: number;
};

const items: Array<{ key: AdminSection; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "products", label: "Products" },
  { key: "brands", label: "Brands" },
  { key: "categories", label: "Categories" },
  { key: "orders", label: "Orders" },
  { key: "stringers", label: "Stringers" },
  { key: "users", label: "Users" },
  { key: "reviews", label: "Reviews" },
  { key: "vouchers", label: "Vouchers" },
  { key: "notifications", label: "Notifications" },
  { key: "settings", label: "Settings" },
];

export function AdminShell({ title, section, onSectionChange, onLogout, children, notificationCount = 0 }: Props) {
  const [admin, setAdmin] = useState<{ name?: string; email?: string; role?: string } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("user");
      setAdmin(raw ? JSON.parse(raw) : null);
    } catch {
      setAdmin(null);
    }
  }, []);

  const initials = useMemo(() => {
    const n = (admin?.name || "Admin").trim();
    const parts = n.split(/\s+/);
    return (parts[0]?.[0] || "A") + (parts[1]?.[0] || "");
  }, [admin?.name]);

  const filteredItems = useMemo(() => {
    if (admin?.role === "warehouse_staff") {
      return items.filter(it => ["products", "inventory", "orders"].includes(it.key));
    }
    if (admin?.role === "knitter") {
      return items.filter(it => ["stringers"].includes(it.key));
    }
    return items; // Default full access for admin
  }, [admin?.role]);

  const hasAccess = filteredItems.some(it => it.key === section);

  // Auto-redirect if they land on dashboard but only have restricted access
  useEffect(() => {
    if (section === "dashboard" && admin?.role && admin.role !== "admin") {
      const firstAllowed = filteredItems[0];
      if (firstAllowed) {
        window.location.replace(`/admin/${firstAllowed.key}`);
      }
    }
  }, [section, admin?.role, filteredItems]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-0 lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-black/5 bg-white lg:block sticky top-0 h-screen overflow-y-auto">
          <div className="p-6">
            <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary text-sm font-semibold text-white">
                BH
              </div>
              <div>
                <p className="font-heading text-lg font-semibold text-secondary">Admin</p>
                <p className="text-xs text-secondary/60">Badminton Hub</p>
              </div>
            </Link>
          </div>
          <nav className="space-y-1 px-3 pb-6">
            {filteredItems.map((it) => {
              const href = it.key === "dashboard" ? "/admin" : `/admin/${it.key}`;
              return (
                <Link
                  key={it.key}
                  href={href}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${section === it.key ? "bg-primary/10 text-secondary" : "text-secondary/70 hover:bg-black/5"
                    }`}
                >
                  <span>{it.label}</span>
                  {it.key === "notifications" && notificationCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {notificationCount > 99 ? "99+" : notificationCount}
                    </span>
                  )}
                </Link>
              );
            })}
            <button
              onClick={onLogout}
              className="mt-2 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold text-primary transition hover:bg-primary/10"
            >
              <span>Logout</span>
            </button>
          </nav>
        </aside>

        <div>
          <header className="sticky top-0 z-20 border-b border-black/5 bg-white/90 backdrop-blur">
            <div className="flex flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-secondary/60">Admin Dashboard</p>
                  <h1 className="font-heading text-2xl font-semibold text-secondary">{title}</h1>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/admin/notifications"
                    className={`relative rounded-full border border-black/5 bg-white p-2 transition ${section === "notifications" ? "text-primary ring-2 ring-primary/20" : "text-secondary/70 hover:text-secondary"}`}
                  >
                    <Bell size={18} />
                    {notificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </span>
                    )}
                  </Link>
                  <div
                    className="relative"
                    onMouseEnter={() => setProfileOpen(true)}
                    onMouseLeave={() => setProfileOpen(false)}
                  >
                    <button className="flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-2 text-sm font-semibold text-secondary/80 transition hover:shadow-card">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-xs font-semibold text-white">
                        {initials}
                      </span>
                      <span className="hidden sm:block">{admin?.name || "Admin"}</span>
                      <User size={16} className="text-secondary/60" />
                    </button>
                    {profileOpen && (
                      <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card">
                        <div className="border-b border-black/5 px-4 py-3">
                          <p className="text-sm font-semibold text-secondary">{admin?.name || "Admin"}</p>
                          <p className="text-xs text-secondary/60">{admin?.email || "—"}</p>
                        </div>
                        <button
                          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-primary hover:bg-primary/10"
                          onClick={onLogout}
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:hidden w-full">
                <select
                  value={section}
                  onChange={(e) => onSectionChange(e.target.value as AdminSection)}
                  className="w-full rounded-2xl border border-black/5 bg-gray-50 px-4 py-3 text-sm font-semibold text-secondary outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {filteredItems.map((it) => (
                    <option key={it.key} value={it.key}>
                      {it.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </header>

          <main className="px-4 py-6 sm:px-6 lg:px-8">
            {!hasAccess ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="rounded-full bg-red-100 p-4 mb-4">
                  <ShieldCheck size={32} className="text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-secondary">Access Denied</h2>
                <p className="mt-2 text-secondary/60">Your role doesn't have permission to view this module.</p>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

