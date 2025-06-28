/**
 * NewsService class for fetching crypto news
 * Manages news data fetching from multiple APIs
 */

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
  imageUrl?: string;
  category?: string;
}

export interface NewsResponse {
  articles: NewsArticle[];
  totalResults: number;
  status: string;
}

export class NewsService {
  private static instance: NewsService;
  private cache: { data: NewsArticle[]; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 5 minutes
  private readonly API_URL = 'https://newsdata.io/api/1/latest?apikey=pub_9491759b91eb47f88a219cc3528d5356&q=crypto%20market';

  private constructor() { }

  public static getInstance(): NewsService {
    if (!NewsService.instance) {
      NewsService.instance = new NewsService();
    }
    return NewsService.instance;
  }

  public async fetchCryptoNews(limit: number = 20): Promise<NewsArticle[]> {
    const now = Date.now();
    if (this.cache && (now - this.cache.timestamp) < this.CACHE_DURATION) {
      return this.cache.data.slice(0, limit);
    }
    try {
      const response = await fetch(this.API_URL);
      const data = await response.json();
      const articles: NewsArticle[] = (data.results || []).map((item: any) => ({
        id: item.article_id || item.link,
        title: item.title,
        description: item.description || '',
        url: item.link,
        publishedAt: item.pubDate,
        source: item.source_id || item.source_name || '',
        imageUrl: item.image_url,
        category: Array.isArray(item.category) ? item.category.join(', ') : (item.category || ''),
      }));
      this.cache = { data: articles, timestamp: now };
      return articles.slice(0, limit);
    } catch (error) {
      console.error('Error fetching news from NewsData.io:', error);
      return [];
    }
  }

  public clearCache(): void {
    this.cache = null;
  }
} 