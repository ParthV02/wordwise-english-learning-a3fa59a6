export interface InterviewQuestion {
  id: string;
  question: string;
  context?: string;
}

export interface InterviewAnswerFeedback {
  score: number; // 0-100
  rating: string;
  strengths: string[];
  weaknesses: string[];
  improvedVersion: string;
  metrics: {
    pronunciation: number;
    clarity: number;
    grammar: number;
    vocabulary: number;
    pacing: number;
    relevance: number;
    fillers: number; // Percentage
  };
}

export async function generateInterviewQuestions(type: string, difficulty: string): Promise<InterviewQuestion[]> {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error("Gemini API key is not configured");

  const prompt = `You are an expert HR manager and technical interviewer.
Generate 5 engaging interview questions for a candidate practicing their English.

Interview Type: ${type}
Difficulty Level: ${difficulty}

Return ONLY a JSON array of objects with this schema:
[
  {
    "id": "q1",
    "question": "The interview question",
    "context": "Optional short hint or context on what the interviewer is looking for"
  }
]`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });

  if (!response.ok) throw new Error("Failed to generate questions");
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No content returned");

  return JSON.parse(text);
}

export async function evaluateInterviewAnswer(
  question: string,
  answerTranscript: string,
  durationSeconds: number
): Promise<InterviewAnswerFeedback> {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error("Gemini API key is not configured");

  // Calculate naive pacing and fillers before sending to LLM for rich feedback
  const words = answerTranscript.toLowerCase().match(/\b\w+\b/g) || [];
  const totalWords = words.length;
  const fillerList = ["um", "uh", "like", "you know", "actually", "basically", "i mean", "so", "well"];
  let fillerCount = 0;
  words.forEach(w => {
    if (fillerList.includes(w)) fillerCount++;
  });
  const fillerPercentage = totalWords > 0 ? (fillerCount / totalWords) * 100 : 0;
  const wpm = (totalWords / Math.max(1, durationSeconds)) * 60;

  const prompt = `You are an expert interview coach evaluating an English learner's spoken response.
  
Question asked: "${question}"
Candidate's spoken answer: "${answerTranscript}"

Analyze the response for:
1. Relevance (Did they answer the question?)
2. Grammar & Vocabulary
3. Clarity and Professionalism

Return ONLY a JSON object matching this schema:
{
  "rating": "NICE!" | "GOOD" | "NEEDS WORK" | "EXCELLENT",
  "strengths": string[] (3 short bullet points about what they did well),
  "weaknesses": string[] (3 short bullet points to improve),
  "improvedVersion": "A better, more professional way to phrase their answer",
  "metrics": {
    "grammar": number (0-100),
    "vocabulary": number (0-100),
    "relevance": number (0-100),
    "clarity": number (0-100)
  }
}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });

  if (!response.ok) throw new Error("Failed to evaluate answer");
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No content returned");

  const parsed = JSON.parse(text);

  // Approximate pronunciation score based on clarity for now, since we only have transcript
  const pronunciation = parsed.metrics.clarity - 5; 
  // Pacing score
  let pacingScore = 100;
  if (wpm < 100) pacingScore -= (100 - wpm);
  if (wpm > 160) pacingScore -= (wpm - 160);

  // Overall Score weighting
  const score = Math.round(
    (parsed.metrics.relevance * 0.3) +
    (parsed.metrics.grammar * 0.2) +
    (parsed.metrics.vocabulary * 0.2) +
    (parsed.metrics.clarity * 0.15) +
    (Math.max(0, 100 - fillerPercentage * 5) * 0.15)
  );

  return {
    score,
    rating: parsed.rating || "GOOD",
    strengths: parsed.strengths || [],
    weaknesses: parsed.weaknesses || [],
    improvedVersion: parsed.improvedVersion || "",
    metrics: {
      ...parsed.metrics,
      pronunciation: Math.max(0, pronunciation),
      pacing: Math.max(0, Math.min(100, pacingScore)),
      fillers: fillerPercentage
    }
  };
}
