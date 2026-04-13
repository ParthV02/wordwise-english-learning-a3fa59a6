import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { newsArticles, articleContent } from "@/data/mockData";
import { toast } from "sonner";

const levels = ["All", "A2", "B1", "B2", "C1"];

export default function NewsReaderPage() {
  const [activeLevel, setActiveLevel] = useState("All");
  const [selectedArticle, setSelectedArticle] = useState<(typeof newsArticles)[0] | null>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [popupWord, setPopupWord] = useState<{ word: string; x: number; y: number } | null>(null);

  const filtered = activeLevel === "All" ? newsArticles : newsArticles.filter((a) => a.level === activeLevel);

  const handleWordClick = (word: string, e: React.MouseEvent) => {
    const clean = word.replace(/[^a-zA-Z]/g, "");
    if (clean.length < 3) return;
    setPopupWord({ word: clean, x: e.clientX, y: e.clientY });
  };

  const saveWord = (word: string) => {
    setSavedWords((prev) => new Set(prev).add(word.toLowerCase()));
    setPopupWord(null);
    toast.success(`"${word}" saved to Word Bank!`);
  };

  if (selectedArticle) {
    const words = articleContent.split(/(\s+)/);
    return (
      <div className="container py-8 max-w-3xl space-y-6">
        <Button variant="ghost" onClick={() => { setSelectedArticle(null); setPopupWord(null); }} className="gap-2 text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to Articles
        </Button>
        <div className="space-y-2">
          <div className="flex gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${selectedArticle.source === "BBC" ? "bg-blue-card-bg text-primary border border-blue-card-border" : "bg-green-card-bg text-success border border-green-card-border"}`}>
              {selectedArticle.source}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              selectedArticle.level === "A2" ? "bg-green-card-bg text-success border border-green-card-border" : "bg-blue-card-bg text-primary border border-blue-card-border"
            }`}>
              {selectedArticle.level}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-heading">{selectedArticle.title}</h1>
        </div>
        <div className="relative rounded-xl bg-card p-6 shadow-sm border border-border leading-8 text-body text-lg">
          {words.map((w, i) => {
            const clean = w.replace(/[^a-zA-Z]/g, "").toLowerCase();
            const isSaved = savedWords.has(clean);
            return (
              <span
                key={i}
                onClick={(e) => handleWordClick(w, e)}
                className={`cursor-pointer transition-colors ${
                  isSaved ? "underline decoration-success decoration-2 underline-offset-4" : "hover:underline hover:decoration-primary hover:decoration-2 hover:underline-offset-4"
                }`}
              >
                {w}
              </span>
            );
          })}
        </div>

        {popupWord && (
          <div
            className="fixed z-50 rounded-xl bg-card border border-border shadow-lg p-4 w-64 fade-in"
            style={{ top: Math.min(popupWord.y, window.innerHeight - 200), left: Math.min(popupWord.x, window.innerWidth - 280) }}
          >
            <div className="rounded-lg bg-blue-card-bg p-2 mb-2 border border-blue-card-border">
              <p className="font-bold text-primary">{popupWord.word}</p>
              <p className="text-xs text-muted-foreground font-mono">/example IPA/</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => saveWord(popupWord.word)} className="gap-1 bg-success text-success-foreground hover:bg-success/90 text-xs">
                <Save className="h-3 w-3" /> Save to Word Bank
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPopupWord(null)} className="text-xs text-muted-foreground">
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="rounded-xl bg-blue-card-bg p-6 border border-blue-card-border">
        <h1 className="text-2xl font-bold text-primary">News Reader</h1>
        <p className="text-muted-foreground mt-1">Learn vocabulary from real-world articles at your level</p>
      </div>

      {/* Level Tabs */}
      <div className="flex gap-2">
        {levels.map((l) => (
          <button
            key={l}
            onClick={() => setActiveLevel(l)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeLevel === l
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Article Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((a) => (
          <button
            key={a.id}
            onClick={() => setSelectedArticle(a)}
            className="rounded-xl border-t-4 border-t-blue-card-border bg-card p-5 shadow-sm text-left transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.source === "BBC" ? "bg-blue-card-bg text-primary border border-blue-card-border" : "bg-green-card-bg text-success border border-green-card-border"}`}>
                {a.source}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                a.level === "A2" ? "bg-green-card-bg text-success border border-green-card-border" : "bg-blue-card-bg text-primary border border-blue-card-border"
              }`}>
                {a.level}
              </span>
            </div>
            <h3 className="font-semibold text-heading">{a.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{a.excerpt}</p>
            <p className="mt-3 text-xs text-muted-foreground">{a.readTime} read</p>
          </button>
        ))}
      </div>
    </div>
  );
}
