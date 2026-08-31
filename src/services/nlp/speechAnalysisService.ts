

export interface ReadingAnalysisResult {
  stats: {
    wordsRead: number;
    wordsRecognized: number;
    skippedWords: number;
    repeatedWords: number;
  };
  scores: {
    pacing: number;
    clarity: number;
    pronunciation: number;
    pauses: number;
    overall: number;
  };
  feedback: {
    strengths: string[];
    weaknesses: string[];
  };
  problemWords: string[];
}

export async function analyzeReading(
  targetText: string,
  spokenTranscript: string,
  durationSeconds: number
): Promise<ReadingAnalysisResult> {
  const prompt = `You are an expert English speech and pronunciation evaluator.

I have an original article text that a user was supposed to read aloud, and the speech-to-text transcript of what they actually said.

Original Text:
"""
${targetText}
"""

User's Spoken Transcript:
"""
${spokenTranscript}
"""

Duration: ${durationSeconds} seconds.

Please analyze the user's reading performance strictly distinguishing between "Word Recognized" and "Pronunciation Accuracy".
1. Compare the transcript to the original text. Identify skipped words, repeated words, and words that were misrecognized.
2. Evaluate Pacing (average conversational pace is ~130-150 words per minute).
3. Evaluate Clarity (how well the speech recognizer understood them).
4. Evaluate Pronunciation strictly. Just because a word appears in the transcript does NOT mean it was pronounced perfectly. If the transcript contains phonetic substitutions or errors near complex words, penalize pronunciation.
5. Evaluate Pauses (if they took too long based on the duration).
6. Provide exactly 3 strengths and 3 areas to improve (weaknesses).
7. Provide a list of up to 5 specific words from the original text that the user seemed to struggle with (either skipped entirely, or recognized but likely mispronounced/poor pronunciation confidence). These must be exact words from the original text.

Return ONLY a valid JSON object matching this schema:
{
  "stats": {
    "wordsRead": number (approximate word count of original text they attempted),
    "wordsRecognized": number (word count of transcript),
    "skippedWords": number,
    "repeatedWords": number
  },
  "scores": {
    "pacing": number (0-100),
    "clarity": number (0-100),
    "pronunciation": number (0-100),
    "pauses": number (0-100)
  },
  "feedback": {
    "strengths": string[] (3 short bullet points),
    "weaknesses": string[] (3 short bullet points)
  },
  "problemWords": string[] (up to 5 words)
}`;

  try {
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!API_KEY) throw new Error("Gemini API key is not configured");

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) throw new Error("Failed to analyze reading");
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No content returned");

    const analysis = JSON.parse(text);
    
    // Calculate overall score based on the weighted formula from the requirements
    const overall = Math.round(
      (analysis.scores.pronunciation * 0.35) +
      (analysis.scores.clarity * 0.25) +
      (analysis.scores.pacing * 0.15) +
      (analysis.scores.pauses * 0.10) +
      // Word Recognition (15%) - simple ratio
      (Math.min(100, (analysis.stats.wordsRecognized / Math.max(1, analysis.stats.wordsRead)) * 100) * 0.15)
    );

    analysis.scores.overall = overall;
    
    return analysis;
  } catch (err) {
    console.error("Reading analysis failed:", err);
    throw new Error("Failed to analyze reading. Please try again.");
  }
}
