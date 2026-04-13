import { useState } from "react";
import { Mic, Volume2, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pronunciationWords } from "@/data/mockData";
import { toast } from "sonner";
import { speak } from "@/lib/tts";

export default function PronunciationPage() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [attempt, setAttempt] = useState(1);

  const word = pronunciationWords[currentIdx];

  // Simulate phoneme results
  const phonemeResults = word.phonemes.map((p, i) => ({
    phoneme: p,
    correct: i !== 1, // simulate one wrong
  }));

  const perScore = hasResult ? 12 : 0;

  const handleRecord = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      setHasResult(true);
      setAttempt((a) => a + 1);
    }, 2000);
  };

  const handleNext = () => {
    setCurrentIdx((i) => (i + 1) % pronunciationWords.length);
    setHasResult(false);
    setAttempt(1);
  };

  return (
    <div className="container py-8 space-y-8">
      <div className="rounded-xl bg-blue-card-bg p-6 border border-blue-card-border">
        <h1 className="text-2xl font-bold text-primary">Pronunciation Coach</h1>
        <p className="text-muted-foreground mt-1">Practice your pronunciation with instant feedback</p>
      </div>

      <div className="mx-auto max-w-lg space-y-6 text-center">
        <div>
          <h2 className="text-4xl font-bold text-heading">{word.word}</h2>
          <p className="mt-2 font-mono text-muted-foreground">{word.ipa}</p>
        </div>

        {/* Mic Button */}
        <div className="flex justify-center">
          <button
            onClick={handleRecord}
            disabled={isRecording}
            className={`flex h-28 w-28 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all ${
              isRecording ? "pulse-ring scale-110" : "hover:scale-105 hover:shadow-lg"
            }`}
          >
            <Mic className="h-10 w-10" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          {isRecording ? "Listening..." : "Tap the mic and say the word"}
        </p>

        {/* Phoneme Breakdown */}
        {hasResult && (
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

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-3 pt-4">
          <Button variant="outline" onClick={() => speak(word.word)} className="gap-2 border-primary text-primary hover:bg-primary/5">
            <Volume2 className="h-4 w-4" /> Hear Correct Pronunciation
          </Button>
          {hasResult && (
            <>
              <Button variant="outline" onClick={handleNext} className="gap-2 border-primary text-primary hover:bg-primary/5">
                <RotateCcw className="h-4 w-4" /> Try Another Word
              </Button>
              <Button onClick={() => toast.success("Word saved to bank!")} className="gap-2 bg-success text-success-foreground hover:bg-success/90">
                <Save className="h-4 w-4" /> Save to Word Bank
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
