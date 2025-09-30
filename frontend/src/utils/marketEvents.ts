// Utility functions for market-related events

/**
 * Dispatch a market update event to notify all market cards to refresh
 * @param marketAddress - The address of the market that was updated
 * @param eventType - Type of event (bid, resolve, claim, etc.)
 * @param additionalData - Any additional data to pass with the event
 */
export function dispatchMarketUpdate(
  marketAddress: string, 
  eventType: 'bid' | 'resolve' | 'claim' | 'withdraw' | 'create' = 'bid',
  additionalData?: Record<string, unknown>
): void {
  const event = new CustomEvent('marketUpdate', {
    detail: {
      marketAddress,
      eventType,
      timestamp: Date.now(),
      ...additionalData
    }
  });
  
  console.log('[dispatchMarketUpdate] Dispatching market update event:', event.detail);
  window.dispatchEvent(event);
}

/**
 * Dispatch a global market list refresh event
 * This can be used when new markets are created or major changes occur
 */
export function dispatchMarketListRefresh(): void {
  const event = new CustomEvent('marketListRefresh', {
    detail: {
      timestamp: Date.now()
    }
  });
  
  console.log('[dispatchMarketListRefresh] Dispatching market list refresh event');
  window.dispatchEvent(event);
}

/**
 * Listen for market update events
 * @param callback - Function to call when market update events are received
 * @returns Function to remove the event listener
 */
export function onMarketUpdate(
  callback: (event: CustomEvent) => void
): () => void {
  const handler = (event: Event) => {
    callback(event as CustomEvent);
  };
  
  window.addEventListener('marketUpdate', handler);
  
  return () => {
    window.removeEventListener('marketUpdate', handler);
  };
}

/**
 * Listen for market list refresh events
 * @param callback - Function to call when market list refresh events are received
 * @returns Function to remove the event listener
 */
export function onMarketListRefresh(
  callback: (event: CustomEvent) => void
): () => void {
  const handler = (event: Event) => {
    callback(event as CustomEvent);
  };
  
  window.addEventListener('marketListRefresh', handler);
  
  return () => {
    window.removeEventListener('marketListRefresh', handler);
  };
}
