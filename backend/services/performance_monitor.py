# backend/services/performance_monitor.py

import time
import psutil
import logging
from datetime import datetime, timedelta
from functools import wraps
from models import db
from sqlalchemy import text

class PerformanceMonitor:
    """Monitor application performance and system resources"""
    
    def __init__(self):
        self.logger = logging.getLogger('performance')
        self.metrics = {
            'api_calls': {},
            'slow_queries': [],
            'error_counts': {},
            'system_resources': []
        }
    
    def monitor_api_call(self, endpoint):
        """Decorator to monitor API call performance"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                
                try:
                    result = func(*args, **kwargs)
                    status = 'success'
                    return result
                except Exception as e:
                    status = 'error'
                    self._record_error(endpoint, str(e))
                    raise
                finally:
                    duration = time.time() - start_time
                    self._record_api_call(endpoint, duration, status)
                
            return wrapper
        return decorator
    
    def monitor_database_query(self, query_name):
        """Decorator to monitor database query performance"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                
                if duration > 1.0:  # Slow query threshold
                    self._record_slow_query(query_name, duration)
                
                return result
            return wrapper
        return decorator
    
    def _record_api_call(self, endpoint, duration, status):
        """Record API call metrics"""
        if endpoint not in self.metrics['api_calls']:
            self.metrics['api_calls'][endpoint] = {
                'total_calls': 0,
                'total_duration': 0,
                'success_count': 0,
                'error_count': 0,
                'avg_duration': 0,
                'max_duration': 0
            }
        
        metrics = self.metrics['api_calls'][endpoint]
        metrics['total_calls'] += 1
        metrics['total_duration'] += duration
        metrics['avg_duration'] = metrics['total_duration'] / metrics['total_calls']
        metrics['max_duration'] = max(metrics['max_duration'], duration)
        
        if status == 'success':
            metrics['success_count'] += 1
        else:
            metrics['error_count'] += 1
        
        # Log slow API calls
        if duration > 2.0:
            self.logger.warning(f"Slow API call: {endpoint} took {duration:.2f}s")
    
    def _record_slow_query(self, query_name, duration):
        """Record slow database queries"""
        self.metrics['slow_queries'].append({
            'query_name': query_name,
            'duration': duration,
            'timestamp': datetime.utcnow()
        })
        
        self.logger.warning(f"Slow query: {query_name} took {duration:.2f}s")
    
    def _record_error(self, endpoint, error_message):
        """Record application errors"""
        if endpoint not in self.metrics['error_counts']:
            self.metrics['error_counts'][endpoint] = 0
        
        self.metrics['error_counts'][endpoint] += 1
        self.logger.error(f"Error in {endpoint}: {error_message}")
    
    def collect_system_metrics(self):
        """Collect system resource metrics"""
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        metrics = {
            'timestamp': datetime.utcnow(),
            'cpu_percent': cpu_percent,
            'memory_percent': memory.percent,
            'memory_available': memory.available,
            'disk_percent': (disk.used / disk.total) * 100,
            'disk_free': disk.free
        }
        
        self.metrics['system_resources'].append(metrics)
        
        # Keep only last 24 hours of data
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        self.metrics['system_resources'] = [
            m for m in self.metrics['system_resources'] 
            if m['timestamp'] > cutoff_time
        ]
        
        # Alert on high resource usage
        if cpu_percent > 80:
            self.logger.warning(f"High CPU usage: {cpu_percent}%")
        
        if memory.percent > 85:
            self.logger.warning(f"High memory usage: {memory.percent}%")
        
        return metrics
    
    def get_performance_report(self):
        """Generate performance report"""
        return {
            'api_performance': self.metrics['api_calls'],
            'slow_queries': self.metrics['slow_queries'][-50:],  # Last 50 slow queries
            'error_summary': self.metrics['error_counts'],
            'current_system_resources': self.collect_system_metrics(),
            'generated_at': datetime.utcnow().isoformat()
        }
    
    def check_database_health(self):
        """Check database connection and performance"""
        try:
            start_time = time.time()
            
            # Simple query to test connection
            result = db.session.execute(text('SELECT 1'))
            connection_time = time.time() - start_time
            
            # Check for active connections
            active_connections = db.session.execute(
                text('SELECT count(*) FROM pg_stat_activity WHERE state = \'active\'')
            ).scalar()
            
            # Check database size
            db_size = db.session.execute(
                text('SELECT pg_size_pretty(pg_database_size(current_database()))')
            ).scalar()
            
            return {
                'status': 'healthy',
                'connection_time': connection_time,
                'active_connections': active_connections,
                'database_size': db_size,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }

# Usage examples for the PerformanceMonitor
monitor = PerformanceMonitor()

# Example usage in API endpoints:
@monitor.monitor_api_call('/api/accounts')
def get_accounts():
    # API logic here
    pass

@monitor.monitor_database_query('complex_financial_report')
def generate_complex_report():
    # Database query logic here
    pass