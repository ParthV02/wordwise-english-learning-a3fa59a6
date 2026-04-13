import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { progressData } from "@/data/mockData";
import { useState } from "react";

const BLUE = "#1A56DB";
const GREEN = "#0E9F6E";

export default function ProgressPage() {
  const [search, setSearch] = useState("");

  const filteredBank = progressData.wordBank.filter((w) =>
    w.word.toLowerCase().includes(search.toLowerCase()) ||
    w.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container py-8 space-y-8">
      <div className="rounded-xl bg-blue-card-bg p-6 border border-blue-card-border">
        <h1 className="text-2xl font-bold text-primary">Progress Dashboard</h1>
        <p className="text-muted-foreground mt-1">Track your learning journey</p>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Vocabulary Growth */}
        <div className="rounded-xl bg-card p-6 shadow-sm border border-border">
          <h3 className="mb-4 font-bold text-heading">4-Week Vocabulary Growth</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={progressData.weeklyVocab}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="#94A3B8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" />
              <Tooltip />
              <Line type="monotone" dataKey="words" stroke={BLUE} strokeWidth={3} dot={{ fill: BLUE, r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Quiz Scores */}
        <div className="rounded-xl bg-card p-6 shadow-sm border border-border">
          <h3 className="mb-4 font-bold text-heading">Weekly Quiz Scores</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={progressData.quizScores}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="#94A3B8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" />
              <Tooltip />
              <Bar dataKey="score" fill={GREEN} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pronunciation Accuracy */}
        <div className="rounded-xl bg-card p-6 shadow-sm border border-border">
          <h3 className="mb-4 font-bold text-heading">Pronunciation Accuracy</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={progressData.pronunciationData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" strokeWidth={0}>
                <Cell fill={BLUE} />
                <Cell fill={GREEN} />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-sm">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-primary inline-block" /> Correct</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-success inline-block" /> Needs Work</span>
          </div>
        </div>

        {/* Streak Heatmap */}
        <div className="rounded-xl bg-card p-6 shadow-sm border border-border">
          <h3 className="mb-4 font-bold text-heading">28-Day Activity</h3>
          <div className="grid grid-cols-7 gap-1.5">
            {progressData.streakData.map((d) => (
              <div
                key={d.day}
                className="aspect-square rounded-md transition-colors"
                style={{
                  backgroundColor: d.count === 0
                    ? "#F1F5F9"
                    : `rgba(14, 159, 110, ${0.2 + d.count * 0.2})`,
                }}
                title={`Day ${d.day}: ${d.count} activities`}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-end gap-1 text-xs text-muted-foreground">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((l) => (
              <div
                key={l}
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: l === 0 ? "#F1F5F9" : `rgba(14, 159, 110, ${0.2 + l * 0.2})` }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Word Bank Table */}
      <div className="rounded-xl bg-card p-6 shadow-sm border border-border">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-heading">Word Bank</h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search words..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 focus-visible:ring-primary"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 text-left font-semibold text-primary">Word</th>
                <th className="pb-3 text-left font-semibold text-primary">Category</th>
                <th className="pb-3 text-left font-semibold text-primary">Added</th>
                <th className="pb-3 text-left font-semibold text-primary">Mastery</th>
              </tr>
            </thead>
            <tbody>
              {filteredBank.map((w) => (
                <tr key={w.word} className="border-b border-border/50 last:border-0">
                  <td className="py-3 font-medium text-heading">{w.word}</td>
                  <td className="py-3 text-muted-foreground">{w.category}</td>
                  <td className="py-3 text-muted-foreground">{w.added}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-success transition-all"
                          style={{ width: `${w.mastery}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{w.mastery}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
