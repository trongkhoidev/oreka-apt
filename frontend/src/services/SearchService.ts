import { getAllMarkets } from './aptosMarketService';
import type { MarketInfo } from './aptosMarketService';
import { NewsService } from './NewsService';
import { getMarketCardTitle, getMarketLogoSrc } from '../components/listaddressowner/ListAddressMarketCard';
import { getStandardPairName } from '../config/pairMapping';

export type SearchResult =
  | { type: 'market'; id: string; title: string; pair: string; cardTitle: string; strike: string; maturity: string; imgSrc: string }
  | { type: 'news'; id: string; title: string; url: string };

// Helper: build img src giống như trên card (unique per contract)
function getMarketImgSrc(market: any): string {
  const pairName = getStandardPairName(market.pair_name || '') || '';
  let baseToken = '';
  if (pairName && pairName.includes('/')) {
    baseToken = pairName.split('/')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }
  // Stable index: hash market_address (or _key) to 1-10
  function getStableIndex(key: string, max: number) {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) % 1000000007;
    }
    return (Math.abs(hash) % max) + 1;
  }
  const imgIndex = getStableIndex(market.market_address || market._key || pairName, 10);
  return baseToken ? `/images/${baseToken}/${baseToken}${imgIndex}.png` : '/images/coinbase.png';
}

export class SearchService {
  static async searchAll(keyword: string): Promise<SearchResult[]> {
    const lower = keyword.toLowerCase();
    // Search markets
    let marketResults: SearchResult[] = [];
    try {
      const markets = await getAllMarkets();
      // Build mảng market với _searchFields để filter
      const marketWithFields = markets
        .map((m: MarketInfo) => {
          // Mapping pair_name giống card: luôn dùng getStandardPairName từ price_feed_id nếu cần
          const pair_name = getStandardPairName(m.pair_name || m.price_feed_id || '');
          // Ép kiểu các trường về number giống card
          const strike_price = Number(m.strike_price);
          const maturity_time = Number(m.maturity_time);
          const marketObj = {
            ...m,
            pair_name,
            strike_price,
            maturity_time,
            fee_percentage: Number(m.fee_percentage),
            total_bids: Number(m.total_bids),
            long_bids: Number(m.long_bids),
            short_bids: Number(m.short_bids),
            total_amount: Number(m.total_amount),
            long_amount: Number(m.long_amount),
            short_amount: Number(m.short_amount),
            result: Number(m.result),
            is_resolved: !!m.is_resolved,
            bidding_start_time: Number(m.bidding_start_time),
            bidding_end_time: Number(m.bidding_end_time),
            final_price: Number(m.final_price),
            fee_withdrawn: !!m.fee_withdrawn,
            market_address: m.market_address,
            creator: m.creator,
          };
          // Tạo title giống hệt UI card (ListAddressMarketCard)
          const strike = (strike_price / 1e8).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const maturity = maturity_time ? new Date(maturity_time * 1000).toLocaleString() : '';
          const cardTitle = `${pair_name} will reach $${strike} by ${maturity}?`;
          const imgSrc = getMarketImgSrc(marketObj);
          // Chuẩn hóa title để search mạnh mẽ hơn
          const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9$./: ]/gi, '').replace(/\s+/g, ' ').trim();
          const _searchTitle = normalize(cardTitle);
          // Tách nhỏ các thành phần title để search từng phần
          const _searchFields = [
            pair_name,
            strike,
            maturity,
            m.strike_price,
            m.owner,
            m.market_address,
            m.fee_percentage,
            m.result,
            m.is_resolved ? 'resolved' : 'unresolved',
            m.created_at,
            cardTitle
          ].map(x => (x ? String(x).toLowerCase() : ''));
          return {
            m: { ...m, pair_name },
            cardTitle,
            imgSrc,
            _searchTitle,
            _searchFields
          };
        });
      marketResults = marketWithFields
        .filter((item) => {
          
          const normKeyword = (keyword: string) => keyword.toLowerCase().replace(/[^a-z0-9$./: ]/gi, '').replace(/\s+/g, ' ').trim();
          const searchKey = normKeyword(lower);
          return item._searchTitle.includes(searchKey);
        })
        .map(({ m, cardTitle, imgSrc, _searchFields }, i, arr) => ({
          type: 'market' as const,
          id: m.market_address,
          title: cardTitle,
          pair: m.pair_name,
          cardTitle,
          strike: _searchFields[1],
          maturity: _searchFields[2],
          imgSrc, 
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