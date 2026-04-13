import { useState } from "react";
import { Stethoscope, Scale, FlaskConical, Briefcase, GraduationCap, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categories, categoryWords } from "@/data/mockData";
import { toast } from "sonner";

const iconMap: Record<string, React.ElementType> = {
  Stethoscope, Scale, FlaskConical, Briefcase, GraduationCap, BookOpen,
};

const suffixFilters = ["-ology", "-itis", "-tion", "-ment", "-ance", "-est", "-ify", "-able", "-ous"];
const prefixFilters = ["bio-", "pre-", "anti-", "micro-", "inter-", "un-", "re-", "over-", "sub-"];

export default function CategoryExplorerPage() {
  const [selectedCat, setSelectedCat] = useState("medical");
  const [activeSuffixes, setActiveSuffixes] = useState<Set<string>>(new Set());
  const [activePrefixes, setActivePrefixes] = useState<Set<string>>(new Set());

  const toggleFilter = (set: Set<string>, val: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    setter(next);
  };

  const words = categoryWords[selectedCat] || [];
  const filtered = words.filter((w) => {
    if (activeSuffixes.size > 0 && w.suffix && !Array.from(activeSuffixes).some((s) => w.suffix?.includes(s.replace("-", "")))) return false;
    if (activePrefixes.size > 0 && w.prefix && !Array.from(activePrefixes).some((p) => w.prefix?.includes(p.replace("-", "")))) return false;
    if (activeSuffixes.size > 0 && !w.suffix) return false;
    if (activePrefixes.size > 0 && !w.prefix) return false;
    return true;
  });
  const displayWords = activeSuffixes.size === 0 && activePrefixes.size === 0 ? words : filtered;

  const cat = categories.find((c) => c.id === selectedCat)!;

  return (
    <div className="container py-8 space-y-8">
      <div className="rounded-xl bg-green-card-bg p-6 border border-green-card-border">
        <h1 className="text-2xl font-bold text-success">Category Explorer</h1>
        <p className="text-muted-foreground mt-1">Explore domain-specific vocabulary by category</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
        {/* Left Panel */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-heading mb-3">Choose Category</h3>
          {categories.map((c) => {
            const Icon = iconMap[c.icon] || BookOpen;
            const active = selectedCat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => { setSelectedCat(c.id); setActiveSuffixes(new Set()); setActivePrefixes(new Set()); }}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${
                  active
                    ? c.color === "green"
                      ? "bg-success text-success-foreground"
                      : "bg-primary text-primary-foreground"
                    : c.color === "green"
                      ? "bg-green-card-bg text-success border border-green-card-border hover:bg-green-card-bg/80"
                      : "bg-blue-card-bg text-primary border border-blue-card-border hover:bg-blue-card-bg/80"
                }`}
              >
                <Icon className="h-5 w-5" />
                <div>
                  <p className="font-semibold text-sm">{c.name}</p>
                  <p className={`text-xs ${active ? "opacity-80" : "opacity-60"}`}>{c.wordCount} words</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Suffix Filters */}
          <div>
            <p className="text-sm font-semibold text-heading mb-2">Filter by Suffix</p>
            <div className="flex flex-wrap gap-2">
              {suffixFilters.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleFilter(activeSuffixes, s, setActiveSuffixes)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    activeSuffixes.has(s)
                      ? "bg-success text-success-foreground"
                      : "bg-green-card-bg text-success border border-green-card-border hover:bg-green-card-bg/80"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Prefix Filters */}
          <div>
            <p className="text-sm font-semibold text-heading mb-2">Filter by Prefix</p>
            <div className="flex flex-wrap gap-2">
              {prefixFilters.map((p) => (
                <button
                  key={p}
                  onClick={() => toggleFilter(activePrefixes, p, setActivePrefixes)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    activePrefixes.has(p)
                      ? "bg-primary text-primary-foreground"
                      : "bg-blue-card-bg text-primary border border-blue-card-border hover:bg-blue-card-bg/80"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Showing {displayWords.length} words in <strong className="text-heading">{cat.name}</strong>
          </p>

          {/* Word Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {displayWords.map((w) => (
              <div key={w.word} className="rounded-xl border-l-4 border-l-green-card-border bg-card p-4 shadow-sm">
                <h4 className="font-bold text-heading">{w.word}</h4>
                <div className="mt-2 flex flex-wrap gap-1">
                  {w.prefix && (
                    <span className="rounded-full bg-blue-card-bg px-2 py-0.5 text-xs text-primary border border-blue-card-border">{w.prefix}</span>
                  )}
                  <span className="rounded-full bg-green-card-bg px-2 py-0.5 text-xs text-success border border-green-card-border">{w.root}</span>
                  {w.suffix && (
                    <span className="rounded-full bg-blue-card-bg px-2 py-0.5 text-xs text-primary border border-blue-card-border">{w.suffix}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{w.definition}</p>
                <Button
                  size="sm"
                  onClick={() => toast.success(`"${w.word}" saved to Word Bank!`)}
                  className="mt-3 gap-1 bg-success text-success-foreground hover:bg-success/90 text-xs"
                >
                  Learn <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
