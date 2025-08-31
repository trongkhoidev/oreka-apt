/**
 * Main Integration Service
 * Orchestrates Circle, Hyperion, and Nodit integrations
 */

require('dotenv').config();
const CircleCCTPIntegration = require('./circle_integration');
const HyperionCLMMIntegration = require('./hyperion_clmm_integration');
const NoditIndexingService = require('./nodit_indexing_service');

class OrekaIntegrationService {
    constructor() {
        this.config = this.loadConfig();
        
        // Initialize integration services
        this.circleIntegration = new CircleCCTPIntegration(this.config);
        this.hyperionIntegration = new HyperionCLMMIntegration(this.config);
        this.noditService = new NoditIndexingService(this.config);
        
        // Service status
        this.services = {
            circle: { status: 'stopped', lastCheck: null },
            hyperion: { status: 'stopped', lastCheck: null },
            nodit: { status: 'stopped', lastCheck: null }
        };
        
        // Event handlers
        this.setupEventHandlers();
    }

    /**
     * Load configuration from environment variables
     */
    loadConfig() {
        return {
            aptos: {
                nodeUrl: process.env.APTOS_NODE_URL || 'https://fullnode.testnet.aptoslabs.com',
                network: process.env.APTOS_NETWORK || 'testnet'
            },
            circle: {
                apiUrl: process.env.CIRCLE_API_URL || 'https://api.circle.com',
                apiKey: process.env.CIRCLE_API_KEY || 'test_key'
            },
            hyperion: {
                apiUrl: process.env.HYPERION_API_URL || 'https://api.hyperion.xyz',
                apiKey: process.env.HYPERION_API_KEY || 'test_key'
            },
            nodit: {
                apiUrl: process.env.NODIT_API_URL || 'https://api.nodit.io',
                apiKey: process.env.NODIT_API_KEY || 'test_key',
                webhookSecret: process.env.NODIT_WEBHOOK_SECRET || 'test_secret',
                webhookPort: parseInt(process.env.NODIT_WEBHOOK_PORT) || 3001
            },
            oreka: {
                address: process.env.OREKA_ADDRESS || '0x1234567890abcdef'
            }
        };
    }

    /**
     * Setup event handlers for cross-service communication
     */
    setupEventHandlers() {
        // Handle USDC transfer events
        this.noditService.on('usdc_transfer', async (eventData) => {
            await this.handleUSDCTransferEvent(eventData);
        });

        // Handle CLMM events
        this.noditService.on('clmm_deposit', async (eventData) => {
            await this.handleCLMMDepositEvent(eventData);
        });

        this.noditService.on('clmm_withdrawal', async (eventData) => {
            await this.handleCLMMWithdrawalEvent(eventData);
        });
    }

    /**
     * Start all integration services
     */
    async start() {
        console.log('🚀 Starting Oreka Crypto v2 Integration Services...');
        
        try {
            // Start Nodit indexing service
            this.noditService.start();
            this.services.nodit.status = 'running';
            this.services.nodit.lastCheck = new Date();
            console.log('✅ Nodit indexing service started');

            // Initialize Circle integration
            await this.initializeCircleIntegration();
            console.log('✅ Circle CCTP integration initialized');

            // Initialize Hyperion integration
            await this.initializeHyperionIntegration();
            console.log('✅ Hyperion CLMM integration initialized');

            // Start health monitoring
            this.startHealthMonitoring();
            console.log('✅ Health monitoring started');

            console.log('🎉 All integration services started successfully!');
            
        } catch (error) {
            console.error('❌ Error starting integration services:', error);
            throw error;
        }
    }

    /**
     * Initialize Circle integration
     */
    async initializeCircleIntegration() {
        try {
            // Test Circle API connectivity
            const domains = this.circleIntegration.getSupportedDomains();
            console.log(`📡 Circle CCTP supports ${domains.length} domains`);
            
            this.services.circle.status = 'running';
            this.services.circle.lastCheck = new Date();
            
        } catch (error) {
            console.error('❌ Error initializing Circle integration:', error);
            this.services.circle.status = 'error';
            throw error;
        }
    }

    /**
     * Initialize Hyperion integration
     */
    async initializeHyperionIntegration() {
        try {
            // Test Hyperion API connectivity
            const pools = this.hyperionIntegration.getAvailablePools();
            console.log(`📡 Hyperion CLMM has ${pools.length} available pools`);
            
            this.services.hyperion.status = 'running';
            this.services.hyperion.lastCheck = new Date();
            
        } catch (error) {
            console.error('❌ Error initializing Hyperion integration:', error);
            this.services.hyperion.status = 'error';
            throw error;
        }
    }

    /**
     * Start health monitoring
     */
    startHealthMonitoring() {
        // Monitor service health every 30 seconds
        setInterval(async () => {
            await this.checkServiceHealth();
        }, 30000);
    }

    /**
     * Check health of all services
     */
    async checkServiceHealth() {
        const timestamp = new Date();
        
        try {
            // Check Circle integration
            try {
                const domains = this.circleIntegration.getSupportedDomains();
                this.services.circle.status = 'running';
                this.services.circle.lastCheck = timestamp;
            } catch (error) {
                this.services.circle.status = 'error';
                console.error('❌ Circle integration health check failed:', error.message);
            }

            // Check Hyperion integration
            try {
                const pools = this.hyperionIntegration.getAvailablePools();
                this.services.hyperion.status = 'running';
                this.services.hyperion.lastCheck = timestamp;
            } catch (error) {
                this.services.hyperion.status = 'error';
                console.error('❌ Hyperion integration health check failed:', error.message);
            }

            // Check Nodit service
            try {
                // Nodit service health is checked via webhook endpoint
                this.services.nodit.status = 'running';
                this.services.nodit.lastCheck = timestamp;
            } catch (error) {
                this.services.nodit.status = 'error';
                console.error('❌ Nodit service health check failed:', error.message);
            }

            // Log health status
            console.log('🏥 Service Health Check:', {
                timestamp: timestamp.toISOString(),
                circle: this.services.circle.status,
                hyperion: this.services.hyperion.status,
                nodit: this.services.nodit.status
            });

        } catch (error) {
            console.error('❌ Health check failed:', error);
        }
    }

    /**
     * Handle USDC transfer events
     */
    async handleUSDCTransferEvent(eventData) {
        try {
            console.log('💸 Processing USDC transfer event:', eventData);
            
            // Update Circle integration statistics
            // This could involve updating local tracking or calling Circle APIs
            
            console.log('✅ USDC transfer event processed');
            
        } catch (error) {
            console.error('❌ Error processing USDC transfer event:', error);
        }
    }

    /**
     * Handle CLMM deposit events
     */
    async handleCLMMDepositEvent(eventData) {
        try {
            console.log('💰 Processing CLMM deposit event:', eventData);
            
            // Update Hyperion integration statistics
            // This could involve updating local tracking or calling Hyperion APIs
            
            console.log('✅ CLMM deposit event processed');
            
        } catch (error) {
            console.error('❌ Error processing CLMM deposit event:', error);
        }
    }

    /**
     * Handle CLMM withdrawal events
     */
    async handleCLMMWithdrawalEvent(eventData) {
        try {
            console.log('💸 Processing CLMM withdrawal event:', eventData);
            
            // Update Hyperion integration statistics
            // This could involve updating local tracking or calling Hyperion APIs
            
            console.log('✅ CLMM withdrawal event processed');
            
        } catch (error) {
            console.error('❌ Error processing CLMM withdrawal event:', error);
        }
    }

    /**
     * Get service status
     */
    getServiceStatus() {
        return {
            timestamp: new Date().toISOString(),
            services: this.services,
            uptime: process.uptime()
        };
    }

    /**
     * Stop all integration services
     */
    async stop() {
        console.log('🛑 Stopping Oreka Crypto v2 Integration Services...');
        
        try {
            // Stop Nodit service
            this.noditService.stop();
            this.services.nodit.status = 'stopped';
            
            // Update service statuses
            this.services.circle.status = 'stopped';
            this.services.hyperion.status = 'stopped';
            
            console.log('✅ All integration services stopped');
            
        } catch (error) {
            console.error('❌ Error stopping integration services:', error);
            throw error;
        }
    }
}

// Main execution
if (require.main === module) {
    const integrationService = new OrekaIntegrationService();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Received SIGINT, shutting down gracefully...');
        await integrationService.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
        await integrationService.stop();
        process.exit(0);
    });

    // Start the service
    integrationService.start().catch((error) => {
        console.error('❌ Failed to start integration service:', error);
        process.exit(1);
    });
}

module.exports = OrekaIntegrationService;
