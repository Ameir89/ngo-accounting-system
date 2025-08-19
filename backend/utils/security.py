# backend/utils/security.py
import re
import hashlib
import hmac
import time
from datetime import datetime, timedelta
from flask import request, current_app
from functools import wraps
import bleach
from urllib.parse import urlparse

class SecurityManager:
    """Comprehensive security management for the application"""
    
    def __init__(self, app=None):
        self.app = app
        self.blocked_ips = set()
        self.request_counts = {}
        self.suspicious_patterns = [
            r'<script.*?>.*?</script>',
            r'javascript:',
            r'on\w+\s*=',
            r'<iframe.*?>.*?</iframe>',
            r'eval\s*\(',
            r'expression\s*\(',
        ]
        
    def is_request_allowed(self, request):
        """Check if request should be allowed"""
        client_ip = self._get_client_ip(request)
        
        # Check if IP is blocked
        if client_ip in self.blocked_ips:
            return False
        
        # Check for suspicious patterns
        if self._has_suspicious_content(request):
            self._log_suspicious_activity(client_ip, request)
            return False
        
        # Check request rate for this IP
        if self._is_rate_limited(client_ip):
            return False
        
        return True
    
    def _get_client_ip(self, request):
        """Get the real client IP address"""
        if request.headers.get('X-Forwarded-For'):
            return request.headers.get('X-Forwarded-For').split(',')[0].strip()
        elif request.headers.get('X-Real-IP'):
            return request.headers.get('X-Real-IP')
        return request.remote_addr
    
    def _has_suspicious_content(self, request):
        """Check for suspicious content in request"""
        # Check URL for suspicious patterns
        url = str(request.url)
        for pattern in self.suspicious_patterns:
            if re.search(pattern, url, re.IGNORECASE):
                return True
        
        # Check form data
        if request.form:
            for key, value in request.form.items():
                if self._contains_malicious_content(str(value)):
                    return True
        
        # Check JSON data
        if request.is_json and request.json:
            if self._check_json_for_malicious_content(request.json):
                return True
        
        return False
    
    def _contains_malicious_content(self, content):
        """Check if content contains malicious patterns"""
        for pattern in self.suspicious_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                return True
        return False
    
    def _check_json_for_malicious_content(self, data):
        """Recursively check JSON data for malicious content"""
        if isinstance(data, dict):
            for key, value in data.items():
                if self._check_json_for_malicious_content(value):
                    return True
        elif isinstance(data, list):
            for item in data:
                if self._check_json_for_malicious_content(item):
                    return True
        elif isinstance(data, str):
            return self._contains_malicious_content(data)
        
        return False
    
    def _is_rate_limited(self, client_ip):
        """Check if client IP is rate limited"""
        current_time = time.time()
        window_size = 300  # 5 minutes
        max_requests = 100
        
        if client_ip not in self.request_counts:
            self.request_counts[client_ip] = []
        
        # Remove old requests outside the window
        self.request_counts[client_ip] = [
            req_time for req_time in self.request_counts[client_ip]
            if current_time - req_time < window_size
        ]
        
        # Add current request
        self.request_counts[client_ip].append(current_time)
        
        # Check if exceeded limit
        return len(self.request_counts[client_ip]) > max_requests
    
    def _log_suspicious_activity(self, client_ip, request):
        """Log suspicious activity for security monitoring"""
        if self.app:
            self.app.logger.warning(f"Suspicious activity from {client_ip}: {request.method} {request.path}")
    
    def sanitize_input(self, data):
        """Sanitize user input to prevent XSS and injection attacks"""
        if isinstance(data, dict):
            return {key: self.sanitize_input(value) for key, value in data.items()}
        elif isinstance(data, list):
            return [self.sanitize_input(item) for item in data]
        elif isinstance(data, str):
            # Remove potentially dangerous HTML tags and attributes
            return bleach.clean(data, tags=[], attributes={}, strip=True)
        else:
            return data