/**
 * Pyth Network Integration Utilities
 * Centralized utilities for Pyth price feed integration
 */

// Network-aware Pyth price feed IDs (64-hex, no 0x for Hermes; with 0x elsewhere if needed)
// Use these ids for fetching latest_vaas and validating market.price_feed_id
export const PYTH_PRICE_IDS: Record<string, Record<string, string>> = {
  testnet: {
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

// Mapping from price_feed_id (hex string) to pair_name
export const PRICE_FEED_ID_TO_PAIR: Record<string, string> = {
  "03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5": "APT/USD",
  "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43": "BTC/USD",
  "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace": "ETH/USD",
  "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d": "SOL/USD",
  "23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744": "SUI/USD",
  "2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f": "BNB/USD",
  "9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6": "WETH/USD",
};

/**
 * Get Pyth price feed ID for a symbol and network
 * @param symbol Trading pair symbol (e.g., 'BTC/USD')
 * @param network Network name ('mainnet' or 'testnet')
 * @returns Price feed ID string or null if not found
 */
export function getPythPriceId(symbol: string, network: string): string | null {
  const net = network.toLowerCase();
  return PYTH_PRICE_IDS[net]?.[symbol] || null;
}

/**
 * Get trading pair name from price feed ID
 * @param priceFeedId 64-character hex string price feed ID
 * @returns Trading pair name or empty string if not found
 */
export function getPairFromPriceFeedId(priceFeedId: string): string {
  return PRICE_FEED_ID_TO_PAIR[priceFeedId] || '';
}

/**
 * Convert price feed ID to hex string format
 * Handles various input formats (array of bytes, string with/without 0x prefix)
 * @param priceFeedId Input price feed ID in various formats
 * @returns 64-character hex string (no 0x prefix) or empty string if invalid
 */
export function normalizePriceFeedId(priceFeedId: unknown): string {
  if (!priceFeedId) return '';
  
  if (typeof priceFeedId === 'string') {
    // Remove 0x prefix if present
    const clean = priceFeedId.startsWith('0x') ? priceFeedId.slice(2) : priceFeedId;
    
    // If it's already a 64-character hex string, return it
    if (/^[0-9a-fA-F]{64}$/.test(clean)) {
      return clean.toLowerCase();
    }
    
    // If it's base64 encoded, try to decode it
    if (clean.length > 64) {
      try {
        const decoded = atob(clean);
        const hex = Array.from(decoded).map(byte => byte.toString(16).padStart(2, '0')).join('');
        if (hex.length === 64) {
          return hex.toLowerCase();
        }
      } catch (error) {
        console.warn('Failed to decode base64 price_feed_id:', error);
      }
    }
    
    return '';
  }
  
  if (Array.isArray(priceFeedId)) {
    // Convert byte array to hex string
    const hexString = priceFeedId
      .filter(x => typeof x === 'number' && !isNaN(x) && x >= 0 && x <= 255)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    if (hexString.length === 64) {
      return hexString;
    }
  }
  
  return '';
}

/**
 * Validate price feed ID format
 * @param priceFeedId Price feed ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidPriceFeedId(priceFeedId: unknown): boolean {
  const normalized = normalizePriceFeedId(priceFeedId);
  return normalized.length === 64 && /^[0-9a-f]{64}$/.test(normalized);
}

/**
 * Decode base64 string to byte array with error handling
 * @param base64 Base64 encoded string
 * @returns Array of byte values (0-255)
 * @throws Error if base64 is invalid or decoding fails
 */
export function base64ToBytes(base64: string): number[] {
  try {
    // Validate base64 format
    if (!base64 || typeof base64 !== 'string') {
      throw new Error('Invalid base64 input: must be a non-empty string');
    }
    
    // Standard base64 decode, do not trim any characters
    const binary = atob(base64);
    const arr = Array.from(binary, (char) => char.charCodeAt(0));
    
    // Validate decoded data
    if (arr.length === 0) {
      throw new Error('Base64 decoded to empty byte array');
    }
    
    console.log('[base64ToBytes] base64 đầu:', base64.slice(0, 32), '... length:', base64.length, '-> bytes length:', arr.length, 'first bytes:', arr.slice(0, 8), 'last bytes:', arr.slice(-8));
    return arr;
  } catch (error) {
    console.error('[base64ToBytes] Error decoding base64:', error, 'input:', base64.slice(0, 64));
    throw new Error(`Failed to decode base64 VAA data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetch latest VAA data from Hermes API
 * @param priceFeedId 64-character hex string price feed ID
 * @returns Promise resolving to array of VAA strings
 * @throws Error if API call fails or returns invalid data
 */
export async function fetchLatestVAA(priceFeedId: string): Promise<string[]> {
  // Validate price feed ID
  if (!isValidPriceFeedId(priceFeedId)) {
    throw new Error(`Invalid price_feed_id: expected 64-character hex string, got: ${priceFeedId}`);
  }

  // Try multiple Hermes endpoints for better compatibility
  const endpoints = [
    `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${priceFeedId}`,
    `https://hermes.pyth.network/api/latest_vaas?ids[]=${priceFeedId}`,
    `https://xc-mainnet.pyth.network/api/latest_vaas?ids[]=${priceFeedId}`
  ];

  for (let i = 0; i < endpoints.length; i++) {
    const url = endpoints[i];
    console.log(`[fetchLatestVAA] Trying endpoint ${i + 1}/${endpoints.length}:`, url);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      const responseText = await response.text();
      console.log(`[fetchLatestVAA] Response from endpoint ${i + 1}:`, response.status, responseText.slice(0, 200));
      
      if (!response.ok) {
        console.warn(`[fetchLatestVAA] Endpoint ${i + 1} failed:`, response.status, response.statusText);
        continue; // Try next endpoint
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.warn(`[fetchLatestVAA] JSON parse error on endpoint ${i + 1}:`, parseError);
        continue; // Try next endpoint
      }
      
      // Handle different response formats
      let vaas: string[] = [];
      if (Array.isArray(data)) {
        vaas = data;
      } else if (data && Array.isArray(data.vaas)) {
        vaas = data.vaas;
      } else if (data && data.binary) {
        // Handle v2 API response format - check encoding
        if (data.binary.encoding === 'hex' && Array.isArray(data.binary.data)) {
          // Convert hex strings to base64
          vaas = data.binary.data.map((hexStr: string) => {
            try {
              // Remove any 0x prefix
              const cleanHex = hexStr.startsWith('0x') ? hexStr.slice(2) : hexStr;
              // Convert hex to bytes then to base64 (browser compatible)
              const bytes = new Uint8Array(cleanHex.length / 2);
              for (let i = 0; i < cleanHex.length; i += 2) {
                bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
              }
              // Convert bytes to base64
              const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
              return btoa(binary);
            } catch (error) {
              console.warn(`[fetchLatestVAA] Failed to convert hex to base64:`, error);
              return hexStr; // Return as-is if conversion fails
            }
          });
        } else if (Array.isArray(data.binary.data)) {
          vaas = data.binary.data;
        }
      } else if (data && Array.isArray(data.updates)) {
        // Handle another possible format
        vaas = data.updates;
      }
      
      // Validate VAA data
      if (!vaas || vaas.length === 0) {
        console.warn(`[fetchLatestVAA] No VAA data from endpoint ${i + 1}`);
        continue; // Try next endpoint
      }

      // Additional validation: check VAA length and format
      const validVaas = vaas.filter(vaa => {
        if (typeof vaa !== 'string' || vaa.length === 0) return false;
        try {
          // Try to decode base64 to ensure it's valid
          atob(vaa);
          return true;
        } catch {
          return false;
        }
      });

      if (validVaas.length === 0) {
        console.warn(`[fetchLatestVAA] No valid VAA data from endpoint ${i + 1}`);
        continue; // Try next endpoint
      }
      
      console.log(`[fetchLatestVAA] Success with endpoint ${i + 1}:`, validVaas.length, 'valid VAAs, first VAA length:', validVaas[0]?.length);
      return validVaas;
    } catch (error) {
      console.warn(`[fetchLatestVAA] Error with endpoint ${i + 1}:`, error);
      continue; // Try next endpoint
    }
  }
  
  throw new Error('All Hermes API endpoints failed. Please check your network connection and try again.');
}

/**
 * Validate VAA data format and structure
 * @param vaas Array of VAA strings
 * @returns Validated VAA data
 * @throws Error if VAA data is invalid
 */
export function validateVAAData(vaas: string[]): string[] {
  if (!vaas || vaas.length === 0) {
    throw new Error('No VAA data provided');
  }

  const validVaas: string[] = [];
  
  for (let i = 0; i < vaas.length; i++) {
    const vaa = vaas[i];
    
    // Basic validation
    if (typeof vaa !== 'string') {
      console.warn(`[validateVAAData] VAA ${i} is not a string:`, typeof vaa);
      continue;
    }
    
    if (vaa.length === 0) {
      console.warn(`[validateVAAData] VAA ${i} is empty`);
      continue;
    }
    
    // Try to decode base64
    try {
      const decoded = atob(vaa);
      if (decoded.length === 0) {
        console.warn(`[validateVAAData] VAA ${i} decoded to empty data`);
        continue;
      }
      
      // Check minimum VAA length (VAA should be at least 100+ bytes)
      if (decoded.length < 100) {
        console.warn(`[validateVAAData] VAA ${i} too short:`, decoded.length, 'bytes');
        continue;
      }
      
      // Check maximum VAA length (VAA shouldn't be too large)
      if (decoded.length > 10000) {
        console.warn(`[validateVAAData] VAA ${i} too large:`, decoded.length, 'bytes');
        continue;
      }
      
      // Check VAA header structure - VAA should start with proper magic bytes
      // Valid VAA should start with specific patterns, not random high values
      const firstByte = decoded.charCodeAt(0);
      const secondByte = decoded.charCodeAt(1);
      const thirdByte = decoded.charCodeAt(2);
      const fourthByte = decoded.charCodeAt(3);
      
      // Check for valid VAA header patterns
      // VAA v1 typically starts with 0x01, v2 with 0x02
      // Pyth Network Aptos updates start with "PNAU" (0x50 0x4e 0x41 0x55)
      const isValidHeader = (
        (firstByte === 0x01 && secondByte === 0x00) || // VAA v1
        (firstByte === 0x02 && secondByte === 0x00) || // VAA v2
        (firstByte === 0x50 && secondByte === 0x4e && thirdByte === 0x41 && fourthByte === 0x55) || // "PNAU" - Pyth Network Aptos Update
        (firstByte === 0x50 && secondByte === 0x4e) || // "PN" - Pyth Network magic
        (firstByte >= 0x01 && firstByte <= 0x10 && secondByte <= 0x10) // Reasonable version range
      );
      
      if (!isValidHeader) {
        console.warn(`[validateVAAData] VAA ${i} has invalid header:`, {
          first4Bytes: [firstByte, secondByte, thirdByte, fourthByte],
          hex: Array.from(decoded.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join(' ')
        });
        continue;
      }
      
      console.log(`[validateVAAData] VAA ${i} validated:`, {
        length: decoded.length,
        header: [firstByte, secondByte, thirdByte, fourthByte],
        firstBytes: Array.from(decoded.slice(0, 8)).map(b => b.charCodeAt(0))
      });
      
      validVaas.push(vaa);
    } catch (error) {
      console.warn(`[validateVAAData] VAA ${i} base64 decode failed:`, error);
      continue;
    }
  }
  
  if (validVaas.length === 0) {
    throw new Error('No valid VAA data found. All VAAs failed validation.');
  }
  
  console.log(`[validateVAAData] Validation complete: ${validVaas.length}/${vaas.length} VAAs valid`);
  return validVaas;
}

/**
 * Test VAA data compatibility with Aptos Pyth contract
 * @param vaas Array of VAA strings
 * @returns Promise resolving to test results
 */
export async function testVAAData(vaas: string[]): Promise<{
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  for (let i = 0; i < vaas.length; i++) {
    const vaa = vaas[i];
    
    try {
      const decoded = atob(vaa);
      
      // Check VAA size
      if (decoded.length > 5000) {
        issues.push(`VAA ${i} is very large (${decoded.length} bytes) - this might cause transaction issues`);
        recommendations.push('Consider using a smaller VAA or splitting the update');
      }
      
      // Check for PNAU header
      if (decoded.length >= 4) {
        const header = Array.from(decoded.slice(0, 4)).map(b => b.charCodeAt(0));
        if (header[0] === 80 && header[1] === 78 && header[2] === 65 && header[3] === 85) {
          console.log(`[testVAAData] VAA ${i} has valid PNAU header`);
        } else {
          issues.push(`VAA ${i} has unexpected header: [${header.join(', ')}]`);
          recommendations.push('Ensure VAA has proper PNAU header for Aptos Pyth integration');
        }
      }
      
      // Check for reasonable structure
      if (decoded.length < 200) {
        issues.push(`VAA ${i} seems too short (${decoded.length} bytes) for a complete price update`);
        recommendations.push('Verify VAA contains complete price data');
      }
      
    } catch (error) {
      issues.push(`VAA ${i} failed to decode: ${error instanceof Error ? error.message : 'Unknown error'}`);
      recommendations.push('Check VAA base64 encoding');
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  };
}

/**
 * Enhanced VAA fetching with validation
 * @param priceFeedId 64-character hex string price feed ID
 * @returns Promise resolving to validated VAA strings
 * @throws Error if API call fails or returns invalid data
 */
export async function fetchAndValidateVAA(priceFeedId: string): Promise<string[]> {
  const vaas = await fetchLatestVAA(priceFeedId);
  const validatedVaas = validateVAAData(vaas);
  
  // Test VAA data compatibility
  const testResult = await testVAAData(validatedVaas);
  if (!testResult.isValid) {
    console.warn('[fetchAndValidateVAA] VAA compatibility issues:', testResult.issues);
    console.warn('[fetchAndValidateVAA] Recommendations:', testResult.recommendations);
  }
  
  return validatedVaas;
}
