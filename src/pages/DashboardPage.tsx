import { Link } from "react-router-dom";
import { BookOpen, Mic, BarChart3, Calendar, ArrowRight, Play, Star, Newspaper, Trophy, FolderOpen, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { currentUser, wordOfTheDay, modules } from "@/data/mockData";
import { useState } from "react";
import { toast } from "sonner";

const iconMap: Record<string, React.ElementType> = {
  Mic, Puzzle, Newspaper, Calendar, Trophy, FolderOpen,
};

const statsCards = [
  { label: "Total Words Learned", value: currentUser.totalWords, icon: BookOpen, color: "blue" as const },
  { label: "Pronunciation Accuracy", value: `${currentUser.pronunciationAccuracy}%`, icon: Mic, color: "green" as const },
  { label: "Weekly Quiz Score", value: `${currentUser.weeklyQuizScore}%`, icon: BarChart3, color: "blue" as const },
  { label: "Words Due Today", value: currentUser.wordsDueToday, icon: Calendar, color: "green" as const },
];

export default function DashboardPage() {
  const [reviewed, setReviewed] = useState(false);
  const [rating, setRating] = useState(0);

  const handleReview = () => {
    setReviewed(true);
    toast.success("Word marked as reviewed!");
  };

  return (
    <div className="container py-8 space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold text-heading">Good morning, {currentUser.name}!</h1>
        <p className="text-muted-foreground mt-1">Ready to learn some new words today?</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((s) => (
          <div
            key={s.label}
            className={`rounded-xl p-5 shadow-sm border-l-4 ${
              s.color === "blue"
                ? "bg-blue-card-bg border-l-blue-card-border"
                : "bg-green-card-bg border-l-green-card-border"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className={`mt-1 text-2xl font-bold ${s.color === "blue" ? "text-primary" : "text-success"}`}>
                  {s.value}
                </p>
              </div>
              <s.icon className={`h-8 w-8 ${s.color === "blue" ? "text-primary/40" : "text-success/40"}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Word of the Day */}
      <div className="rounded-xl border-l-4 border-l-green-card-border bg-card p-6 shadow-sm">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-success">Word of the Day</div>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-heading">{wordOfTheDay.word}</h2>
            <p className="text-muted-foreground font-mono">{wordOfTheDay.ipa}</p>
            <Button size="sm" variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/5">
              <Play className="h-4 w-4" /> Listen
            </Button>
            <div className="flex flex-wrap gap-2 pt-2">
              {wordOfTheDay.morphemes.map((m) => (
                <span
                  key={m.label}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    m.type === "root"
                      ? "bg-green-card-bg text-success border border-green-card-border"
                      : "bg-blue-card-bg text-primary border border-blue-card-border"
                  }`}
                >
                  {m.label} <span className="opacity-60">({m.meaning})</span>
                </span>
              ))}
            </div>
            <p className="text-body leading-relaxed">{wordOfTheDay.definition}</p>
            <p className="text-sm italic text-muted-foreground">"{wordOfTheDay.example}"</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setRating(s)}>
                  <Star className={`h-5 w-5 transition-colors ${s <= rating ? "fill-gold text-gold" : "text-border"}`} />
                </button>
              ))}
            </div>
            <Button
              onClick={handleReview}
              disabled={reviewed}
              className={`rounded-lg ${reviewed ? "bg-success/80" : "bg-success hover:bg-success/90"} text-success-foreground`}
            >
              {reviewed ? "✓ Reviewed" : "Mark as Reviewed"}
            </Button>
          </div>
        </div>
      </div>

      {/* Module Quick Access */}
      <div>
        <h2 className="mb-4 text-xl font-bold text-heading">Modules</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => {
            const Icon = iconMap[m.icon] || BookOpen;
            const paths: Record<string, string> = {
              pronunciation: "/pronunciation",
              decomposer: "/decomposer",
              news: "/news",
              wotd: "/word-of-day",
              quiz: "/quiz",
              categories: "/categories",
            };
            return (
              <Link
                key={m.id}
                to={paths[m.id] || "/"}
                className={`group flex items-center gap-4 rounded-xl border-l-4 bg-card p-5 shadow-sm transition-all hover:shadow-md ${
                  m.color === "blue" ? "border-l-blue-card-border" : "border-l-green-card-border"
                }`}
              >
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
