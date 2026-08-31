import { fetchWithRetry } from "@/lib/gemini";

export interface GrammarCorrection {
  type: string;
  pattern: string;
  original: string;
  correction: string;
  explanation: string;
  severity: "low" | "medium" | "high";
  confidence: number;
}

export interface GrammarAnalysisResult {
  score: number;
  rating: string;
  errors: GrammarCorrection[];
  vocabularyScore: number;
  vocabularyFeedback: string;
}

export async function analyzeGrammarAndVocabulary(transcript: string): Promise<GrammarAnalysisResult> {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error("Gemini API key is not configured");

  const prompt = `You are an expert English language assessor.
Analyze the following transcript from an English learner for both grammar and vocabulary.

Transcript: "${transcript}"

Return the result strictly as a JSON object with this schema:
{
  "grammarScore": number (0-100),
  "grammarRating": string,
  "errors": [
    {
      "type": "TENSE" | "PREPOSITION" | "ARTICLE" | "SUBJECT_VERB_AGREEMENT" | "WORD_ORDER" | "VERB_FORM" | "SINGULAR_PLURAL",
      "pattern": "simple_past" | "present_perfect" | "in_on_at" | "etc",
      "original": "the exact incorrect phrase from the transcript",
      "correction": "the corrected phrase",
      "explanation": "Short, friendly explanation of the rule",
      "severity": "low" | "medium" | "high",
      "confidence": number (0-1)
    }
  ],
  "vocabularyScore": number (0-100),
  "vocabularyFeedback": string
}

Rule: Return ONLY valid JSON. No markdown formatting or code blocks.`;

  const models = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest"];
  let parsed: any = null;
  let lastError = new Error("Failed to analyze grammar");

  for (const model of models) {
    try {
      const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }, 0);

      if (!response.ok) throw new Error(`Model ${model} returned ${response.status}`);
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("No content returned");

      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanText);
      break;
    } catch (e: any) {
      console.warn(`Model ${model} failed for grammar analysis: ${e.message}`);
      lastError = e;
    }
  }

  if (!parsed) {
    throw lastError;
  }
  return {
    score: parsed.grammarScore || 70,
    rating: parsed.grammarRating || "Good!",
    errors: parsed.errors || [],
    vocabularyScore: parsed.vocabularyScore || 70,
    vocabularyFeedback: parsed.vocabularyFeedback || "Good effort!"
  };
}
