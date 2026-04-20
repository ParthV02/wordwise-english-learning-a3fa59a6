
const newsCache: Record<string, string> = {};

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, backoff = 2000): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    // Handle 503 (Overloaded) or 429 (Rate Limit)
    if ((response.status === 503 || response.status === 429) && retries > 0) {
      const msg = response.status === 429 ? "Rate limit hit (429)" : "High demand (503)";
      console.warn(`Gemini API ${msg}. Retrying in ${backoff}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
}

export async function generateQuizFromWords(words: string[]) {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  const PRIMARY_MODEL = "gemini-2.5-flash";
  const FALLBACK_MODEL = "gemini-2.5-flash-lite";

  if (!API_KEY) {
    throw new Error("Gemini API key is not configured");
  }

  const prompt = `You are a helpful language learning assistant. 
  Please create a 5-question multiple choice quiz for an English learner based on the following word bank words: ${words.join(", ")}.
  
  CRITICAL REQUIREMENT: Every single question MUST be directly related to and test the meaning or usage of the words from the word bank provided. Do not use generic vocabulary. Focus specifically on: ${words.join(", ")}.
  
  Return the result as a JSON array of objects with this schema:
  [
    {
      "id": number,
      "question": string,
      "options": string[],
      "correct": number,
      "explanation": string
    }
  ]
  
  Rules:
  - The "correct" field must be the 0-indexed position of the right answer in the "options" array.
  - Provide a clear explanation for each correct answer.
  - Return ONLY the JSON; do not include markdown backticks or any other text.`;

  const getBody = () => JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const sendRequest = async (model: string) => {
    const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: getBody()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw { status: response.status, message: errorData.error?.message || "Failed to generate quiz questions" };
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) {
      throw new Error("Gemini API did not return any content.");
    }

    return JSON.parse(resultText);
  };

  try {
    return await sendRequest(PRIMARY_MODEL);
  } catch (error: any) {
    if (error.status === 503 || error.status === 429) {
      console.warn(`Primary model issue (${error.status}). Attempting fallback model...`);
      try {
        return await sendRequest(FALLBACK_MODEL);
      } catch (fallbackError) {
        throw fallbackError;
      }
    }
    console.error("Error in generateQuizFromWords:", error);
    throw error;
  }
}

export async function expandNewsArticle(title: string, snippet: string) {
  const cacheKey = `${title}-${snippet}`.slice(0, 100);
  if (newsCache[cacheKey]) {
    console.log("Serving expanded news from cache...");
    return newsCache[cacheKey];
  }

  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  const PRIMARY_MODEL = "gemini-2.5-flash";
  const FALLBACK_MODEL = "gemini-2.5-flash-lite";

  if (!API_KEY) {
    throw new Error("Gemini API key is not configured");
  }

  const prompt = `You are a professional journalist and expert English language teacher.
  
  Based on the following news headline and short snippet, please write a complete, detailed, and engaging news article (approximately 300-400 words) suitable for an intermediate English learner (B1/B2 level).
  
  Headline: ${title}
  Snippet: ${snippet}
  
  Guidelines:
  - Write in clear, standard English.
  - Structure the article with a clear introduction, 3-4 detailed body paragraphs, and a brief conclusion.
  - Ensure the tone is informative and neutral.
  - Reconstruct the story logically based on the provided info, using your broad knowledge of current events if necessary, but stay faithful to the main facts.
  - DO NOT include any preamble like "Here is the expanded article". Return ONLY the article text.`;

  const getBody = () => JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
  });

  const sendRequest = async (model: string) => {
    const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: getBody()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw { status: response.status, message: errorData.error?.message || "Failed to expand news article" };
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) {
      throw new Error("Gemini API did not return any content.");
    }

    return resultText;
  };

  try {
    const result = await sendRequest(PRIMARY_MODEL);
    newsCache[cacheKey] = result;
    return result;
  } catch (error: any) {
    if (error.status === 503 || error.status === 429) {
      console.warn(`Primary model issue (${error.status}). Attempting fallback model for news expansion...`);
      try {
        const result = await sendRequest(FALLBACK_MODEL);
        newsCache[cacheKey] = result;
        return result;
      } catch (fallbackError) {
        throw fallbackError;
      }
    }
    console.error("Error in expandNewsArticle:", error);
    throw error;
  }
}
