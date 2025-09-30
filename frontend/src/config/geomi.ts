// Network-aware Pyth price feed IDs (64-hex, no 0x for Hermes; with 0x elsewhere if needed)
// Use these ids for fetching latest_vaas and validating market.price_feed_id
export const PYTH_PRICE_IDS: Record<string, Record<string, string>> = {
  testnet: {
    // Per user's request, align testnet mapping to these ids
    'APT/USD': '03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5',
    'BTC/USD': 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
    'ETH/USD': 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
    'SOL/USD': 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
    'SUI/USD': '23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744',
    'WETH/USD': '9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6'
  },
  mainnet: {
    'APT/USD': '03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5',
    'BTC/USD': 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
    'ETH/USD': 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
    'SOL/USD': 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
    'SUI/USD': '23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744',
    'BNB/USD': '2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f',
    'WETH/USD': '9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6'
  }
};

export function getPythPriceId(symbol: string, network: string): string | null {
  const net = network.toLowerCase();
  const map = PYTH_PRICE_IDS[net];
  if (!map) return null;
  const key = symbol.toUpperCase();
  return map[key] || null;
}

// Geomi API configuration for better rate limits and performance
export const GEOMI_CONFIG = {
  // Get API key from https://geomi.io
  API_KEY: process.env.NEXT_PUBLIC_GEOMI_API_KEY || '',
  BASE_URL: 'https://api.geomi.io/v1',
  NETWORK: 'testnet', // or 'mainnet'
  
  // Rate limiting settings
  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: 100,
    BURST_LIMIT: 20,
    RETRY_DELAY: 1000, // 1 second
    MAX_RETRIES: 3
  }
};

// Geomi API endpoints
export const GEOMI_ENDPOINTS = {
  ACCOUNT_RESOURCE: (address: string, resourceType: string) => 
    `${GEOMI_CONFIG.BASE_URL}/accounts/${address}/resources/${resourceType}`,
  
  VIEW_FUNCTION: () => 
    `${GEOMI_CONFIG.BASE_URL}/view`,
  
  EVENTS: (address: string, eventType: string) => 
    `${GEOMI_CONFIG.BASE_URL}/accounts/${address}/events/${eventType}`,
  
  TRANSACTIONS: () => 
    `${GEOMI_CONFIG.BASE_URL}/transactions`
};

// Helper function to make Geomi API calls
export async function makeGeomiRequest(endpoint: string, options: RequestInit = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${GEOMI_CONFIG.API_KEY}`,
    ...options.headers
  };

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!response.ok) {
    throw new Error(`Geomi API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Rate limiting helper
export class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    // If we're at the limit, wait
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      
      if (waitTime > 0) {
        console.log(`[RateLimiter] Waiting ${waitTime}ms to avoid rate limit`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Record this request
    this.requests.push(now);
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter(
  GEOMI_CONFIG.RATE_LIMIT.REQUESTS_PER_MINUTE,
  60000
);
