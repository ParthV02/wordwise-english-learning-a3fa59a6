import { Link } from "react-router-dom";
import { BookOpen, Mic, BarChart3, Calendar, ArrowRight, Play, Star, Newspaper, Trophy, FolderOpen, Puzzle, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { wordOfTheDay, modules } from "@/data/mockData";
import { speak } from "@/lib/tts";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const iconMap: Record<string, React.ElementType> = {
  Mic, Puzzle, Newspaper, Calendar, Trophy, FolderOpen,
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [reviewed, setReviewed] = useState(false);
  const [rating, setRating] = useState(0);
  const firstName = user?.name?.split(" ")[0] ?? "Learner";

  const stats = [
    { label: "Words Learned", value: user?.wordsLearned ?? 0, icon: BookOpen, color: "blue" as const },
    { label: "Pronunciation", value: user?.pronunciationAccuracy ? `${user.pronunciationAccuracy}%` : "--", icon: Mic, color: "green" as const },
    { label: "Quiz Score", value: user?.weeklyQuizScore ? `${user.weeklyQuizScore}%` : "--", icon: BarChart3, color: "blue" as const },
    { label: "Due Today", value: user?.wordsDueToday ?? 0, icon: Calendar, color: "green" as const },
  ];

  const handleReview = () => {
    setReviewed(true);
    toast.info("Reviewed!");
  };

  const paths: Record<string, string> = {
    pronunciation: "/pronunciation", decomposer: "/decomposer", news: "/news",
    wotd: "/word-of-day", quiz: "/quiz", categories: "/categories",
  };

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-10 space-y-10">
      {/* Hero Greeting */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-heading">{getGreeting()}, {firstName}</h1>
        <p className="text-muted-foreground">Ready to learn something new today?</p>
        <div className="flex items-center gap-1.5 mt-1">
          <Flame className="h-5 w-5 text-gold" />
          <span className="text-sm font-bold text-gold">{user?.currentStreak ?? 0} day streak</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`rounded-xl bg-card p-5 shadow-sm border-l-4 ${
              s.color === "blue" ? "border-l-blue-card-border" : "border-l-green-card-border"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className={`mt-1 text-2xl font-bold ${s.color === "blue" ? "text-primary" : "text-success"}`}>{s.value}</p>
              </div>
              <s.icon className={`h-7 w-7 ${s.color === "blue" ? "text-primary/30" : "text-success/30"}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Word of the Day */}
      <div className="rounded-xl border-l-4 border-l-green-card-border bg-card p-6 shadow-md">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-success">Word of the Day</div>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-heading">{wordOfTheDay.word}</h2>
            <p className="text-muted-foreground font-mono">{wordOfTheDay.ipa}</p>
            <Button size="sm" variant="outline" onClick={() => speak(wordOfTheDay.word)} className="gap-2 border-primary text-primary hover:bg-primary/5">
              <Play className="h-4 w-4" /> Listen
            </Button>
            <div className="flex flex-wrap gap-2 pt-2">
              {wordOfTheDay.morphemes.map((m) => (
                <span key={m.label} className={`rounded-full px-3 py-1 text-xs font-medium ${
                  m.type === "root"
                    ? "bg-green-card-bg text-success border border-green-card-border"
                    : "bg-blue-card-bg text-primary border border-blue-card-border"
                }`}>
                  {m.label} <span className="opacity-60">({m.meaning})</span>
                </span>
              ))}
            </div>
            <p className="text-body leading-relaxed">{wordOfTheDay.definition}</p>
            <p className="text-sm italic text-muted-foreground">"{wordOfTheDay.example}"</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex gap-1">
              {[1,2,3,4,5].map((s) => (
                <button key={s} onClick={() => setRating(s)}>
                  <Star className={`h-5 w-5 transition-colors ${s <= rating ? "fill-gold text-gold" : "text-border"}`} />
                </button>
              ))}
            </div>
            <Button onClick={handleReview} disabled={reviewed}
              className={`rounded-lg ${reviewed ? "bg-success/80" : "bg-success hover:bg-success/90"} text-success-foreground`}>
              {reviewed ? "✓ Reviewed" : "Mark as Reviewed"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("Word saved!")}
              className="border-success text-success hover:bg-success/5">
              Save to Word Bank
            </Button>
          </div>
        </div>
      </div>

      {/* Module Cards */}
      <div>
        <h2 className="mb-4 text-xl font-bold text-heading">Modules</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => {
            const Icon = iconMap[m.icon] || BookOpen;
            return (
              <Link key={m.id} to={paths[m.id] || "/"}
                className={`group flex items-center gap-4 rounded-xl border-l-4 bg-card p-5 shadow-sm transition-all hover:shadow-md ${
                  m.color === "blue" ? "border-l-blue-card-border" : "border-l-green-card-border"
                }`}>
                <div className={`rounded-lg p-2.5 ${m.color === "blue" ? "bg-blue-card-bg" : "bg-green-card-bg"}`}>
                  <Icon className={`h-5 w-5 ${m.color === "blue" ? "text-primary" : "text-success"}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-heading">{m.title}</h3>
                  <p className="text-sm text-muted-foreground">{m.subtitle}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
