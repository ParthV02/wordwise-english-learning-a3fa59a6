import { useState } from "react";
import { Search, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { decomposerResults } from "@/data/mockData";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type DecomposerKey = keyof typeof decomposerResults;

const recentWords: DecomposerKey[] = ["unbelievable", "international", "predetermined"];

export default function DecomposerPage() {
  const { user, updateUser } = useAuth();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<(typeof decomposerResults)[DecomposerKey] | null>(null);

  const handleSaveWord = () => {
    if (!user || !result) return;
    const word = result.word;
    const wordBank = user.wordBank || [];
    const already = wordBank.some((w: any) => 
      (typeof w === "string" ? w : w.word).toLowerCase() === word.toLowerCase()
    );

    if (!already) {
      updateUser({
        wordBank: [...wordBank, { 
          word, 
          added: new Date().toISOString().split("T")[0],
          mastery: 0
        }],
        wordsLearned: user.wordsLearned + 1
      });
      toast.success(`"${word}" saved to Word Bank!`);
    } else {
      toast.info(`"${word}" is already in your Word Bank`);
    }
  };

  const handleSearch = (word?: string) => {
    const key = (word || query).toLowerCase().trim() as DecomposerKey;
    const found = decomposerResults[key];
    if (found) {
      setResult(found);
    } else {
      // Default to first result for demo
      setResult(decomposerResults["unbelievable"]);
      toast.info("Showing demo result for 'Unbelievable'");
    }
  };

  return (
    <div className="container py-8 space-y-8">
      <div className="rounded-xl bg-blue-card-bg p-6 border border-blue-card-border">
        <h1 className="text-2xl font-bold text-primary">Word Decomposer</h1>
        <p className="text-muted-foreground mt-1">Break any English word into its morphological components</p>
      </div>

      {/* Search */}
      <div className="mx-auto max-w-xl flex gap-2">
        <Input
          placeholder="Enter any English word to decompose..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="focus-visible:ring-primary"
        />
        <Button onClick={() => handleSearch()} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          <Search className="h-4 w-4" /> Search
        </Button>
      </div>

      {/* Result */}
      {result && (
        <div className="mx-auto max-w-3xl space-y-6 fade-in">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-heading">{result.word}</h2>
            <div className="mt-3 flex items-center justify-center gap-1 text-lg">
              <span className="text-primary font-semibold">{result.prefix.label}</span>
              <span className="text-muted-foreground">+</span>
              <span className="text-success font-semibold">{result.root.label}</span>
              <span className="text-muted-foreground">+</span>
              <span className="text-primary font-semibold">{result.suffix.label}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Prefix */}
            <div className="rounded-xl border-l-4 border-l-blue-card-border bg-blue-card-bg p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Prefix</p>
              <p className="mt-2 text-xl font-bold text-heading">{result.prefix.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">Origin: {result.prefix.origin}</p>
              <p className="text-sm text-body mt-1">Meaning: {result.prefix.meaning}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {result.prefix.related.map((w) => (
                  <span key={w} className="rounded-full bg-card px-2 py-0.5 text-xs text-primary border border-blue-card-border">{w}</span>
                ))}
              </div>
            </div>

            {/* Root */}
            <div className="rounded-xl border-l-4 border-l-green-card-border bg-green-card-bg p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-success">Root</p>
              <p className="mt-2 text-xl font-bold text-heading">{result.root.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">Origin: {result.root.origin}</p>
              <p className="text-sm text-body mt-1">Meaning: {result.root.meaning}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {result.root.related.map((w) => (
                  <span key={w} className="rounded-full bg-card px-2 py-0.5 text-xs text-success border border-green-card-border">{w}</span>
                ))}
              </div>
            </div>

            {/* Suffix */}
            <div className="rounded-xl border-l-4 border-l-blue-card-border bg-blue-card-bg p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Suffix</p>
              <p className="mt-2 text-xl font-bold text-heading">{result.suffix.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">Origin: {result.suffix.origin}</p>
              <p className="text-sm text-body mt-1">Meaning: {result.suffix.meaning}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {result.suffix.related.map((w) => (
                  <span key={w} className="rounded-full bg-card px-2 py-0.5 text-xs text-primary border border-blue-card-border">{w}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center">
            <Button onClick={handleSaveWord} className="gap-2 bg-success text-success-foreground hover:bg-success/90">
              <Save className="h-4 w-4" /> Save to Word Bank
            </Button>
          </div>
        </div>
      )}

      {/* Recent */}
      <div className="mx-auto max-w-xl">
        <h3 className="mb-3 text-sm font-semibold text-heading">Recent Decompositions</h3>
        <div className="space-y-2">
          {recentWords.map((w) => (
            <button
              key={w}
              onClick={() => { setQuery(w); handleSearch(w); }}
              className="w-full rounded-lg border border-border bg-card p-3 text-left text-sm font-medium text-heading shadow-sm transition-colors hover:bg-muted"
            >
              {decomposerResults[w].word}
              <span className="ml-2 text-xs text-muted-foreground">
                {decomposerResults[w].prefix.label} + {decomposerResults[w].root.label} + {decomposerResults[w].suffix.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
