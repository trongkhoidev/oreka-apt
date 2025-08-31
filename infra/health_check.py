#!/usr/bin/env python3
"""
Oreka Crypto v2 Health Check Service
Monitors the health of all platform components and sends alerts
"""

import os
import time
import requests
import psycopg2
import redis
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class OrekaHealthChecker:
    def __init__(self):
        self.config = self._load_config()
        self.health_status = {}
        self.last_check = None
        
    def _load_config(self) -> Dict:
        """Load configuration from environment variables"""
        return {
            'aptos_node_url': os.getenv('APTOS_NODE_URL', 'https://fullnode.mainnet.aptoslabs.com'),
            'account_address': os.getenv('ACCOUNT_ADDRESS'),
            'database_url': os.getenv('DATABASE_URL'),
            'redis_url': os.getenv('REDIS_URL'),
            'api_gateway_url': os.getenv('API_GATEWAY_URL', 'http://localhost:3000'),
            'nodit_url': os.getenv('NODIT_URL', 'http://localhost:3001'),
            'hyperion_url': os.getenv('HYPERION_URL', 'http://localhost:3002'),
            'circle_url': os.getenv('CIRCLE_URL', 'http://localhost:3003'),
            'check_interval': int(os.getenv('HEALTH_CHECK_INTERVAL', '30')),
            'alerting_enabled': os.getenv('ALERTING_ENABLED', 'true').lower() == 'true'
        }
    
    def check_aptos_node(self) -> Dict:
        """Check Aptos node health"""
        try:
            start_time = time.time()
            response = requests.get(f"{self.config['aptos_node_url']}/v1", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                return {
                    'status': 'healthy',
                    'response_time': response_time,
                    'last_updated': datetime.now().isoformat()
                }
            else:
                return {
                    'status': 'unhealthy',
                    'error': f"HTTP {response.status_code}",
                    'last_updated': datetime.now().isoformat()
                }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'last_updated': datetime.now().isoformat()
            }
    
    def check_database(self) -> Dict:
        """Check PostgreSQL database health"""
        try:
            if not self.config['database_url']:
                return {
                    'status': 'unknown',
                    'error': 'Database URL not configured',
                    'last_updated': datetime.now().isoformat()
                }
            
            start_time = time.time()
            conn = psycopg2.connect(self.config['database_url'])
            cursor = conn.cursor()
            
            # Check basic connectivity
            cursor.execute("SELECT 1")
            cursor.fetchone()
            
            # Check table counts
            cursor.execute("""
                SELECT 
                    COUNT(*) as markets,
                    (SELECT COUNT(*) FROM bets) as bets,
                    (SELECT COUNT(*) FROM users) as users
                FROM markets
            """)
            counts = cursor.fetchone()
            
            response_time = time.time() - start_time
            cursor.close()
            conn.close()
            
            return {
                'status': 'healthy',
                'response_time': response_time,
                'counts': {
                    'markets': counts[0],
                    'bets': counts[1],
                    'users': counts[2]
                },
                'last_updated': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'last_updated': datetime.now().isoformat()
            }
    
    def check_redis(self) -> Dict:
        """Check Redis cache health"""
        try:
            if not self.config['redis_url']:
                return {
                    'status': 'unknown',
                    'error': 'Redis URL not configured',
                    'last_updated': datetime.now().isoformat()
                }
            
            start_time = time.time()
            r = redis.from_url(self.config['redis_url'])
            
            # Test basic operations
            r.set('health_check', 'test', ex=60)
            value = r.get('health_check')
            r.delete('health_check')
            
            response_time = time.time() - start_time
            
            if value == b'test':
                return {
                    'status': 'healthy',
                    'response_time': response_time,
                    'last_updated': datetime.now().isoformat()
                }
            else:
                return {
                    'status': 'unhealthy',
                    'error': 'Redis operation failed',
                    'last_updated': datetime.now().isoformat()
                }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'last_updated': datetime.now().isoformat()
            }
    
    def check_api_gateway(self) -> Dict:
        """Check API Gateway health"""
        try:
            start_time = time.time()
            response = requests.get(f"{self.config['api_gateway_url']}/health", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'status': 'healthy',
                    'response_time': response_time,
                    'uptime': data.get('uptime'),
                    'version': data.get('version'),
                    'last_updated': datetime.now().isoformat()
                }
            else:
                return {
                    'status': 'unhealthy',
                    'error': f"HTTP {response.status_code}",
                    'last_updated': datetime.now().isoformat()
                }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'last_updated': datetime.now().isoformat()
            }
    
    def check_nodit_indexer(self) -> Dict:
        """Check Nodit indexing service health"""
        try:
            start_time = time.time()
            response = requests.get(f"{self.config['nodit_url']}/health", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'status': 'healthy',
                    'response_time': response_time,
                    'last_block': data.get('last_block'),
                    'events_processed': data.get('events_processed'),
                    'last_updated': datetime.now().isoformat()
                }
            else:
                return {
                    'status': 'unhealthy',
                    'error': f"HTTP {response.status_code}",
                    'last_updated': datetime.now().isoformat()
                }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'last_updated': datetime.now().isoformat()
            }
    
    def check_hyperion_clmm(self) -> Dict:
        """Check Hyperion CLMM service health"""
        try:
            start_time = time.time()
            response = requests.get(f"{self.config['hyperion_url']}/health", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'status': 'healthy',
                    'response_time': response_time,
                    'total_deposited': data.get('total_deposited'),
                    'total_yield': data.get('total_yield'),
                    'last_updated': datetime.now().isoformat()
                }
            else:
                return {
                    'status': 'unhealthy',
                    'error': f"HTTP {response.status_code}",
                    'last_updated': datetime.now().isoformat()
                }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'last_updated': datetime.now().isoformat()
            }
    
    def check_circle_usdc(self) -> Dict:
        """Check Circle USDC service health"""
        try:
            start_time = time.time()
            response = requests.get(f"{self.config['circle_url']}/health", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'status': 'healthy',
                    'response_time': response_time,
                    'usdc_balance': data.get('usdc_balance'),
                    'last_updated': datetime.now().isoformat()
                }
            else:
                return {
                    'status': 'unhealthy',
                    'error': f"HTTP {response.status_code}",
                    'last_updated': datetime.now().isoformat()
                }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'last_updated': datetime.now().isoformat()
            }
    
    def run_health_checks(self) -> Dict:
        """Run all health checks"""
        logger.info("Starting health checks...")
        
        self.health_status = {
            'timestamp': datetime.now().isoformat(),
            'overall_status': 'healthy',
            'components': {
                'aptos_node': self.check_aptos_node(),
                'database': self.check_database(),
                'redis': self.check_redis(),
                'api_gateway': self.check_api_gateway(),
                'nodit_indexer': self.check_nodit_indexer(),
                'hyperion_clmm': self.check_hyperion_clmm(),
                'circle_usdc': self.check_circle_usdc()
            }
        }
        
        # Determine overall status
        unhealthy_components = [
            name for name, status in self.health_status['components'].items()
            if status['status'] == 'unhealthy'
        ]
        
        if unhealthy_components:
            self.health_status['overall_status'] = 'unhealthy'
            self.health_status['unhealthy_components'] = unhealthy_components
        
        self.last_check = datetime.now()
        logger.info(f"Health checks completed. Overall status: {self.health_status['overall_status']}")
        
        return self.health_status
    
    def send_alert(self, message: str, severity: str = 'warning'):
        """Send alert if alerting is enabled"""
        if not self.config['alerting_enabled']:
            return
        
        # In a real implementation, this would send alerts via:
        # - Email
        # - Slack
        # - PagerDuty
        # - Webhook
        
        logger.warning(f"ALERT [{severity.upper()}]: {message}")
        
        # Example webhook alert
        try:
            webhook_url = os.getenv('ALERT_WEBHOOK_URL')
            if webhook_url:
                payload = {
                    'text': f"[{severity.upper()}] Oreka Health Check Alert",
                    'message': message,
                    'timestamp': datetime.now().isoformat(),
                    'severity': severity
                }
                requests.post(webhook_url, json=payload, timeout=10)
        except Exception as e:
            logger.error(f"Failed to send alert: {e}")
    
    def generate_report(self) -> str:
        """Generate a human-readable health report"""
        if not self.health_status:
            return "No health check data available"
        
        report = f"""
Oreka Crypto v2 Health Report
Generated: {self.health_status['timestamp']}
Overall Status: {self.health_status['overall_status'].upper()}

Component Status:
"""
        
        for component_name, status in self.health_status['components'].items():
            report += f"  {component_name.replace('_', ' ').title()}: {status['status'].upper()}\n"
            if status['status'] == 'unhealthy' and 'error' in status:
                report += f"    Error: {status['error']}\n"
            if 'response_time' in status:
                report += f"    Response Time: {status['response_time']:.3f}s\n"
        
        if 'unhealthy_components' in self.health_status:
            report += f"\nUnhealthy Components: {', '.join(self.health_status['unhealthy_components'])}\n"
        
        return report
    
    def run_continuous_monitoring(self):
        """Run continuous health monitoring"""
        logger.info("Starting continuous health monitoring...")
        
        while True:
            try:
                health_status = self.run_health_checks()
                
                # Send alerts for unhealthy components
                if health_status['overall_status'] == 'unhealthy':
                    unhealthy_msg = f"Platform health check failed. Unhealthy components: {', '.join(health_status['unhealthy_components'])}"
                    self.send_alert(unhealthy_msg, 'critical')
                
                # Log health status
                logger.info(self.generate_report())
                
                # Wait for next check
                time.sleep(self.config['check_interval'])
                
            except KeyboardInterrupt:
                logger.info("Health monitoring stopped by user")
                break
            except Exception as e:
                logger.error(f"Error in health monitoring: {e}")
                self.send_alert(f"Health monitoring error: {e}", 'critical')
                time.sleep(self.config['check_interval'])

def main():
    """Main entry point"""
    checker = OrekaHealthChecker()
    
    # Check command line arguments
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == '--once':
        # Run health check once
        health_status = checker.run_health_checks()
        print(checker.generate_report())
        
        # Exit with error code if unhealthy
        if health_status['overall_status'] == 'unhealthy':
            sys.exit(1)
    else:
        # Run continuous monitoring
        checker.run_continuous_monitoring()

if __name__ == '__main__':
    main()
