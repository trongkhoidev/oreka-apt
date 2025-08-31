/**
 * Nodit Indexing Service
 * Handles event indexing and webhook management via Nodit
 */

const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');

class NoditIndexingService {
    constructor(config) {
        this.config = config;
        this.noditApiUrl = config.nodit.apiUrl;
        this.noditApiKey = config.nodit.apiKey;
        this.webhookSecret = config.nodit.webhookSecret;
        
        // Express app for webhook endpoints
        this.app = express();
        this.app.use(bodyParser.json());
        
        // Webhook handlers
        this.setupWebhooks();
        
        // Event processing queue
        this.eventQueue = [];
        this.isProcessing = false;
    }

    /**
     * Setup webhook endpoints
     */
    setupWebhooks() {
        // Webhook endpoint for Nodit to send events
        this.app.post('/webhook/nodit', (req, res) => {
            this.handleNoditWebhook(req, res);
        });

        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ status: 'healthy', timestamp: new Date().toISOString() });
        });

        // Start webhook server
        const port = this.config.nodit.webhookPort || 3001;
        this.app.listen(port, () => {
            console.log(`Nodit webhook server listening on port ${port}`);
        });
    }

    /**
     * Handle incoming webhook from Nodit
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async handleNoditWebhook(req, res) {
        try {
            const { body, headers } = req;
            
            // Verify webhook signature (if configured)
            if (this.webhookSecret) {
                const signature = headers['x-nodit-signature'];
                if (!this.verifyWebhookSignature(body, signature)) {
                    return res.status(401).json({ error: 'Invalid signature' });
                }
            }

            // Process the webhook data
            const result = await this.processWebhookData(body);
            
            // Add to event queue for processing
            this.eventQueue.push({
                type: 'webhook',
                data: body,
                timestamp: new Date(),
                processed: false
            });

            // Process events if not already processing
            if (!this.isProcessing) {
                this.processEventQueue();
            }

            res.json({ 
                success: true, 
                message: 'Webhook processed successfully',
                eventsQueued: this.eventQueue.length
            });

        } catch (error) {
            console.error('Error processing webhook:', error);
            res.status(500).json({ 
                error: 'Internal server error',
                message: error.message 
            });
        }
    }

    /**
     * Process webhook data from Nodit
     * @param {Object} data - Webhook data
     * @returns {Object} - Processing result
     */
    async processWebhookData(data) {
        try {
            const { event_type, event_data, block_height, transaction_hash } = data;
            
            switch (event_type) {
                case 'market_created':
                    return await this.handleMarketCreated(event_data, block_height, transaction_hash);
                
                case 'bet_placed':
                    return await this.handleBetPlaced(event_data, block_height, transaction_hash);
                
                case 'market_resolved':
                    return await this.handleMarketResolved(event_data, block_height, transaction_hash);
                
                case 'prize_claimed':
                    return await this.handlePrizeClaimed(event_data, block_height, transaction_hash);
                
                case 'usdc_transfer':
                    return await this.handleUSDCTransfer(event_data, block_height, transaction_hash);
                
                case 'clmm_deposit':
                    return await this.handleCLMMDeposit(event_data, block_height, transaction_hash);
                
                case 'clmm_withdrawal':
                    return await this.handleCLMMWithdrawal(event_data, block_height, transaction_hash);
                
                default:
                    console.log(`Unknown event type: ${event_type}`);
                    return { processed: false, reason: 'Unknown event type' };
            }

        } catch (error) {
            console.error('Error processing webhook data:', error);
            throw error;
        }
    }

    /**
     * Handle market created event
     */
    async handleMarketCreated(eventData, blockHeight, transactionHash) {
        console.log(`Market created: ${eventData.market_id} at block ${blockHeight}`);
        
        // Update database with market information
        // This would typically involve updating a markets table
        
        return { processed: true, event: 'market_created' };
    }

    /**
     * Handle bet placed event
     */
    async handleBetPlaced(eventData, blockHeight, transactionHash) {
        console.log(`Bet placed: ${eventData.bet_id} on market ${eventData.market_id}`);
        
        // Update database with bet information
        // This would typically involve updating a bets table
        
        return { processed: true, event: 'bet_placed' };
    }

    /**
     * Handle market resolved event
     */
    async handleMarketResolved(eventData, blockHeight, transactionHash) {
        console.log(`Market resolved: ${eventData.market_id} with outcome ${eventData.winning_outcome}`);
        
        // Update database with market resolution
        // This would typically involve updating a markets table
        
        return { processed: true, event: 'market_resolved' };
    }

    /**
     * Handle prize claimed event
     */
    async handlePrizeClaimed(eventData, blockHeight, transactionHash) {
        console.log(`Prize claimed: ${eventData.claim_id} for user ${eventData.user_address}`);
        
        // Update database with prize claim
        // This would typically involve updating a claims table
        
        return { processed: true, event: 'prize_claimed' };
    }

    /**
     * Handle USDC transfer event
     */
    async handleUSDCTransfer(eventData, blockHeight, transactionHash) {
        console.log(`USDC transfer: ${eventData.amount} from ${eventData.from} to ${eventData.to}`);
        
        // Update database with USDC transfer
        // This would typically involve updating a transfers table
        
        return { processed: true, event: 'usdc_transfer' };
    }

    /**
     * Handle CLMM deposit event
     */
    async handleCLMMDeposit(eventData, blockHeight, transactionHash) {
        console.log(`CLMM deposit: ${eventData.amount} to pool ${eventData.pool_address}`);
        
        // Update database with CLMM deposit
        // This would typically involve updating a clmm_deposits table
        
        return { processed: true, event: 'clmm_deposit' };
    }

    /**
     * Handle CLMM withdrawal event
     */
    async handleCLMMWithdrawal(eventData, blockHeight, transactionHash) {
        console.log(`CLMM withdrawal: ${eventData.amount} from pool ${eventData.pool_address}`);
        
        // Update database with CLMM withdrawal
        // This would typically involve updating a clmm_withdrawals table
        
        return { processed: true, event: 'clmm_withdrawal' };
    }

    /**
     * Process event queue
     */
    async processEventQueue() {
        if (this.isProcessing || this.eventQueue.length === 0) {
            return;
        }

        this.isProcessing = true;
        console.log(`Processing ${this.eventQueue.length} events from queue`);

        try {
            while (this.eventQueue.length > 0) {
                const event = this.eventQueue.shift();
                
                if (!event.processed) {
                    await this.processEvent(event);
                    event.processed = true;
                }
            }

        } catch (error) {
            console.error('Error processing event queue:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Process individual event
     * @param {Object} event - Event to process
     */
    async processEvent(event) {
        try {
            // Process the event based on its type
            if (event.type === 'webhook') {
                await this.processWebhookData(event.data);
            }
            
            // Additional processing logic can be added here
            
        } catch (error) {
            console.error('Error processing event:', error);
        }
    }

    /**
     * Query indexed data from Nodit
     * @param {Object} query - Query parameters
     * @returns {Object} - Query result
     */
    async queryIndexedData(query) {
        try {
            const response = await axios.get(
                `${this.noditApiUrl}/query`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.noditApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    params: query
                }
            );

            return response.data;

        } catch (error) {
            console.error('Error querying indexed data:', error);
            return {
                error: error.message
            };
        }
    }

    /**
     * Get market statistics
     * @returns {Object} - Market statistics
     */
    async getMarketStats() {
        return await this.queryIndexedData({
            type: 'market_stats',
            timeRange: '24h'
        });
    }

    /**
     * Get user betting history
     * @param {string} userAddress - User address
     * @returns {Object} - User betting history
     */
    async getUserBettingHistory(userAddress) {
        return await this.queryIndexedData({
            type: 'user_betting_history',
            userAddress,
            limit: 100
        });
    }

    /**
     * Get leaderboard data
     * @param {string} timeRange - Time range for leaderboard
     * @returns {Object} - Leaderboard data
     */
    async getLeaderboard(timeRange = '7d') {
        return await this.queryIndexedData({
            type: 'leaderboard',
            timeRange,
            limit: 50
        });
    }

    /**
     * Verify webhook signature
     * @param {Object} body - Request body
     * @param {string} signature - Webhook signature
     * @returns {boolean} - Whether signature is valid
     */
    verifyWebhookSignature(body, signature) {
        // In a real implementation, this would verify the webhook signature
        // For now, we'll return true if signature exists
        return !!signature;
    }

    /**
     * Start the indexing service
     */
    start() {
        console.log('Nodit indexing service started');
        console.log(`Webhook server running on port ${this.config.nodit.webhookPort || 3001}`);
        
        // Start event processing loop
        setInterval(() => {
            if (!this.isProcessing && this.eventQueue.length > 0) {
                this.processEventQueue();
            }
        }, 5000); // Check every 5 seconds
    }

    /**
     * Stop the indexing service
     */
    stop() {
        console.log('Nodit indexing service stopped');
        // Cleanup logic can be added here
    }
}

module.exports = NoditIndexingService;
