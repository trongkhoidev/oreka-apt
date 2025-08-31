// Nodit Indexing Integration Service
import { 
  NODIT_INDEXER_URL,
  NODIT_WEBHOOK_URL
} from '@/config/contracts';
import type { NoditIndexInfo } from '@/types';

// Define proper types for API responses
interface IndexedMarketData {
  marketAddress: string;
  totalBets: number;
  totalVolume: string;
  outcomes: Array<{
    index: number;
    totalAmount: string;
    betCount: number;
  }>;
}

interface IndexedUserData {
  userAddress: string;
  totalBets: number;
  totalWinnings: string;
  markets: string[];
}

interface IndexedTransactionData {
  hash: string;
  blockNumber: number;
  timestamp: number;
  events: Array<{
    type: string;
    data: Record<string, unknown>;
  }>;
}

interface IndexedEvents {
  events: Array<{
    id: string;
    type: string;
    data: Record<string, unknown>;
    timestamp: number;
  }>;
  total: number;
  hasMore: boolean;
}

interface WebhookRegistration {
  webhook_id: string;
  status: string;
  message: string;
}

interface WebhookStatus {
  webhook_id: string;
  status: string;
  last_delivery: string;
  delivery_count: number;
}

interface IndexingStats {
  totalMarkets: number;
  totalUsers: number;
  totalTransactions: number;
  lastSync: string;
}

/**
 * Get Nodit indexing information
 * @returns Nodit indexing info or null
 */
export async function getNoditIndexInfo(): Promise<NoditIndexInfo | null> {
  try {
    // This would typically come from an external API or configuration
    return {
      indexerUrl: NODIT_INDEXER_URL,
      webhookUrl: NODIT_WEBHOOK_URL,
      isActive: true,
      lastSync: Date.now()
    };
  } catch (error) {
    console.error('[getNoditIndexInfo] Error:', error);
    return null;
  }
}

/**
 * Get indexed market data from Nodit
 * @param marketAddress Market address
 * @returns Indexed market data or null
 */
export async function getNoditIndexedMarketData(marketAddress: string): Promise<IndexedMarketData | null> {
  try {
    const response = await fetch(`${NODIT_INDEXER_URL}/markets/${marketAddress}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch indexed data: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[getNoditIndexedMarketData] Error:', error);
    return null;
  }
}

/**
 * Get indexed user data from Nodit
 * @param userAddress User address
 * @returns Indexed user data or null
 */
export async function getNoditIndexedUserData(userAddress: string): Promise<IndexedUserData | null> {
  try {
    const response = await fetch(`${NODIT_INDEXER_URL}/users/${userAddress}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch indexed data: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[getNoditIndexedUserData] Error:', error);
    return null;
  }
}

/**
 * Get indexed transaction data from Nodit
 * @param transactionHash Transaction hash
 * @returns Indexed transaction data or null
 */
export async function getNoditIndexedTransactionData(transactionHash: string): Promise<IndexedTransactionData | null> {
  try {
    const response = await fetch(`${NODIT_INDEXER_URL}/transactions/${transactionHash}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch indexed data: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[getNoditIndexedTransactionData] Error:', error);
    return null;
  }
}

/**
 * Get indexed events from Nodit
 * @param eventType Event type filter
 * @param limit Number of events to fetch
 * @param offset Offset for pagination
 * @returns Indexed events or null
 */
export async function getNoditIndexedEvents(
  eventType?: string,
  limit: number = 100,
  offset: number = 0
): Promise<IndexedEvents | null> {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });
    
    if (eventType) {
      params.append('event_type', eventType);
    }

    const response = await fetch(`${NODIT_INDEXER_URL}/events?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch indexed events: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[getNoditIndexedEvents] Error:', error);
    return null;
  }
}

/**
 * Register webhook with Nodit
 * @param webhookUrl Webhook URL to register
 * @param eventTypes Array of event types to listen for
 * @returns Registration result or null
 */
export async function registerNoditWebhook(
  webhookUrl: string,
  eventTypes: string[]
): Promise<WebhookRegistration | null> {
  try {
    const response = await fetch(`${NODIT_WEBHOOK_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhook_url: webhookUrl,
        event_types: eventTypes,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to register webhook: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[registerNoditWebhook] Error:', error);
    return null;
  }
}

/**
 * Unregister webhook from Nodit
 * @param webhookId Webhook ID to unregister
 * @returns Unregistration result or null
 */
export async function unregisterNoditWebhook(webhookId: string): Promise<WebhookRegistration | null> {
  try {
    const response = await fetch(`${NODIT_WEBHOOK_URL}/unregister`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhook_id: webhookId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to unregister webhook: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[unregisterNoditWebhook] Error:', error);
    return null;
  }
}

/**
 * Get webhook status from Nodit
 * @param webhookId Webhook ID
 * @returns Webhook status or null
 */
export async function getNoditWebhookStatus(webhookId: string): Promise<WebhookStatus | null> {
  try {
    const response = await fetch(`${NODIT_WEBHOOK_URL}/status/${webhookId}`);
    if (!response.ok) {
      throw new Error(`Failed to get webhook status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[getNoditWebhookStatus] Error:', error);
    return null;
  }
}

/**
 * Get Nodit indexing statistics
 * @returns Indexing statistics or null
 */
export async function getNoditIndexingStats(): Promise<IndexingStats | null> {
  try {
    const response = await fetch(`${NODIT_INDEXER_URL}/stats`);
    if (!response.ok) {
      throw new Error(`Failed to fetch indexing stats: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[getNoditIndexingStats] Error:', error);
    return null;
  }
}
