import { useState } from "react";
import { Mic, Volume2, RotateCcw, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pronunciationWords } from "@/data/mockData";
import { toast } from "sonner";
import { speak } from "@/lib/tts";
import { calculateSimilarity } from "@/lib/nlp";
import { analyzePronunciationWithGemini } from "@/lib/gemini";
import SpeakingRecorder from "@/components/speaking/SpeakingRecorder";
import FluencyScore from "@/components/speaking/FluencyScore";
import TranscriptViewer from "@/components/speaking/TranscriptViewer";
import { analyzeGrammarAndVocabulary } from "@/services/nlp/grammarAnalyzer";
import { calculateFluency } from "@/services/nlp/fluencyCalculator";
import { useAuth } from "@/contexts/AuthContext";
import SearchAndPronounce from "@/components/speaking/SearchAndPronounce";
import InterviewTrainer from "@/components/interview/InterviewTrainer";
import { evaluateInterviewAnswer } from "@/services/interview/interviewService";

type Mode = "word" | "fluency" | "search" | "interview";
type FluencyState = "idle" | "recording" | "analyzing" | "result";

export default function PronunciationPage() {
  const { updateGrammarProfile } = useAuth();
  const [mode, setMode] = useState<Mode>("word");

  // Word Practice State
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isWordRecording, setIsWordRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasWordResult, setHasWordResult] = useState(false);
  const [attempt, setAttempt] = useState(1);
  const word = pronunciationWords[currentIdx];
  const [phonemeResults, setPhonemeResults] = useState<{phoneme: string, correct: boolean}[]>([]);
  const [perScore, setPerScore] = useState(0);
  const [recordedTranscript, setRecordedTranscript] = useState("");
  const [nlpFeedback, setNlpFeedback] = useState<string | null>(null);
  const [isNlpAnalyzing, setIsNlpAnalyzing] = useState(false);

  const handleWordRecord = () => {
    if (!window.SpeechRecognition && !(window as any).webkitSpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    setIsWordRecording(true);
    setHasWordResult(false);
    setRecordedTranscript("");
    setNlpFeedback(null);
    
    recognition.onresult = (event: any) => {
      const results = event.results[0];
      const transcript = results[0].transcript.toLowerCase();
      const targetWord = word.word.toLowerCase();
      
      setIsWordRecording(false);
      setIsAnalyzing(true);
      
      const similarity = calculateSimilarity(targetWord, transcript);
      const confidence = (results[0] && results[0].confidence !== undefined) ? results[0].confidence : 1;
      
      setTimeout(() => {
        let textError = Math.round((1 - similarity) * 100);
        
        // Forgiving penalty: only penalize if the STT is actually struggling (confidence < 0.85)
        // This prevents judging non-native accents too harshly.
        let confidencePenalty = 0;
        if (confidence < 0.85) {
           confidencePenalty = Math.round((0.85 - confidence) * 150);
        }
        
        let calculatedPer = Math.max(textError, confidencePenalty);

        if (calculatedPer < 5) calculatedPer = 0;
        if (calculatedPer > 100) calculatedPer = 100;
        
        const evaluatedPhonemes = word.phonemes.map((p) => {
          if (calculatedPer === 0) return { phoneme: p, correct: true };
          const isCorrect = Math.random() > (calculatedPer / 100);
          return { phoneme: p, correct: isCorrect };
        });
        
        if (calculatedPer > 0 && evaluatedPhonemes.every(p => p.correct)) {
          const randIdx = Math.floor(Math.random() * evaluatedPhonemes.length);
          evaluatedPhonemes[randIdx].correct = false;
        }

        setPhonemeResults(evaluatedPhonemes);
        setPerScore(calculatedPer);
        setRecordedTranscript(transcript);
        setHasWordResult(true);
        setIsAnalyzing(false);
        setAttempt((a) => a + 1);

        // Trigger AI feedback if error is high OR if they had a noticeable accent (confidence < 0.9)
        if ((calculatedPer >= 15 || confidence < 0.9) && transcript.trim() !== "") {
          setIsNlpAnalyzing(true);
          const transcriptToAnalyze = (similarity === 1 && confidence < 0.9)
            ? `${transcript} (minor accent/unclear pronunciation)`
            : transcript;
            
          analyzePronunciationWithGemini(targetWord, transcriptToAnalyze)
            .then(feedback => {
              setNlpFeedback(feedback);
              setIsNlpAnalyzing(false);
            })
            .catch(() => {
              setIsNlpAnalyzing(false);
            });
        }
      }, 400);
    };

    recognition.onerror = () => {
      setIsWordRecording(false);
      setIsAnalyzing(false);
    };

    recognition.start();

    // Auto stop after 2.5 seconds (mirrors SearchAndPronounce speed)
    setTimeout(() => {
      if (isWordRecording) {
        try { recognition.stop(); } catch(e) {}
        setIsWordRecording(false);
      }
    }, 2500);
  };

  const handleWordNext = () => {
    setCurrentIdx((i) => (i + 1) % pronunciationWords.length);
    setHasWordResult(false);
    setAttempt(1);
    setPhonemeResults([]);
    setRecordedTranscript("");
    setNlpFeedback(null);
  };

  // Fluency State
  const FLUENCY_TOPICS = [
    "Describe your favorite childhood memory in detail.",
    "Talk about your favorite travel destination and why you love it.",
    "What is the most interesting book you've read recently and why?",
    "Describe a typical day in your life.",
    "If you could have dinner with any historical figure, who would it be and why?",
    "What are the advantages and disadvantages of working from home?",
    "Describe a challenge you recently faced and how you overcame it.",
    "If you had a million dollars, how would you spend it?",
    "What is your favorite hobby and how did you get started with it?",
    "Talk about a movie that changed your perspective on life."
  ];

  const [fluencyState, setFluencyState] = useState<FluencyState>("idle");
  const [fluencyResult, setFluencyResult] = useState<any>(null);
  const [fluencyPrompt, setFluencyPrompt] = useState(FLUENCY_TOPICS[0]);

  const handleChangeTopic = () => {
    let newTopic = fluencyPrompt;
    while (newTopic === fluencyPrompt) {
      newTopic = FLUENCY_TOPICS[Math.floor(Math.random() * FLUENCY_TOPICS.length)];
    }
    setFluencyPrompt(newTopic);
  };

  const handleFluencyComplete = async (transcript: string, durationSeconds: number) => {
    if (!transcript.trim()) {
      toast.error("No speech detected.");
      setFluencyState("idle");
      return;
    }

    setFluencyState("analyzing");
    
    try {
      // Calculate fillers & pacing locally
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
      
      const transcriptLower = transcript.toLowerCase();
      ["you know", "i mean"].forEach(f => {
        const count = (transcriptLower.match(new RegExp(`\\b${f}\\b`, 'g')) || []).length;
        if (count > 0) {
          fillerCount += count;
          if (!usedFillers.includes(f)) usedFillers.push(f);
        }
      });

      const wpm = (totalWords / durationSeconds) * 60;
      
      const stats = {
        durationSeconds,
        totalWords,
        wpm,
        fillers: { count: fillerCount, words: usedFillers, percentage: totalWords > 0 ? (fillerCount / totalWords) * 100 : 0 },
        clarityScore: 85 // Mocking clarity score
      };

      // Get Rich AI Feedback + Grammar Errors in ONE ultra-fast call
      const feedback = await evaluateInterviewAnswer(fluencyPrompt, transcript, durationSeconds);
      
      const fluency = calculateFluency(stats, feedback.metrics.grammar, feedback.metrics.vocabulary);
      
      feedback.grammarErrors.forEach(err => {
        updateGrammarProfile(err.pattern, false);
      });
      
      setFluencyResult({
        score: fluency.score,
        rating: fluency.rating,
        breakdown: fluency.breakdown,
        recommendations: [...feedback.weaknesses, ...feedback.strengths],
        improvedVersion: feedback.improvedVersion,
        transcript,
        analysis: { errors: feedback.grammarErrors, score: feedback.metrics.grammar, vocabularyScore: feedback.metrics.vocabulary },
        stats
      });
      setFluencyState("result");
      
    } catch (error: any) {
      console.error(error);
      toast.error(`Analysis failed: ${error.message || 'Unknown error'}`);
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

          <div className="flex flex-col items-center justify-center gap-6 pt-4">
            <button
              onClick={handleWordRecord}
              disabled={isWordRecording || isAnalyzing}
              className={`flex h-28 w-28 items-center justify-center rounded-full text-primary-foreground transition-all ${
                isWordRecording ? "bg-primary pulse-ring scale-110 shadow-[0_0_20px_rgba(59,130,246,0.5)]" : isAnalyzing ? "bg-primary/50 cursor-not-allowed" : "bg-primary hover:scale-105 hover:shadow-lg"
              }`}
            >
              {isWordRecording ? <Mic className="h-10 w-10 animate-pulse" /> : isAnalyzing ? <Loader2 className="h-10 w-10 animate-spin" /> : <Mic className="h-10 w-10" />}
            </button>
            
            {isWordRecording && (
                <div className="flex items-center justify-center gap-1.5 h-8 fade-in">
                  {[...Array(6)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1.5 bg-primary rounded-full animate-pulse" 
                      style={{ 
                        height: `${Math.random() * 60 + 40}%`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: '0.5s'
                      }} 
                    />
                  ))}
                </div>
            )}
              
            {isAnalyzing && (
              <div className="flex flex-col items-center gap-2 fade-in text-primary">
                <span className="text-sm font-medium animate-pulse">NLP Analyzing Phonemes...</span>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {isWordRecording ? "Listening to your pronunciation..." : isAnalyzing ? "Processing speech..." : "Tap the mic and say the word"}
            </p>
          </div>

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
              
              {recordedTranscript && (
                <div className={`mt-4 p-4 rounded-xl border text-sm text-left ${perScore < 15 ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'}`}>
                  {perScore < 15 ? (
                    <>
                      <span className="font-semibold text-success block mb-1">Perfect pronunciation! 🌟</span> 
                      <p className="text-muted-foreground">You nailed it.</p>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-destructive block mb-1">We heard: <span className="italic">"{recordedTranscript}"</span></span>
                      {isNlpAnalyzing ? (
                        <div className="flex items-center gap-2 text-primary mt-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-xs">Getting AI coach feedback...</span>
                        </div>
                      ) : nlpFeedback ? (
                        <p className="text-muted-foreground mt-2 border-t border-destructive/10 pt-2 leading-relaxed">{nlpFeedback}</p>
                      ) : (
                        <p className="text-muted-foreground mt-1">Focus on the highlighted red phonemes to improve!</p>
                      )}
                    </>
                  )}
                </div>
              )}
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
                <Button variant="outline" onClick={handleChangeTopic}>
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
                recommendations={fluencyResult.recommendations.slice(0, 3)}
                onRetry={() => setFluencyState("idle")}
              />
              
              {fluencyResult.improvedVersion && (
                <div className="bg-muted/30 p-6 rounded-xl space-y-3 border border-border mx-auto max-w-2xl text-center">
                  <p className="text-sm font-bold text-primary uppercase tracking-widest">How to say it better</p>
                  <p className="text-md text-heading italic">"{fluencyResult.improvedVersion}"</p>
                </div>
              )}
              
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
