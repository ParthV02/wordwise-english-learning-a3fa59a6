import { useState } from "react";
import { Mic, Volume2, RotateCcw, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pronunciationWords } from "@/data/mockData";
import { toast } from "sonner";
import { speak } from "@/lib/tts";
import SpeakingRecorder from "@/components/speaking/SpeakingRecorder";
import FluencyScore from "@/components/speaking/FluencyScore";
import TranscriptViewer from "@/components/speaking/TranscriptViewer";
import { analyzeGrammarAndVocabulary } from "@/services/nlp/grammarAnalyzer";
import { calculateFluency } from "@/services/nlp/fluencyCalculator";
import { useAuth } from "@/contexts/AuthContext";
import SearchAndPronounce from "@/components/speaking/SearchAndPronounce";
import InterviewTrainer from "@/components/interview/InterviewTrainer";

type Mode = "word" | "fluency" | "search" | "interview";
type FluencyState = "idle" | "recording" | "analyzing" | "result";

export default function PronunciationPage() {
  const { updateGrammarProfile } = useAuth();
  const [mode, setMode] = useState<Mode>("word");

  // Word Practice State
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isWordRecording, setIsWordRecording] = useState(false);
  const [hasWordResult, setHasWordResult] = useState(false);
  const [attempt, setAttempt] = useState(1);
  const word = pronunciationWords[currentIdx];
  const phonemeResults = word.phonemes.map((p, i) => ({
    phoneme: p,
    correct: i !== 1,
  }));
  const perScore = hasWordResult ? 12 : 0;

  const handleWordRecord = () => {
    setIsWordRecording(true);
    setTimeout(() => {
      setIsWordRecording(false);
      setHasWordResult(true);
      setAttempt((a) => a + 1);
    }, 2000);
  };

  const handleWordNext = () => {
    setCurrentIdx((i) => (i + 1) % pronunciationWords.length);
    setHasWordResult(false);
    setAttempt(1);
  };

  // Fluency State
  const [fluencyState, setFluencyState] = useState<FluencyState>("idle");
  const [fluencyResult, setFluencyResult] = useState<any>(null);
  const [fluencyPrompt, setFluencyPrompt] = useState("Describe your favorite childhood memory in detail.");

  const handleFluencyComplete = async (transcript: string, durationSeconds: number) => {
    if (!transcript.trim()) {
      toast.error("No speech detected.");
      setFluencyState("idle");
      return;
    }

    setFluencyState("analyzing");
    
    try {
      // Analyze with NLP
      const analysis = await analyzeGrammarAndVocabulary(transcript);
      
      // Calculate fillers
      const words = transcript.toLowerCase().match(/\b\w+\b/g) || [];
      const totalWords = words.length;
      const fillerList = ["um", "uh", "like", "you know", "actually", "basically", "i mean", "so", "well"];
      let fillerCount = 0;
      const usedFillers: string[] = [];
      
      words.forEach(w => {
        if (fillerList.includes(w)) {
          fillerCount++;
          if (!usedFillers.includes(w)) usedFillers.push(w);
        }
      });
      // also check multi-word fillers (naive)
      const transcriptLower = transcript.toLowerCase();
      ["you know", "i mean"].forEach(f => {
        const count = (transcriptLower.match(new RegExp(`\\b${f}\\b`, 'g')) || []).length;
        if (count > 0) {
          fillerCount += count;
          if (!usedFillers.includes(f)) usedFillers.push(f);
        }
      });

      const wpm = (totalWords / durationSeconds) * 60;
      
      // Calculate fluency score
      const stats = {
        durationSeconds,
        totalWords,
        wpm,
        fillers: { count: fillerCount, words: usedFillers, percentage: totalWords > 0 ? (fillerCount / totalWords) * 100 : 0 },
        clarityScore: 85 // Mocking clarity score since Web Speech API doesn't give confidence reliably across browsers
      };
      
      const fluency = calculateFluency(stats, analysis.score, analysis.vocabularyScore);
      
      // Update global grammar profile based on errors
      analysis.errors.forEach(err => {
        updateGrammarProfile(err.pattern, false);
      });

      setFluencyResult({
        ...fluency,
        transcript,
        analysis,
        stats
      });
      setFluencyState("result");
      
    } catch (error) {
      console.error(error);
      toast.error("Analysis failed. Please try again.");
      setFluencyState("idle");
    }
  };

  return (
    <div className="container py-8 space-y-8">
      <div className="rounded-xl bg-blue-card-bg p-6 border border-blue-card-border flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Pronunciation Coach</h1>
          <p className="text-muted-foreground mt-1">Practice your pronunciation and speaking fluency</p>
        </div>
        
        <div className="flex bg-background p-1 rounded-lg border border-border shrink-0">
          <button 
            onClick={() => setMode("word")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${mode === "word" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
          >
            Word Practice
          </button>
          <button 
            onClick={() => setMode("search")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${mode === "search" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
          >
            Search & Pronounce
          </button>
          <button 
            onClick={() => setMode("fluency")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${mode === "fluency" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
          >
            Speaking Fluency
          </button>
          <button 
            onClick={() => setMode("interview")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${mode === "interview" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
          >
            Interview Prep
          </button>
        </div>
      </div>

      {mode === "search" && <SearchAndPronounce />}
      {mode === "interview" && <InterviewTrainer />}

      {mode === "word" && (
        <div className="mx-auto max-w-lg space-y-6 text-center fade-in">
          <div>
            <h2 className="text-4xl font-bold text-heading">{word.word}</h2>
            <p className="mt-2 font-mono text-muted-foreground">{word.ipa}</p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleWordRecord}
              disabled={isWordRecording}
              className={`flex h-28 w-28 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all ${
                isWordRecording ? "pulse-ring scale-110" : "hover:scale-105 hover:shadow-lg"
              }`}
            >
              <Mic className="h-10 w-10" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            {isWordRecording ? "Listening..." : "Tap the mic and say the word"}
          </p>

          {hasWordResult && (
            <div className="space-y-4 fade-in">
              <p className="text-sm font-medium text-heading">Phoneme Breakdown</p>
              <div className="flex justify-center gap-2">
                {phonemeResults.map((p, i) => (
                  <div
                    key={i}
                    className={`rounded-lg px-4 py-2 text-sm font-mono font-semibold ${
                      p.correct
                        ? "bg-green-card-bg text-success border border-green-card-border"
                        : "bg-destructive/10 text-destructive border border-destructive/30"
                    }`}
                  >
                    {p.phoneme}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-4">
                <span className="rounded-full bg-blue-card-bg px-3 py-1 text-xs font-medium text-primary border border-blue-card-border">
                  Attempt {attempt - 1} of 5
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  perScore < 15
                    ? "bg-green-card-bg text-success border border-green-card-border"
                    : "bg-destructive/10 text-destructive border border-destructive/30"
                }`}>
                  PER: {perScore}%
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Button variant="outline" onClick={() => speak(word.word)} className="gap-2 border-primary text-primary hover:bg-primary/5">
              <Volume2 className="h-4 w-4" /> Hear Correct Pronunciation
            </Button>
            {hasWordResult && (
              <>
                <Button variant="outline" onClick={handleWordNext} className="gap-2 border-primary text-primary hover:bg-primary/5">
                  <RotateCcw className="h-4 w-4" /> Try Another Word
                </Button>
                <Button onClick={() => toast.success("Word saved to bank!")} className="gap-2 bg-success text-success-foreground hover:bg-success/90">
                  <Save className="h-4 w-4" /> Save to Word Bank
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {mode === "fluency" && (
        <div className="mx-auto max-w-4xl space-y-8 fade-in">
          {fluencyState === "idle" && (
            <div className="flex flex-col items-center">
              <SpeakingRecorder 
                promptText={fluencyPrompt}
                onRecordingComplete={handleFluencyComplete} 
              />
              <div className="mt-8 flex gap-3">
                <Button variant="outline" onClick={() => setFluencyPrompt("Talk about your favorite travel destination and why you love it.")}>
                  Change Topic
                </Button>
              </div>
            </div>
          )}

          {fluencyState === "analyzing" && (
            <div className="flex flex-col items-center justify-center py-20 space-y-6">
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-heading">Analyzing your speech</h3>
                <p className="text-muted-foreground">Evaluating pacing, grammar, vocabulary, and clarity...</p>
              </div>
            </div>
          )}

          {fluencyState === "result" && fluencyResult && (
            <div className="space-y-8 fade-in">
              <FluencyScore 
                score={fluencyResult.score}
                rating={fluencyResult.rating}
                breakdown={fluencyResult.breakdown}
                recommendations={[
                  ...fluencyResult.analysis.errors.map((e: any) => `Practice ${e.pattern.replace(/_/g, ' ')}`),
                  fluencyResult.stats.fillers.percentage > 3 ? "Try to pause silently instead of using filler words" : "Good pacing",
                  fluencyResult.breakdown.vocabulary < 70 ? "Try to use a wider variety of vocabulary" : "Great vocabulary usage"
                ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3)}
                onRetry={() => setFluencyState("idle")}
              />
              
              <TranscriptViewer 
                transcript={fluencyResult.transcript}
                errors={fluencyResult.analysis.errors}
                fillerWords={fluencyResult.stats.fillers.words}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
