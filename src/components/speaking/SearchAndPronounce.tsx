import { useState } from "react";
import { Search, Volume2, Mic, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { searchWord } from "@/lib/dictionary";
import { toast } from "sonner";
import { speak } from "@/lib/tts";

export default function SearchAndPronounce() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [practiceResult, setPracticeResult] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setResult(null);
    setPracticeResult(null);
    setHasRecorded(false);
    
    try {
      const data = await searchWord(query);
      setResult(data);
    } catch (err: any) {
      toast.error(err.message || "Word not found.");
    } finally {
      setLoading(false);
    }
  };

  const handleListen = () => {
    if (result) {
      if (result.audioUrl) {
        const audio = new Audio(result.audioUrl);
        audio.play().catch(() => speak(result.word));
      } else {
        speak(result.word);
      }
    }
  };

  const handlePracticeRecord = () => {
    if (!window.SpeechRecognition && !(window as any).webkitSpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    setIsRecording(true);
    setHasRecorded(false);

    recognition.onresult = (event: any) => {
      let matched = false;
      const targetWord = result.word.toLowerCase();
      const results = event.results[0];
      
      for (let i = 0; i < results.length; i++) {
        if (results[i].transcript.toLowerCase().includes(targetWord)) {
          matched = true;
          break;
        }
      }

      setPracticeResult({
        matched,
        confidence: results[0].confidence,
        transcript: results[0].transcript
      });
      setIsRecording(false);
      setHasRecorded(true);
    };

    recognition.onerror = () => {
      setIsRecording(false);
      toast.error("Could not record properly. Please try again.");
    };

    recognition.start();
    
    // Auto stop after 4 seconds
    setTimeout(() => {
      if (isRecording) {
        recognition.stop();
        setIsRecording(false);
      }
    }, 4000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 fade-in">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any English word..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-heading focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
          />
        </div>
        <Button type="submit" disabled={loading} className="py-3 h-auto px-6 rounded-xl shadow-sm">
          {loading ? "Searching..." : "Search"}
        </Button>
      </form>

      {result && (
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-8 fade-in">
          <div className="text-center space-y-3">
            <h2 className="text-4xl font-bold text-heading">{result.word}</h2>
            {result.phonetic && <p className="font-mono text-muted-foreground text-lg">{result.phonetic}</p>}
            <Button onClick={handleListen} size="lg" className="mt-2 px-8 rounded-full shadow-md hover:scale-105 transition-transform">
              <Volume2 className="h-5 w-5 mr-2" /> Listen
            </Button>
          </div>

          <div className="bg-muted/30 p-6 rounded-xl border border-border space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary mb-1 block">Definition</span>
              <p className="text-body font-medium">{result.definition}</p>
            </div>
            {result.example && (
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-primary mb-1 block">Example</span>
                <p className="text-muted-foreground italic">"{result.example}"</p>
              </div>
            )}
          </div>

          <div className="border-t border-border pt-8 text-center space-y-6">
            <div>
              <h3 className="text-xl font-bold text-heading">Practice this word</h3>
              <p className="text-muted-foreground text-sm mt-1">Tap the mic and repeat the word clearly.</p>
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={handlePracticeRecord}
                disabled={isRecording}
                className={`flex h-20 w-20 items-center justify-center rounded-full transition-all ${
                  isRecording 
                    ? "bg-destructive text-destructive-foreground pulse-ring scale-110" 
                    : "bg-primary text-primary-foreground hover:scale-105 hover:shadow-lg"
                }`}
              >
                {isRecording ? <Square className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
              </button>
            </div>

            {hasRecorded && practiceResult && (
              <div className="fade-in max-w-sm mx-auto bg-background p-4 rounded-xl border border-border space-y-3 shadow-sm">
                <div className={`text-lg font-bold ${practiceResult.matched ? 'text-success' : 'text-destructive'}`}>
                  {practiceResult.matched ? "Great pronunciation! 🌟" : "Needs a bit of practice. 💪"}
                </div>
                {!practiceResult.matched && (
                  <p className="text-sm text-muted-foreground">
                    Heard: <span className="italic">"{practiceResult.transcript}"</span>
                  </p>
                )}
                <Button variant="outline" size="sm" onClick={() => setHasRecorded(false)} className="w-full">
                  <RotateCcw className="h-4 w-4 mr-2" /> Try Again
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
