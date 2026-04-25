import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect, useCallback } from "react";
import { Layout } from "../components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Scissors, Package, Star, Shield, Clock, Zap, Award } from "lucide-react";
import { bookStringingService, fetchMyStringingTasks } from "../lib/api";
import StringingBookingWizard from "../components/stringing/StringingBookingWizard";
import StringingTracker from "../components/stringing/StringingTracker";

type TabKey = "book" | "tracking";

export default function StringingServicePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("book");
  const [tasks, setTasks] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: "success" | "error" }>({ show: false, msg: "", type: "success" });

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!t) { router.replace("/login?next=/stringing"); return; }
    setToken(t);
    loadTasks(t);
  }, []);

  // Check tab from query
  useEffect(() => {
    if (router.query.tab === "tracking") setActiveTab("tracking");
  }, [router.query]);

  const loadTasks = useCallback(async (t: string) => {
    try {
      const data = await fetchMyStringingTasks(t);
      setTasks(Array.isArray(data) ? data : []);
    } catch { setTasks([]); }
  }, []);

  const handleBook = async (data: any) => {
    if (!token) return;
    setIsSubmitting(true);
    try {
      await bookStringingService(data, token);
      setToast({ show: true, msg: "🎉 Stringing service booked successfully! Your racket will be assigned to a stringer shortly.", type: "success" });
      await loadTasks(token);
      setActiveTab("tracking");
    } catch (e: any) {
      setToast({ show: true, msg: e?.response?.data?.error || "Failed to book service", type: "error" });
    }
    setIsSubmitting(false);
    setTimeout(() => setToast({ show: false, msg: "", type: "success" }), 5000);
  };

  if (!token) return null;

  return (
    <Layout>
      <Head>
        <title>Racket Stringing Service | Badminton Hub</title>
        <meta name="description" content="Professional racket stringing service with real-time tracking. Choose your string, tension, and pattern — booked online, ready in hours." />
      </Head>

      {/* Breadcrumb */}
      <div className="border-b border-black/5 bg-white/60 backdrop-blur-sm">
        <nav className="container-default flex items-center gap-2 py-3 text-xs text-secondary/50">
          <Link href="/" className="transition hover:text-secondary">Home</Link>
          <ChevronRight size={12} />
          <span className="font-semibold text-secondary/70">Stringing Service</span>
        </nav>
      </div>

      {/* Hero Banner */}
      <section className="bg-gradient-to-br from-secondary via-gray-900 to-gray-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
        <div className="container-default relative z-10 py-14 sm:py-20">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1 space-y-5">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary">🏸 Pro Service</span>
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                Professional Racket<br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-amber-400">Stringing Service</span>
              </h1>
              <p className="text-white/60 text-base max-w-lg">
                Choose your preferred string, tension, and pattern — our AI-powered system assigns the best-rated stringer for your racket. Track everything in real-time.
              </p>
              <div className="flex flex-wrap gap-4">
                {[
                  { icon: <Clock size={16} />, text: "Express 2H Available" },
                  { icon: <Star size={16} />, text: "Rated Stringers" },
                  { icon: <Shield size={16} />, text: "Frame Guarantee" },
                ].map((badge, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-sm">
                    {badge.icon} {badge.text}
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden md:flex shrink-0">
              <div className="w-56 h-56 rounded-full bg-gradient-to-br from-primary/30 to-amber-500/20 flex items-center justify-center backdrop-blur-sm border border-white/10">
                <div className="text-7xl">🏸</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="section-padding bg-gradient-to-b from-gray-50 to-white">
        <div className="container-default">

          {/* Toast */}
          <AnimatePresence>
            {toast.show && (
              <motion.div
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className={`mb-6 rounded-2xl p-4 text-sm font-semibold shadow-sm ${toast.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}
              >
                {toast.msg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab Navigation */}
          <div className="flex gap-3 mb-8">
            {[
              { key: "book" as TabKey, label: "Book Service", icon: <Scissors size={16} /> },
              { key: "tracking" as TabKey, label: `My Orders${tasks.length > 0 ? ` (${tasks.length})` : ""}`, icon: <Package size={16} /> },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition ${activeTab === tab.key ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-white text-secondary border border-black/5 hover:bg-gray-50 shadow-sm"}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === "book" && (
              <motion.div key="book" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <StringingBookingWizard onSubmit={handleBook} isSubmitting={isSubmitting} />
              </motion.div>
            )}

            {activeTab === "tracking" && (
              <motion.div key="tracking" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <div className="max-w-3xl mx-auto">
                  <div className="mb-6 text-center">
                    <h2 className="font-heading text-2xl font-bold text-secondary">📦 My Stringing Orders</h2>
                    <p className="text-sm text-secondary/60 mt-1">Track your racket stringing progress in real-time</p>
                  </div>
                  <StringingTracker tasks={tasks} token={token} onRefresh={() => loadTasks(token)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trust Signals */}
          <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { icon: <Award size={24} className="text-amber-500" />, title: "Certified Stringers", desc: "Level 1-5 rated professionals" },
              { icon: <Zap size={24} className="text-primary" />, title: "AI-Powered Assignment", desc: "Best match for your racket" },
              { icon: <Clock size={24} className="text-blue-500" />, title: "Express 2H Service", desc: "Rush orders available" },
              { icon: <Shield size={24} className="text-emerald-500" />, title: "Frame Protection", desc: "Covered if anything goes wrong" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-3 rounded-3xl border border-black/5 bg-white p-6 text-center shadow-sm transition hover:shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50">{item.icon}</div>
                <h4 className="text-sm font-bold text-secondary">{item.title}</h4>
                <p className="text-xs text-secondary/50">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
