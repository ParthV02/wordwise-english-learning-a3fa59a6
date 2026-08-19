// Free Dictionary API – no key required: https://dictionaryapi.dev/
// The word of the day is chosen deterministically based on the current date and
// locked in localStorage so it never changes within a 24-hour window.

export interface DictionaryEntry {
  word: string;
  phonetic: string;          // IPA string e.g. /ˈwʌndə/
  partOfSpeech: string;
  definition: string;
  example: string;
  synonyms: string[];
  antonyms: string[];
  audioUrl: string;
}

export interface WordMeaning {
  partOfSpeech: string;
  definitions: { definition: string; example?: string }[];
  synonyms: string[];
  antonyms: string[];
}

export interface FullWordEntry extends DictionaryEntry {
  meanings: WordMeaning[];
}

export interface MorphemePart {
  label: string;       // e.g. "un-"
  origin: string;      // e.g. "Latin"
  meaning: string;     // e.g. "not"
  related: string[];   // e.g. ["unhappy", "undo"]
  present: boolean;    // false when the word has no prefix/suffix
}

export interface DecomposedWord {
  word: string;
  phonetic: string;
  audioUrl: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  meanings: WordMeaning[];
  prefix: MorphemePart;
  root: MorphemePart;
  suffix: MorphemePart;
  etymology: string;
}

// A curated list of rich, interesting (but not obscure) English words used to
// pick the word of the day.  The list is long enough that it won't repeat for
// over a year and varied enough to stay interesting.
const WORD_POOL = [
  "ephemeral", "serendipity", "melancholy", "ubiquitous", "benevolent",
  "resilience", "paradox", "eloquent", "ambiguous", "pragmatic",
  "contemplation", "idiosyncrasy", "tenacious", "magnanimous", "perspicacious",
  "labyrinthine", "diligent", "fortuitous", "intrepid", "circumspect",
  "propitious", "esoteric", "ostentatious", "loquacious", "gregarious",
  "sycophant", "pernicious", "mnemonic", "vociferous", "obsequious",
  "impeccable", "audacious", "capricious", "enigmatic", "fastidious",
  "garrulous", "inexorable", "juxtapose", "kaleidoscope", "lucid",
  "meticulous", "nefarious", "omniscient", "panacea", "quintessential",
  "recalcitrant", "spurious", "taciturn", "unequivocal", "verisimilitude",
  "whimsical", "xenophile", "yearning", "zealous", "aberrant",
  "brevity", "cacophony", "dubious", "egregious", "fervent",
  "grandiose", "harrowing", "incisive", "jeopardize", "kinetic",
  "languid", "mercurial", "nebulous", "obtuse", "pensive",
  "quandary", "ruminate", "sanguine", "tenuous", "umbrage",
  "verbose", "wistful", "xenial", "youthful", "zealotry",
  "acrimony", "buoyant", "candid", "daunting", "exuberant",
  "fallacious", "gullible", "heretic", "inquisitive", "judicious",
];

const STORAGE_KEY = "wotd_cache";

interface CachedWord {
  date: string;          // "YYYY-MM-DD"
  entry: DictionaryEntry;
}

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

/** Pick a word from the pool based on the current date (deterministic). */
function pickWordForDate(dateStr: string): string {
  // Simple hash: sum of char codes of the date string
  const hash = dateStr
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return WORD_POOL[hash % WORD_POOL.length];
}

/** Fetch full entry from the Free Dictionary API. */
async function fetchFromDictionaryApi(word: string): Promise<DictionaryEntry> {
  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);

  if (!res.ok) {
    throw new Error(`Dictionary API error ${res.status} for word "${word}"`);
  }

  const data = await res.json();
  const entry = data[0];

  // Extract the first valid phonetic with audio
  const phoneticObj = (entry.phonetics as any[]).find(
    (p: any) => p.text && p.audio
  ) || (entry.phonetics as any[])[0] || {};

  const phonetic: string = phoneticObj.text || entry.phonetic || "";
  const audioUrl: string = phoneticObj.audio || "";

  // Walk meanings to find first definition + example + part of speech
  let partOfSpeech = "";
  let definition = "";
  let example = "";
  const synonyms: string[] = [];
  const antonyms: string[] = [];

  for (const meaning of entry.meanings as any[]) {
    if (!partOfSpeech) partOfSpeech = meaning.partOfSpeech;

    for (const def of meaning.definitions as any[]) {
      if (!definition) {
        definition = def.definition;
        example = def.example || "";
      }
      synonyms.push(...(def.synonyms || []));
      antonyms.push(...(def.antonyms || []));
    }

    synonyms.push(...(meaning.synonyms || []));
    antonyms.push(...(meaning.antonyms || []));

    if (definition) break;
  }

  return {
    word: entry.word,
    phonetic,
    partOfSpeech,
    definition,
    example,
    synonyms: [...new Set(synonyms)].slice(0, 5),
    antonyms: [...new Set(antonyms)].slice(0, 5),
    audioUrl,
  };
}

/**
 * Returns the Word of the Day.
 * - If the cache is valid (same date), returns the cached entry.
 * - Otherwise, picks today's word, fetches it from the API, and caches it.
 */
export async function getWordOfTheDay(): Promise<DictionaryEntry> {
  const today = todayString();

  // Check localStorage cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const cached: CachedWord = JSON.parse(raw);
      if (cached.date === today) {
        return cached.entry;
      }
    }
  } catch {
    // Ignore parse errors
  }

  // Pick and fetch today's word
  const word = pickWordForDate(today);
  const entry = await fetchFromDictionaryApi(word);

  // Persist to localStorage
  const toCache: CachedWord = { date: today, entry };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toCache));

  return entry;
}

/** Clear the cache so a new word loads on the next call (useful for dev/testing). */
export function clearWordOfTheDayCache() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Returns the Word for a specific date string ("YYYY-MM-DD").
 * Uses per-date localStorage cache keys so past words are remembered.
 * For today, delegates to getWordOfTheDay() to keep a single source of truth.
 */
export async function getWordForDate(dateStr: string): Promise<DictionaryEntry> {
  const today = todayString();
  if (dateStr === today) return getWordOfTheDay();

  const cacheKey = `wotd_${dateStr}`;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) return JSON.parse(raw) as DictionaryEntry;
  } catch { /* ignore */ }

  const word = pickWordForDate(dateStr);
  const entry = await fetchFromDictionaryApi(word);

  try {
    localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch { /* ignore */ }

  return entry;
}

// ─── Full word lookup (all meanings) ────────────────────────────────────────

/** Fetch the full entry with ALL meanings from the Dictionary API. */
export async function searchWord(word: string): Promise<FullWordEntry> {
  const cleaned = word.trim().toLowerCase();
  const res = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleaned)}`
  );

  if (res.status === 404) {
    throw new Error(`"${word}" was not found in the dictionary.`);
  }
  if (!res.ok) {
    throw new Error(`Dictionary API error ${res.status}.`);
  }

  const data = await res.json();
  const entry = data[0];

  // Phonetics
  const phoneticObj =
    (entry.phonetics as any[]).find((p: any) => p.text && p.audio) ||
    (entry.phonetics as any[])[0] ||
    {};
  const phonetic: string = phoneticObj.text || entry.phonetic || "";
  const audioUrl: string = phoneticObj.audio || "";

  // All meanings
  const meanings: WordMeaning[] = (entry.meanings as any[]).map((m: any) => ({
    partOfSpeech: m.partOfSpeech,
    definitions: (m.definitions as any[]).slice(0, 4).map((d: any) => ({
      definition: d.definition,
      example: d.example,
    })),
    synonyms: [...new Set([...(m.synonyms || [])])].slice(0, 6) as string[],
    antonyms: [...new Set([...(m.antonyms || [])])].slice(0, 6) as string[],
  }));

  // Primary definition
  const primaryMeaning = meanings[0];
  const partOfSpeech = primaryMeaning?.partOfSpeech ?? "";
  const definition = primaryMeaning?.definitions[0]?.definition ?? "";
  const example = primaryMeaning?.definitions[0]?.example ?? "";
  const synonyms = primaryMeaning?.synonyms ?? [];
  const antonyms = primaryMeaning?.antonyms ?? [];

  return {
    word: entry.word,
    phonetic,
    audioUrl,
    partOfSpeech,
    definition,
    example,
    synonyms,
    antonyms,
    meanings,
  };
}

// ─── Gemini-powered morpheme decomposer ─────────────────────────────────────

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  backoff = 1500
): Promise<Response> {
  try {
    const res = await fetch(url, options);
    if ((res.status === 503 || res.status === 429) && retries > 0) {
      await new Promise((r) => setTimeout(r, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    return res;
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw err;
  }
}

/**
 * Decompose a word into prefix / root / suffix using Gemini.
 * Returns a DecomposedWord that merges Dictionary API data with Gemini morphology.
 */
export async function decomposeWord(word: string): Promise<DecomposedWord> {
  const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!GEMINI_KEY) throw new Error("Gemini API key is not configured.");

  // Fetch dictionary data (may fail for uncommon words — that's fine)
  const fullEntry = await searchWord(word).catch(() => null);

  // Build prompt — if dictionary API had no data, ask Gemini for definition too
  const needsDefinition = !fullEntry;

  const prompt = `You are an expert English etymologist and linguist.

For the word "${word}", provide a detailed morphological (morpheme) decomposition.

Return ONLY a valid JSON object (no markdown, no backticks) with this exact schema:
{
  "prefix": {
    "label": string,      // e.g. "un-" — empty string "" if the word has no prefix
    "origin": string,     // language of origin e.g. "Old English", "Latin", "Greek"
    "meaning": string,    // what this prefix means, e.g. "not, opposite of"
    "related": string[],  // 3-4 other words sharing this prefix
    "present": boolean    // true if this word actually has a prefix
  },
  "root": {
    "label": string,      // the core root morpheme e.g. "believe"
    "origin": string,
    "meaning": string,
    "related": string[],  // 3-4 related words
    "present": boolean    // always true
  },
  "suffix": {
    "label": string,      // e.g. "-able" — empty string if no suffix
    "origin": string,
    "meaning": string,
    "related": string[],  // 3-4 other words with this suffix
    "present": boolean    // true if this word actually has a suffix
  },
  "etymology": string,    // one concise sentence about the word's historical origin
  "definition": string,   // a clear, concise definition of the word (1-2 sentences)
  "partOfSpeech": string, // e.g. "noun", "verb", "adjective"
  "example": string       // an example sentence using the word naturally
}

Important rules:
- If there is no prefix, set prefix.label to "" and prefix.present to false (but still fill origin/meaning/related with reasonable data about the root's language).
- If there is no suffix, do the same for suffix.
- The definition, partOfSpeech, and example fields are mandatory — always provide them.
- Always return valid JSON only.`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  });

  const sendGemini = async (model: string) => {
    const res = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body }
    );
    if (!res.ok) {
      const err = await res.json();
      throw { status: res.status, message: err.error?.message || "Gemini error" };
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned no content.");
    return JSON.parse(text);
  };

  let morphemes: any;
  try {
    morphemes = await sendGemini("gemini-2.5-flash");
  } catch (e: any) {
    if (e.status === 503 || e.status === 429) {
      morphemes = await sendGemini("gemini-2.0-flash");
    } else {
      throw e;
    }
  }

  // Merge: prefer dictionary data when available, fall back to Gemini's definition
  return {
    word: fullEntry?.word ?? word,
    phonetic: fullEntry?.phonetic ?? "",
    audioUrl: fullEntry?.audioUrl ?? "",
    partOfSpeech: fullEntry?.partOfSpeech || morphemes.partOfSpeech || "",
    definition: fullEntry?.definition || morphemes.definition || "",
    example: fullEntry?.example || morphemes.example || "",
    meanings: fullEntry?.meanings ?? [],
    prefix: morphemes.prefix,
    root: morphemes.root,
    suffix: morphemes.suffix,
    etymology: morphemes.etymology ?? "",
  };
}

// ─── Category context (Gemini) ───────────────────────────────────────────────

export interface CategoryContext {
  description: string;     // Short definition e.g. "Study of the skin and its diseases."
  relatedTerms: string[];  // 8–10 representative or related words
}

const CAT_CACHE_PREFIX = "cat_ctx_";

/**
 * Returns a short description and related terms for a given vocabulary category.
 * Results are cached in sessionStorage so repeated clicks are instant.
 */
export async function getCategoryContext(
  categoryId: string,
  categoryName: string
): Promise<CategoryContext> {
  const cacheKey = CAT_CACHE_PREFIX + categoryId;

  // Check sessionStorage
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as CategoryContext;
  } catch {
    // ignore
  }

  const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!GEMINI_KEY) throw new Error("Gemini API key is not configured.");

  const prompt = `You are an expert English vocabulary educator.

For the vocabulary category "${categoryName}" (used in an English learning app), provide:
1. A short, clear description (1–2 sentences) explaining what this category covers.
2. A list of 8–10 representative terms/words that belong to or are closely related to this category. These should be real, interesting words a learner would encounter in this domain.

Return ONLY a valid JSON object (no markdown, no backticks):
{
  "description": string,
  "relatedTerms": string[]
}`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  });

  const sendGeminiCat = async (model: string): Promise<CategoryContext> => {
    const res = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body }
    );
    if (!res.ok) {
      const err = await res.json();
      throw { status: res.status, message: err.error?.message || "Gemini error" };
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned no content.");
    return JSON.parse(text) as CategoryContext;
  };

  let result: CategoryContext;
  try {
    result = await sendGeminiCat("gemini-2.5-flash");
  } catch (e: any) {
    if (e.status === 503 || e.status === 429) {
      result = await sendGeminiCat("gemini-2.0-flash");
    } else {
      throw e;
    }
  }

  // Cache in sessionStorage
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(result));
  } catch {
    // ignore quota errors
  }

  return result;
}

// ─── Corresponding words (same root family) ──────────────────────────────────

export interface CorrespondingWord {
  word: string;
  meaning: string;   // one-line definition
}

const CORR_CACHE_PREFIX = "corr_";

/**
 * Given a word and its root morpheme, returns 8-10 words that share the
 * same root (i.e., from the same morphological family).
 * Cached in sessionStorage per root to avoid repeated Gemini calls.
 */
export async function getCorrespondingWords(
  word: string,
  root: string
): Promise<CorrespondingWord[]> {
  const cacheKey = CORR_CACHE_PREFIX + root.toLowerCase().replace(/[^a-z]/g, "");

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as CorrespondingWord[];
  } catch { /* ignore */ }

  const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!GEMINI_KEY) throw new Error("Gemini API key is not configured.");

  const prompt = `You are an expert English morphologist.

The word "${word}" contains the root morpheme "${root}".

List 8 to 10 real English words that share this same root morpheme and therefore belong to the same word family (e.g. for "dermat-": dermatology, dermatologist, dermal, dermatitis, hypodermic, epidermis, etc.).

Do NOT include the original word "${word}" itself.

Return ONLY a valid JSON array (no markdown, no backticks):
[
  { "word": string, "meaning": string },
  ...
]

Each "meaning" should be a very short definition (5-10 words max).`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  });

  const sendGemini = async (model: string): Promise<CorrespondingWord[]> => {
    const res = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body }
    );
    if (!res.ok) {
      const err = await res.json();
      throw { status: res.status, message: err.error?.message || "Gemini error" };
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned no content.");
    return JSON.parse(text) as CorrespondingWord[];
  };

  let result: CorrespondingWord[];
  try {
    result = await sendGemini("gemini-2.5-flash");
  } catch (e: any) {
    if (e.status === 503 || e.status === 429) {
      result = await sendGemini("gemini-2.0-flash");
    } else {
      throw e;
    }
  }

  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(result));
  } catch { /* ignore */ }

  return result;
}

const PREFIX_CACHE_PREFIX = "prefix_words_";
const SUFFIX_CACHE_PREFIX = "suffix_words_";

/**
 * Given a word and its prefix morpheme, returns 6-8 words that share the
 * same prefix (e.g. "bio-" → biology, biochemistry, biomass…).
 * Cached in sessionStorage per prefix.
 */
export async function getPrefixWords(
  word: string,
  prefix: string
): Promise<CorrespondingWord[]> {
  const cacheKey = PREFIX_CACHE_PREFIX + prefix.toLowerCase().replace(/[^a-z]/g, "");

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as CorrespondingWord[];
  } catch { /* ignore */ }

  const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!GEMINI_KEY) throw new Error("Gemini API key is not configured.");

  const prompt = `You are an expert English morphologist.

The word "${word}" starts with the prefix "${prefix}".

List 6 to 8 real English words (other than "${word}") that also start with the prefix "${prefix}" and clearly use it with the same meaning (e.g. for "bio-": biology, biochemistry, biomass, biopsy, biography, biodiversity).

Return ONLY a valid JSON array (no markdown, no backticks):
[
  { "word": string, "meaning": string },
  ...
]

Each "meaning" should be a very short definition (5-10 words max).`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  });

  const sendGemini = async (model: string): Promise<CorrespondingWord[]> => {
    const res = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body }
    );
    if (!res.ok) {
      const err = await res.json();
      throw { status: res.status, message: err.error?.message || "Gemini error" };
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned no content.");
    return JSON.parse(text) as CorrespondingWord[];
  };

  let result: CorrespondingWord[];
  try {
    result = await sendGemini("gemini-2.5-flash");
  } catch (e: any) {
    if (e.status === 503 || e.status === 429) {
      result = await sendGemini("gemini-2.0-flash");
    } else {
      throw e;
    }
  }

  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(result));
  } catch { /* ignore */ }

  return result;
}

/**
 * Given a word and its suffix morpheme, returns 6-8 words that share the
 * same suffix (e.g. "-graphy" → geography, photography, biography…).
 * Cached in sessionStorage per suffix.
 */
export async function getSuffixWords(
  word: string,
  suffix: string
): Promise<CorrespondingWord[]> {
  const cacheKey = SUFFIX_CACHE_PREFIX + suffix.toLowerCase().replace(/[^a-z]/g, "");

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as CorrespondingWord[];
  } catch { /* ignore */ }

  const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!GEMINI_KEY) throw new Error("Gemini API key is not configured.");

  const prompt = `You are an expert English morphologist.

The word "${word}" ends with the suffix "${suffix}".

List 6 to 8 real English words (other than "${word}") that also end with the suffix "${suffix}" and clearly use it with the same meaning (e.g. for "-graphy": geography, photography, biography, choreography, calligraphy, cinematography).

Return ONLY a valid JSON array (no markdown, no backticks):
[
  { "word": string, "meaning": string },
  ...
]

Each "meaning" should be a very short definition (5-10 words max).`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  });

  const sendGemini = async (model: string): Promise<CorrespondingWord[]> => {
    const res = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body }
    );
    if (!res.ok) {
      const err = await res.json();
      throw { status: res.status, message: err.error?.message || "Gemini error" };
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned no content.");
    return JSON.parse(text) as CorrespondingWord[];
  };

  let result: CorrespondingWord[];
  try {
    result = await sendGemini("gemini-2.5-flash");
  } catch (e: any) {
    if (e.status === 503 || e.status === 429) {
      result = await sendGemini("gemini-2.0-flash");
    } else {
      throw e;
    }
  }

  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(result));
  } catch { /* ignore */ }

  return result;
}

// ─── Multi-language translations ─────────────────────────────────────────────

export interface WordTranslation {
  language: string;   // e.g. "Hindi"
  script: string;     // native script name e.g. "हिंदी"
  meaning: string;    // meaning of the word in that language
}

const TRANS_CACHE_PREFIX = "trans_";

const TARGET_LANGUAGES = [
  "Hindi", "Hinglish", "Marathi", "Tamil", "Telugu", "Bengali",
  "Gujarati", "Kannada", "Malayalam", "Punjabi", "Urdu",
];

// Note: "Hinglish" = Hindi meaning written in Roman (English) script, not Devanagari

/**
 * Uses Gemini to translate the meaning of an English word into 10 Indian languages.
 * Results are cached in sessionStorage per word.
 */
export async function getWordTranslations(
  word: string,
  definition: string
): Promise<WordTranslation[]> {
  const cacheKey = TRANS_CACHE_PREFIX + word.toLowerCase().replace(/[^a-z]/g, "");

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as WordTranslation[];
  } catch { /* ignore */ }

  const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!GEMINI_KEY) throw new Error("Gemini API key is not configured.");

  const prompt = `You are an expert multilingual translator specializing in Indian languages.

The English word is: "${word}"
Its definition is: "${definition}"

Translate the MEANING (not just the word) of "${word}" into each of these 11 Indian languages:
${TARGET_LANGUAGES.join(", ")}

IMPORTANT special instruction for "Hinglish":
- Hinglish means: write the Hindi meaning using Roman/English letters (transliteration), NOT Devanagari script.
- Example: instead of "अभूतपूर्व", write "abhootpoorv" or "anokha jo pehle kabhi nahi hua"
- For the "script" field of Hinglish, use "Roman Hindi"

For all other languages:
- Use their native script for the "meaning" field
- Use the native script name for the "script" field

Return ONLY a valid JSON array (no markdown, no backticks):
[
  { "language": "Hindi", "script": "हिंदी", "meaning": "<hindi meaning in Devanagari>" },
  { "language": "Hinglish", "script": "Roman Hindi", "meaning": "<hindi meaning in Roman letters>" },
  ...
]`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  });

  const sendGemini = async (model: string): Promise<WordTranslation[]> => {
    const res = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body }
    );
    if (!res.ok) {
      const err = await res.json();
      throw { status: res.status, message: err.error?.message || "Gemini error" };
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned no content.");
    return JSON.parse(text) as WordTranslation[];
  };

  let result: WordTranslation[];
  try {
    result = await sendGemini("gemini-2.5-flash");
  } catch (e: any) {
    if (e.status === 503 || e.status === 429) {
      result = await sendGemini("gemini-2.0-flash");
    } else {
      throw e;
    }
  }

  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(result));
  } catch { /* ignore */ }

  return result;
}
