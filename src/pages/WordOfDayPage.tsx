import { useState } from "react";
import { Play, Star, CheckCircle2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { wordOfTheDay, wordHistory } from "@/data/mockData";
import { toast } from "sonner";
import { speak } from "@/lib/tts";

import { useAuth } from "@/contexts/AuthContext";

export default function WordOfDayPage() {
  const { user, updateUser } = useAuth();
  const [reviewed, setReviewed] = useState(false);
  const [rating, setRating] = useState(0);

  const today = new Date();
  const calendarDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return { date: d, isToday: i === 6 };
  });

  const handleReviewWord = () => {
    if (!user) return;
    setReviewed(true);
    
    // Save to global word bank
    const word = wordOfTheDay.word;
    const wordBank = user.wordBank || [];
    const already = wordBank.some((w: any) => 
      (typeof w === "string" ? w : w.word).toLowerCase() === word.toLowerCase()
    );

    if (!already) {
      updateUser({
        wordBank: [...wordBank, { 
          word, 
          definition: wordOfTheDay.definition,
          ipa: wordOfTheDay.ipa,
          added: new Date().toISOString().split("T")[0],
          mastery: 0
        }],
        wordsLearned: user.wordsLearned + 1
      });
      toast.success(`"${word}" marked as reviewed and saved to Word Bank!`);
    } else {
      toast.info(`"${word}" marked as reviewed!`);
    }
  };

  return (
    <div className="container py-8 space-y-8">
      <div className="rounded-xl bg-green-card-bg p-6 border border-green-card-border">
        <h1 className="text-2xl font-bold text-success">Word of the Day</h1>
        <p className="text-muted-foreground mt-1">Expand your vocabulary one word at a time</p>
      </div>

      {/* Calendar Strip */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {calendarDays.map((d, i) => (
          <div
            key={i}
            className={`flex min-w-[70px] flex-col items-center rounded-xl p-3 text-center transition-all ${
              d.isToday
                ? "border-2 border-green-card-border bg-green-card-bg shadow-sm"
                : "border border-border bg-card"
            }`}
          >
            <span className="text-xs text-muted-foreground">
              {d.date.toLocaleDateString("en", { weekday: "short" })}
            </span>
            <span className={`text-lg font-bold ${d.isToday ? "text-success" : "text-heading"}`}>
              {d.date.getDate()}
            </span>
          </div>
        ))}
      </div>

      {/* Featured Word */}
      <div className="rounded-xl border-l-4 border-l-green-card-border bg-card p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-success mb-2">Today's Word</div>
        <h2 className="text-4xl font-bold text-heading">{wordOfTheDay.word}</h2>
        <p className="mt-2 font-mono text-lg text-muted-foreground">{wordOfTheDay.ipa}</p>
        <span className="mt-1 inline-block text-sm italic text-muted-foreground">{wordOfTheDay.partOfSpeech}</span>

        <Button size="sm" variant="outline" onClick={() => speak(wordOfTheDay.word)} className="mt-4 gap-2 border-primary text-primary hover:bg-primary/5">
          <Play className="h-4 w-4" /> Listen
        </Button>

        <div className="mt-4 flex flex-wrap gap-2">
          {wordOfTheDay.morphemes.map((m) => (
            <span
              key={m.label}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                m.type === "root"
                  ? "bg-green-card-bg text-success border border-green-card-border"
                  : "bg-blue-card-bg text-primary border border-blue-card-border"
              }`}
            >
              {m.label} ({m.meaning})
            </span>
          ))}
        </div>

        <p className="mt-4 text-body leading-relaxed">{wordOfTheDay.definition}</p>
        <p className="mt-2 text-sm italic text-muted-foreground">"{wordOfTheDay.example}"</p>

        <div className="mt-6 flex items-center gap-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} onClick={() => setRating(s)}>
                <Star className={`h-5 w-5 transition-colors ${s <= rating ? "fill-gold text-gold" : "text-border"}`} />
              </button>
            ))}
          </div>
          <Button
            onClick={handleReviewWord}
            disabled={reviewed}
            className={`rounded-lg ${reviewed ? "bg-success/80" : "bg-success hover:bg-success/90"} text-success-foreground`}
          >
            {reviewed ? "✓ Reviewed" : "Mark as Reviewed"}
          </Button>
        </div>

        <div className="mt-4 flex gap-2">
          <span className="rounded-full bg-blue-card-bg px-3 py-1 text-xs font-medium text-primary border border-blue-card-border">
            SM-2 Interval: 3 days
          </span>
          <span className="rounded-full bg-blue-card-bg px-3 py-1 text-xs font-medium text-primary border border-blue-card-border">
            Ease Factor: 2.5
          </span>
        </div>
      </div>

      {/* Word History */}
      <div>
        <h3 className="mb-4 text-lg font-bold text-heading">Recent Words</h3>
        <div className="space-y-2">
          {wordHistory.map((w) => (
            <div key={w.date} className="flex items-center justify-between rounded-xl border-l-4 border-l-green-card-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <button onClick={() => speak(w.word)} className="text-primary hover:text-primary/70 transition-colors" title="Listen">
                  <Volume2 className="h-4 w-4" />
                </button>
                <div>
                  <p className="font-semibold text-heading">{w.word}</p>
                  <p className="text-sm text-muted-foreground font-mono">{w.ipa}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{w.date}</span>
                {w.reviewed ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <span className="rounded-full bg-blue-card-bg px-2 py-0.5 text-xs text-primary border border-blue-card-border">Pending</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
