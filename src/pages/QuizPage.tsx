import { useState } from "react";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { quizQuestions } from "@/data/mockData";

export default function QuizPage() {
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [finished, setFinished] = useState(false);

  const question = quizQuestions[currentQ];
  const progress = ((currentQ + (selected !== null ? 1 : 0)) / quizQuestions.length) * 100;

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
  };

  const handleNext = () => {
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);
    if (currentQ + 1 >= quizQuestions.length) {
      setFinished(true);
    } else {
      setCurrentQ((c) => c + 1);
    }
  };

  const correctCount = answers.filter((a, i) => a === quizQuestions[i].correct).length;
  const scorePercent = Math.round((correctCount / quizQuestions.length) * 100);

  const handleRestart = () => {
    setCurrentQ(0);
    setSelected(null);
    setAnswers([]);
    setFinished(false);
  };

  if (finished) {
    return (
      <div className="container py-8 max-w-2xl space-y-8 fade-in">
        <div className="text-center space-y-6">
          <h1 className="text-2xl font-bold text-heading">Quiz Complete!</h1>

          {/* Score Circle */}
          <div className="mx-auto relative h-40 w-40">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" strokeWidth="8" className="stroke-border" />
              <circle
                cx="50" cy="50" r="45" fill="none" strokeWidth="8"
                strokeDasharray={`${scorePercent * 2.83} 283`}
                className="stroke-primary transition-all duration-1000"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-heading">{scorePercent}%</span>
            </div>
          </div>

          <div className="flex justify-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{correctCount}</p>
              <p className="text-sm text-muted-foreground">Correct</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">{quizQuestions.length - correctCount}</p>
              <p className="text-sm text-muted-foreground">Incorrect</p>
            </div>
          </div>
        </div>

        {/* Missed words review */}
        <div className="space-y-3">
          <h3 className="font-semibold text-heading">Review Missed Questions</h3>
          {quizQuestions.map((q, i) => {
            if (answers[i] === q.correct) return null;
            return (
              <div key={q.id} className="rounded-xl bg-card p-4 shadow-sm border border-border">
                <p className="font-medium text-heading">{q.question}</p>
                <p className="mt-1 text-sm text-success">Correct: {q.options[q.correct]}</p>
                <p className="mt-1 text-xs text-muted-foreground">{q.explanation}</p>
                <Button size="sm" className="mt-2 bg-success text-success-foreground hover:bg-success/90 text-xs">Review</Button>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <Button onClick={handleRestart} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <RotateCcw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-2xl space-y-8">
      <div className="rounded-xl bg-green-card-bg p-6 border border-green-card-border">
        <h1 className="text-2xl font-bold text-success">Weekly Quiz</h1>
        <p className="text-muted-foreground mt-1">Test your vocabulary knowledge</p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Question {currentQ + 1} of {quizQuestions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div className="h-2 rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question Card */}
      <div className="rounded-xl bg-card p-8 shadow-md border border-border fade-in" key={currentQ}>
        <h2 className="text-xl font-bold text-heading mb-6">{question.question}</h2>
        <div className="space-y-3">
          {question.options.map((opt, i) => {
            let classes = "w-full rounded-lg border border-border bg-card p-4 text-left font-medium text-heading transition-all hover:bg-blue-card-bg";
            if (selected !== null) {
              if (i === question.correct) {
                classes = "w-full rounded-lg border-2 border-green-card-border bg-green-card-bg p-4 text-left font-medium text-success";
              } else if (i === selected) {
                classes = "w-full rounded-lg border-2 border-destructive bg-destructive/5 p-4 text-left font-medium text-destructive";
              }
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
              {currentQ + 1 >= quizQuestions.length ? "See Results" : "Next Question"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
