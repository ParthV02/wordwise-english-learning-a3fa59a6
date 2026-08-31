import { fetchWithRetry } from "@/lib/gemini";

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
  grammarErrors: {
    type: string;
    pattern: string;
    original: string;
    correction: string;
    explanation: string;
    severity: "low" | "medium" | "high";
    confidence: number;
  }[];
}

import { interviewQuestions } from "@/data/interviewQuestions";

export async function generateInterviewQuestions(type: string, difficulty: string): Promise<InterviewQuestion[]> {
  // Map UI difficulty string to our structured data keys
  let levelKey = "intermediate"; // default
  const diffLower = difficulty.toLowerCase();
  if (diffLower.includes("beginner") || diffLower.includes("a2")) {
    levelKey = "beginner";
  } else if (diffLower.includes("advanced") || diffLower.includes("c1")) {
    levelKey = "advanced";
  }

  const questions = interviewQuestions[levelKey] || interviewQuestions["intermediate"];

  // Return the mapped questions
  return questions.map((q) => ({
    id: `q_${levelKey}_${q.order}`,
    question: q.question,
    context: q.context
  }));
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
  },
  "grammarErrors": [
    {
      "type": "TENSE" | "PREPOSITION" | "ARTICLE" | "SUBJECT_VERB_AGREEMENT" | "WORD_ORDER" | "VERB_FORM" | "SINGULAR_PLURAL",
      "pattern": "simple_past" | "present_perfect" | "in_on_at" | "etc",
      "original": "the exact incorrect phrase from the transcript",
      "correction": "the corrected phrase",
      "explanation": "Short, friendly explanation of the rule",
      "severity": "low" | "medium" | "high",
      "confidence": number (0-1)
    }
  ]
}`;

  const models = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest"];
  let parsed: any = null;
  let lastError = new Error("Failed to evaluate answer");

  for (const model of models) {
    try {
      const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!response.ok) throw new Error(`Model ${model} returned ${response.status}`);
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("No content returned");

      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanText);
      break; // Success! Break out of the fallback loop
    } catch (e: any) {
      console.warn(`Model ${model} failed: ${e.message}`);
      lastError = e;
    }
  }

  if (!parsed) {
    throw lastError;
  }

  
  // Safe defaults if Gemini hallucinates the schema
  const metrics = parsed.metrics || {
    clarity: 80,
    relevance: 80,
    grammar: 80,
    vocabulary: 80
  };

  // Approximate pronunciation score based on clarity for now, since we only have transcript
  const pronunciation = metrics.clarity - 5; 
  // Pacing score
  let pacingScore = 100;
  if (wpm < 100) pacingScore -= (100 - wpm);
  if (wpm > 160) pacingScore -= (wpm - 160);

  // Overall Score weighting
  const score = Math.round(
    (metrics.relevance * 0.3) +
    (metrics.grammar * 0.2) +
    (metrics.vocabulary * 0.2) +
    (metrics.clarity * 0.15) +
    (Math.max(0, 100 - fillerPercentage * 5) * 0.15)
  );

  return {
    score,
    rating: parsed.rating || "GOOD",
    strengths: parsed.strengths || ["Good effort on pacing"],
    weaknesses: parsed.weaknesses || ["Try to minimize fillers"],
    improvedVersion: parsed.improvedVersion || answerTranscript,
    grammarErrors: parsed.grammarErrors || [],
    metrics: {
      ...metrics,
      pronunciation: Math.max(0, pronunciation),
      pacing: Math.max(0, Math.min(100, pacingScore)),
      fillers: fillerPercentage
    }
  };
}
