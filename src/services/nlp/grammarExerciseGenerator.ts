export interface GrammarExercise {
  id: string;
  level: number;
  pattern: string;
  question: string;
  options?: string[]; // only for level 1
  correctAnswer?: string | number; // for level 1, 2, 3
  explanation: string;
}

export async function generateGrammarExercise(pattern: string, level: number): Promise<GrammarExercise> {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error("Gemini API key is not configured");

  const prompt = `You are an expert English teacher creating an exercise.
Generate a grammar exercise for the pattern: "${pattern}".
Difficulty Level: ${level} (1 = Multiple Choice, 2 = Correct the Sentence, 3 = Fill in the Blank, 4 = Production Prompt).

For Level 1: Provide "options" (array of 4 strings) and "correctAnswer" (0-3 index).
For Level 2: Provide an incorrect sentence in "question" and the corrected sentence in "correctAnswer" (string).
For Level 3: Provide a sentence with a blank "___" in "question" and the missing word(s) in "correctAnswer" (string).
For Level 4: Provide a creative prompt in "question" (e.g. "Write a sentence describing what you did yesterday") and omit "correctAnswer".

Return strict JSON:
{
  "id": "random_string_id",
  "level": ${level},
  "pattern": "${pattern}",
  "question": "string",
  "options": ["optional", "array"],
  "correctAnswer": "string or number based on level",
  "explanation": "Brief explanation of the grammar rule."
}

Rule: Return ONLY valid JSON. No markdown formatting.`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });

  if (!response.ok) throw new Error("Failed to generate exercise");
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No content returned");

  return JSON.parse(text) as GrammarExercise;
}
