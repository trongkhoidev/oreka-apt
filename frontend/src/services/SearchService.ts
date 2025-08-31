import { NewsService } from './NewsService';

export interface SearchResult {
  type: 'market' | 'news';
  id: string;
  title: string;
  url?: string;
  pair?: string;
  cardTitle?: string;
  strike?: string;
  maturity?: string;
  imgSrc?: string;
}

export class SearchService {
  static async search(keyword: string): Promise<SearchResult[]> {
    const lower = keyword.toLowerCase();
    
    // TODO: Update this for new poly-option system
    // let marketResults: SearchResult[] = [];
    // try {
    //   // const markets = await getAllMarkets();
    //   // const marketWithFields = markets
    //   //   .map((m: Market) => {
    //   //     const pair_name = getStandardPairName(m.price_feed_id || '');
    //   //     const strike_price = Number(m.outcomes?.[0]?.threshold1 || '0');
    //   //     const fee_percentage = Number(m.fee_percentage_bps || 0) / 100;
    //   //     const total_bids = Number(m.total_bids || 0);
    //   //     const total_amount = Number(m.total_amount || '0');
    //   //     const is_resolved = Boolean(m.is_resolved);
    //   //     const bidding_start_time = Number(m.bidding_start_time || 0);
    //   //     const bidding_end_time = Number(m.bidding_end_time || 0);
    //   //     const maturity_time = Number(m.bidding_end_time || 0);
    //   //     const final_price = Number(m.final_price || '0');
    //   //     const fee_withdrawn = false; // TODO: Update for poly-option system
    //   //     const marketObj = {
    //   //       ...m,
    //   //       pair_name,
    //   //       strike_price: String(strike_price),
    //   //       maturity_time: String(maturity_time),
    //   //       fee_percentage: String(fee_percentage),
    //   //       total_bids: String(total_bids),
    //   //       long_bids: String(m.long_bids),
    //   //       short_bids: String(m.short_bids),
    //   //       total_amount: String(total_amount),
    //   //       long_amount: String(m.long_amount),
    //   //       short_amount: String(m.short_amount),
    //   //       result: String(m.result),
    //   //       is_resolved: !!is_resolved,
    //   //       bidding_start_time: String(bidding_start_time),
    //   //       bidding_end_time: String(bidding_end_time),
    //   //       final_price: String(final_price),
    //   //       fee_withdrawn: !!fee_withdrawn,
    //   //       market_address: m.market_address,
    //   //       creator: m.creator,
    //   //       price_feed_id: m.price_feed_id,
    //   //       outcomes: m.outcomes,
    //   //       num_outcomes: m.num_outcomes,
    //   //       fee_percentage_bps: m.fee_percentage_bps,
    //   //       rake_percentage_bps: m.rake_percentage_bps,
    //   //       ork_budget: m.ork_budget,
    //   //       total_bids: m.total_bids,
    //   //       total_amount: m.total_amount,
    //   //       total_net_amount: m.total_net_amount,
    //   //       fee_accumulator: m.fee_accumulator,
    //   //       rake_accumulator: m.rake_accumulator,
    //   //       outcome_amounts: m.outcome_amounts,
    //   //       outcome_net_amounts: m.outcome_net_amounts,
    //   //       outcome_weights: m.outcome_weights,
    //   //       total_weight: m.total_weight,
    //   //       bidding_start_time: m.bidding_start_time,
    //   //       bidding_end_time: m.bidding_end_time,
    //   //       status: m.status,
    //   //       winning_outcome: m.winning_outcome,
    //   //       is_void: m.is_void,
    //   //       is_resolved: m.is_resolved,
    //   //       final_price: m.final_price,
    //   //       resolved_at: m.resolved_at,
    //   //       payment_asset: m.payment_asset,
    //   //       payout_pool: m.payout_pool,
    //   //       losers_net: m.losers_net,
    //   //     };
    //   //     return {
    //   //       m: marketObj,
    //   //       cardTitle: `${pair_name} will reach $${(strike_price / 1e8).toFixed(2)} by ${new Date(maturity_time * 1000).toLocaleDateString()}?`,
    //   //       imgSrc: getMarketImgSrc(marketObj),
    //   //       _searchTitle: pair_name.toLowerCase(),
    //   //       _searchFields: [
    //   //         pair_name.toLowerCase(),
    //   //         (strike_price / 1e8).toFixed(2),
    //   //         fee_percentage.toFixed(2),
    //   //         total_bids.toString(),
    //   //         total_amount.toString(),
    //   //         is_resolved ? 'resolved' : 'active',
    //   //         new Date(bidding_start_time * 1000).toLocaleDateString(),
    //   //         new Date(bidding_end_time * 1000).toLocaleDateString(),
    //   //         new Date(maturity_time * 1000).toLocaleDateString(),
    //   //         final_price ? (Number(final_price) / 1e8).toFixed(2) : 'pending',
    //   //         fee_withdrawn ? 'withdrawn' : 'pending',
    //   //       ],
    //   //     };
    //   //   });
    //   // const news = await NewsService.getNews();
    //   // const newsWithFields = news.map((n, i) => ({
    //   //   n,
    //   //   cardTitle: n.title,
    //   //   imgSrc: `/images/news-${(i % 3) + 1}.png`,
    //   //   _searchTitle: n.title.toLowerCase(),
    //   //   _searchFields: [n.title.toLowerCase(), n.url.toLowerCase()],
    //   // }));
    //   // return [...marketWithFields, ...newsWithFields];
    //   
    //   // Temporary: return empty array for now
    //   return [];
    // } catch {}
    // Search news
    try {
      const news = await NewsService.getInstance().fetchCryptoNews(30);
      const newsWithFields = news
        .filter((n) => n.title?.toLowerCase().includes(lower))
        .map((n) => ({
          type: 'news' as const,
          id: n.id,
          title: n.title,
          url: n.url,
        }));
      return newsWithFields;
    } catch {
      return [];
    }
  }
} 