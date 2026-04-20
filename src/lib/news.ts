
export interface NewsArticle {
  id: string;
  source: string;
  title: string;
  excerpt: string;
  content: string;
  url: string;
  urlToImage?: string;
  publishedAt: string;
  readTime: string;
  level: string; // We'll map categories to levels for consistency
}

export async function fetchLiveNews(category: string = ""): Promise<NewsArticle[]> {
  const API_KEY = import.meta.env.VITE_NEWS_API_KEY;
  if (!API_KEY) {
    throw new Error("News API key is not configured");
  }

  const categoryParam = category && category !== "All" ? `&category=${category.toLowerCase()}` : "";
  const url = `https://newsapi.org/v2/top-headlines?language=en${categoryParam}&apiKey=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch news");
    }

    const data = await response.json();
    
    return (data.articles || [])
      .filter((a: any) => a.title && (a.content || a.description) && a.title !== "[Removed]")
      .map((a: any, index: number) => ({
        id: a.url || index.toString(),
        source: a.source?.name || "News",
        title: a.title,
        excerpt: a.description || "No description available",
        content: a.content || a.description || "No content available",
        url: a.url,
        urlToImage: a.urlToImage,
        publishedAt: a.publishedAt,
        readTime: "3 min", // Estimated
        level: category || "B1" // Default to B1 for live news
      }));
  } catch (error) {
    console.error("Error fetching live news:", error);
    throw error;
  }
}
