import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Trophy, TrendingUp, Users, Clock, Star, Zap, Award } from "lucide-react";
import { fetchPerformanceOverview } from "../../../lib/api";

type Props = { token: string };

export default function PerformanceTab({ token }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceOverview(token).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
    </div>
  );
  if (!data) return <p className="text-center text-secondary/50 py-10">Failed to load performance data</p>;

  const maxCompleted = Math.max(...(data.leaderboard?.map((s: any) => s.totalCompleted) || [1]), 1);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { icon: <Users size={20} />, label: "Total Stringers", value: data.totalStringers, sub: `${data.activeStringers} active`, color: "bg-blue-50 text-blue-600" },
          { icon: <BarChart3 size={20} />, label: "Total Tasks", value: data.totalTasks, sub: `${data.completedTasks} completed`, color: "bg-green-50 text-green-600" },
          { icon: <Clock size={20} />, label: "In Progress", value: data.statusDist?.in_progress || 0, sub: `${data.statusDist?.pending || 0} pending`, color: "bg-yellow-50 text-yellow-600" },
          { icon: <Zap size={20} />, label: "Level-Up Ready", value: data.levelUpCandidates?.length || 0, sub: "awaiting approval", color: "bg-purple-50 text-purple-600" },
        ].map((card, i) => (
          <div key={i} className="flex items-start gap-3 rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${card.color}`}>{card.icon}</div>
            <div>
              <p className="text-2xl font-bold text-secondary">{card.value}</p>
              <p className="text-xs font-semibold text-secondary/60">{card.label}</p>
              <p className="text-[10px] text-secondary/40 mt-0.5">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Difficulty Distribution */}
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
          <h3 className="font-heading text-lg font-semibold text-secondary mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-primary" /> Task Difficulty Distribution
          </h3>
          <div className="flex flex-col gap-3">
            {[
              { label: "Easy", count: data.difficultyDist?.easy || 0, color: "bg-green-500", bg: "bg-green-100" },
              { label: "Medium", count: data.difficultyDist?.medium || 0, color: "bg-yellow-500", bg: "bg-yellow-100" },
              { label: "Hard", count: data.difficultyDist?.hard || 0, color: "bg-red-500", bg: "bg-red-100" },
            ].map(d => {
              const total = (data.difficultyDist?.easy || 0) + (data.difficultyDist?.medium || 0) + (data.difficultyDist?.hard || 0);
              const pct = total > 0 ? (d.count / total) * 100 : 0;
              return (
                <div key={d.label} className="flex items-center gap-3">
                  <span className="w-16 text-sm font-semibold text-secondary">{d.label}</span>
                  <div className={`flex-1 h-6 rounded-full ${d.bg} overflow-hidden`}>
                    <div className={`h-full rounded-full ${d.color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-12 text-right text-sm font-bold text-secondary">{d.count}</span>
                  <span className="w-12 text-right text-xs text-secondary/50">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Overview */}
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
          <h3 className="font-heading text-lg font-semibold text-secondary mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" /> Task Status Overview
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Pending", value: data.statusDist?.pending || 0, emoji: "⏳", color: "border-yellow-200 bg-yellow-50" },
              { label: "Assigned", value: data.statusDist?.assigned || 0, emoji: "📋", color: "border-blue-200 bg-blue-50" },
              { label: "In Progress", value: data.statusDist?.in_progress || 0, emoji: "⚙️", color: "border-primary/20 bg-primary/5" },
              { label: "Completed", value: data.statusDist?.completed || 0, emoji: "✅", color: "border-green-200 bg-green-50" },
            ].map(s => (
              <div key={s.label} className={`flex flex-col items-center rounded-2xl border p-4 ${s.color}`}>
                <span className="text-2xl mb-1">{s.emoji}</span>
                <p className="text-xl font-bold text-secondary">{s.value}</p>
                <p className="text-[11px] font-semibold text-secondary/60">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
        <h3 className="font-heading text-lg font-semibold text-secondary mb-4 flex items-center gap-2">
          <Trophy size={18} className="text-amber-500" /> Stringer Leaderboard
        </h3>
        {data.leaderboard?.length > 0 ? (
          <div className="flex flex-col gap-3">
            {data.leaderboard.map((s: any, i: number) => (
              <div key={s.id} className={`flex items-center gap-4 rounded-2xl p-4 transition ${i === 0 ? "bg-amber-50 border border-amber-200" : i === 1 ? "bg-gray-50 border border-gray-200" : i === 2 ? "bg-orange-50 border border-orange-200" : "bg-white border border-black/5"}`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-lg ${i === 0 ? "bg-amber-500 text-white" : i === 1 ? "bg-gray-400 text-white" : i === 2 ? "bg-orange-400 text-white" : "bg-black/5 text-secondary"}`}>
                  {i < 3 ? <Award size={18} /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-secondary">{s.name}</p>
                  <p className="text-xs text-secondary/50">Level {s.level}</p>
                </div>
                <div className="flex items-center gap-1 text-sm font-bold text-amber-600">
                  <Star size={14} className="fill-amber-500 text-amber-500" /> {s.rating.toFixed(1)}
                </div>
                <div className="w-32 hidden sm:block">
                  <div className="h-2 rounded-full bg-black/5 overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${(s.totalCompleted / maxCompleted) * 100}%` }} />
                  </div>
                  <p className="text-[10px] text-secondary/50 mt-1 text-right">{s.totalCompleted} tasks</p>
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-sm font-bold text-secondary">{s.avgTime} min</p>
                  <p className="text-[10px] text-secondary/40">avg time</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-secondary/50 py-8 text-sm">No ratings yet. Complete some tasks to build the leaderboard.</p>
        )}
      </div>
    </motion.div>
  );
}
