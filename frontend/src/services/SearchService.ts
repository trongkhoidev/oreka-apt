import { getAllMarkets } from './aptosMarketService';
import { NewsService } from './NewsService';

export type SearchResult =
  | { type: 'market'; id: string; title: string; pair: string }
  | { type: 'news'; id: string; title: string; url: string };

export class SearchService {
  static async searchAll(keyword: string): Promise<SearchResult[]> {
    const lower = keyword.toLowerCase();
    // Search markets
    let marketResults: SearchResult[] = [];
    try {
      const markets = await getAllMarkets();
      marketResults = markets
        .filter((m: any) => m.pair_name?.toLowerCase().includes(lower))
        .map((m: any) => ({
          type: 'market',
          id: m.market_address,
          title: m.pair_name,
          pair: m.pair_name,
        }));
    } catch {}
    // Search news
    let newsResults: SearchResult[] = [];
    try {
      const news = await NewsService.getInstance().fetchCryptoNews(30);
      newsResults = news
        .filter((n) => n.title?.toLowerCase().includes(lower))
        .map((n) => ({
          type: 'news',
          id: n.id,
          title: n.title,
          url: n.url,
        }));
    } catch {}
    return [...marketResults, ...newsResults];
  }
} 