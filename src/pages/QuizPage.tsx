import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, RotateCcw, Newspaper, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { quizQuestions as defaultQuizQuestions } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { generateQuizFromWords } from "@/lib/gemini";

interface Question {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export default function QuizPage() {
  const { user, updateUser } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [finished, setFinished] = useState(false);

  const wordBank = user?.wordBank ?? [];
  const wordBankCount = wordBank.length;

  const fetchDynamicQuiz = useCallback(async () => {
    if (wordBankCount < 5) return;
    
    setLoading(true);
    try {
      const words = wordBank.map((w: any) => typeof w === "string" ? w : w.word);
      // Shuffle and pick 10 words or just take all if few
      const shuffledWords = [...words].sort(() => 0.5 - Math.random()).slice(0, 15);
      const generatedQuestions = await generateQuizFromWords(shuffledWords);
      setQuestions(generatedQuestions);
    } catch (error) {
      console.error("Failed to fetch dynamic quiz:", error);
      toast.error("Cloud not generate personalized quiz. Using standard questions.");
      setQuestions(defaultQuizQuestions);
    } finally {
      setLoading(false);
    }
  }, [wordBankCount, wordBank]);

  useEffect(() => {
    if (wordBankCount >= 5 && questions.length === 0 && !loading) {
      fetchDynamicQuiz();
    }
  }, [wordBankCount, questions.length, loading, fetchDynamicQuiz]);

  const handleRestart = () => {
    setQuestions([]); // Clear questions to trigger loading animation for fresh generation
    setCurrentQ(0);
    setSelected(null);
    setAnswers([]);
    setFinished(false);
    fetchDynamicQuiz();
  };

  if (wordBankCount < 5) {
    return (
      <div className="container py-16 text-center space-y-4 fade-in">
        <Newspaper className="mx-auto h-16 w-16 text-success/30" />
        <h2 className="text-xl font-bold text-heading">Not enough words yet</h2>
        <p className="text-muted-foreground">You need at least 5 words in your word bank to take a personalized quiz.</p>
        <Link to="/news">
          <Button className="mt-2 bg-success text-success-foreground hover:bg-success/90">Go to News Reader</Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container py-32 flex flex-col items-center justify-center space-y-6 fade-in">
        <div className="relative">
          <div className="absolute -inset-4 rounded-full bg-primary/20 animate-ping" />
          <Sparkles className="h-16 w-16 text-primary animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-heading">Analyzing Your Word Bank...</h2>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> 
            AI is crafting your personalized vocabulary quiz
          </p>
        </div>
      </div>
    );
  }

  const currentQuestions = questions.length > 0 ? questions : defaultQuizQuestions;
  const question = currentQuestions[currentQ];
  const progress = ((currentQ + (selected !== null ? 1 : 0)) / currentQuestions.length) * 100;

  const handleSelect = (idx: number) => { if (selected !== null) return; setSelected(idx); };

  const handleNext = () => {
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);
    if (currentQ + 1 >= currentQuestions.length) {
      setFinished(true);
      const correct = newAnswers.filter((a, i) => a === currentQuestions[i].correct).length;
      const score = Math.round((correct / currentQuestions.length) * 100);
      if (user) {
        updateUser({
          weeklyQuizScore: score,
          quizHistory: [...(user.quizHistory || []), score],
        });
      }
      toast.info("Quiz submitted!");
    } else {
      setCurrentQ((c) => c + 1);
    }
  };

  const correctCount = answers.filter((a, i) => a === currentQuestions[i].correct).length;
  const scorePercent = Math.round((correctCount / currentQuestions.length) * 100);

  if (finished) {
    return (
      <div className="container py-8 max-w-2xl space-y-8 fade-in">
        <div className="text-center space-y-6">
          <h1 className="text-2xl font-bold text-heading">Quiz Complete!</h1>
          <div className="mx-auto relative h-40 w-40">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" strokeWidth="8" className="stroke-border" />
              <circle cx="50" cy="50" r="45" fill="none" strokeWidth="8" strokeDasharray={`${scorePercent * 2.83} 283`} className="stroke-primary transition-all duration-1000" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-heading">{scorePercent}%</span>
            </div>
          </div>
          <div className="flex justify-center gap-6">
            <div className="text-center"><p className="text-2xl font-bold text-primary">{correctCount}</p><p className="text-sm text-muted-foreground">Correct</p></div>
            <div className="text-center"><p className="text-2xl font-bold text-destructive">{currentQuestions.length - correctCount}</p><p className="text-sm text-muted-foreground">Incorrect</p></div>
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="font-semibold text-heading">Review</h3>
          {currentQuestions.map((q, i) => {
            if (answers[i] === q.correct) return null;
            return (
              <div key={q.id} className="rounded-xl bg-card p-4 shadow-sm border border-border">
                <p className="font-medium text-heading">{q.question}</p>
                <p className="mt-1 text-sm text-success">Correct: {q.options[q.correct]}</p>
                <p className="mt-1 text-xs text-muted-foreground">{q.explanation}</p>
              </div>
            );
          })}
        </div>
        <div className="text-center">
          <Button onClick={handleRestart} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <RotateCcw className="h-4 w-4" /> New AI Quiz
          </Button>
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="container py-8 max-w-2xl space-y-8">
      <div className="flex flex-col gap-1 border-b border-border pb-4">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">AI Powered Learning</span>
        </div>
        <h1 className="text-3xl font-bold text-heading tracking-tight">Personalized Quiz</h1>
        <p className="text-muted-foreground text-sm">Reviewing ${wordBankCount} words from your collection</p>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Question {currentQ + 1} of {currentQuestions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div className="h-2 rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="rounded-xl bg-card p-8 shadow-md border border-border fade-in" key={currentQ}>
        <h2 className="text-xl font-bold text-heading mb-6">{question.question}</h2>
        <div className="space-y-3">
          {question.options.map((opt, i) => {
            let classes = "w-full rounded-lg border border-border bg-card p-4 text-left font-medium text-heading transition-all hover:bg-blue-card-bg";
            if (selected !== null) {
              if (i === question.correct) classes = "w-full rounded-lg border-2 border-green-card-border bg-green-card-bg p-4 text-left font-medium text-success";
              else if (i === selected) classes = "w-full rounded-lg border-2 border-destructive bg-destructive/5 p-4 text-left font-medium text-destructive";
            }
            return (
              <button key={i} onClick={() => handleSelect(i)} className={classes}>
                <div className="flex items-center justify-between">
                  <span>{opt}</span>
                  {selected !== null && i === question.correct && <CheckCircle2 className="h-5 w-5 text-success" />}
                  {selected !== null && i === selected && i !== question.correct && <XCircle className="h-5 w-5 text-destructive" />}
                </div>
              </button>
            );
          })}
        </div>
        {selected !== null && (
          <div className="mt-4 fade-in">
            <p className="text-sm text-muted-foreground mb-3">{question.explanation}</p>
            <Button onClick={handleNext} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {currentQ + 1 >= currentQuestions.length ? "See Results" : "Next Question"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

