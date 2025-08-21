// frontend/src/services/errorHandling.js - Comprehensive error handling service
import toast from 'react-hot-toast';

// Error types classification
export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  SERVER: 'SERVER_ERROR',
  CLIENT: 'CLIENT_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

// Error classification based on status codes
const classifyError = (error) => {
  if (!error.response) {
    return {
      type: ERROR_TYPES.NETWORK,
      severity: ERROR_SEVERITY.HIGH,
      message: 'Network connection error. Please check your internet connection.',
    };
  }

  const { status } = error.response;

  switch (true) {
    case status === 400:
      return {
        type: ERROR_TYPES.VALIDATION,
        severity: ERROR_SEVERITY.MEDIUM,
        message: error.response.data?.message || 'Invalid request data.',
      };

    case status === 401:
      return {
        type: ERROR_TYPES.AUTHENTICATION,
        severity: ERROR_SEVERITY.HIGH,
        message: 'Authentication required. Please log in again.',
      };

    case status === 403:
      return {
        type: ERROR_TYPES.AUTHORIZATION,
        severity: ERROR_SEVERITY.MEDIUM,
        message: 'You do not have permission to perform this action.',
      };

    case status === 404:
      return {
        type: ERROR_TYPES.NOT_FOUND,
        severity: ERROR_SEVERITY.LOW,
        message: 'The requested resource was not found.',
      };

    case status === 422:
      return {
        type: ERROR_TYPES.VALIDATION,
        severity: ERROR_SEVERITY.MEDIUM,
        message: 'Validation failed. Please check your input.',
      };

    case status >= 500:
      return {
        type: ERROR_TYPES.SERVER,
        severity: ERROR_SEVERITY.HIGH,
        message: 'Server error. Please try again later.',
      };

    case status >= 400:
      return {
        type: ERROR_TYPES.CLIENT,
        severity: ERROR_SEVERITY.MEDIUM,
        message: error.response.data?.message || 'Client error occurred.',
      };

    default:
      return {
        type: ERROR_TYPES.UNKNOWN,
        severity: ERROR_SEVERITY.MEDIUM,
        message: 'An unexpected error occurred.',
      };
  }
};

// Enhanced error handler class
class ErrorHandler {
  constructor() {
    this.errorQueue = [];
    this.isProcessing = false;
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.retryDelay = 1000; // ms
  }

  /**
   * Handle API errors with classification and appropriate response
   */
  handleApiError = (error, context = {}) => {
    const classified = classifyError(error);
    const errorDetails = {
      ...classified,
      originalError: error,
      context,
      timestamp: new Date().toISOString(),
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
    };

    // Log error for debugging
    this.logError(errorDetails);

    // Handle specific error types
    switch (classified.type) {
      case ERROR_TYPES.AUTHENTICATION:
        this.handleAuthError(errorDetails);
        break;

      case ERROR_TYPES.VALIDATION:
        this.handleValidationError(errorDetails);
        break;

      case ERROR_TYPES.NETWORK:
        this.handleNetworkError(errorDetails);
        break;

      case ERROR_TYPES.SERVER:
        this.handleServerError(errorDetails);
        break;

      default:
        this.handleGenericError(errorDetails);
    }

    return errorDetails;
  };

  /**
   * Handle authentication errors
   */
  handleAuthError = (errorDetails) => {
    toast.error(errorDetails.message);
    
    // Trigger logout if needed
    if (errorDetails.originalError?.response?.status === 401) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('auth:logout', { 
          detail: { reason: 'authentication_failed' }
        }));
      }, 1000);
    }
  };

  /**
   * Handle validation errors
   */
  handleValidationError = (errorDetails) => {
    const { originalError } = errorDetails;
    const errorData = originalError.response?.data;

    if (errorData?.errors && typeof errorData.errors === 'object') {
      // Handle field-specific validation errors
      Object.entries(errorData.errors).forEach(([field, messages]) => {
        const fieldMessages = Array.isArray(messages) ? messages : [messages];
        fieldMessages.forEach(message => {
          toast.error(`${field}: ${message}`);
        });
      });
    } else {
      toast.error(errorDetails.message);
    }
  };

  /**
   * Handle network errors with retry mechanism
   */
  handleNetworkError = (errorDetails) => {
    const { context } = errorDetails;
    const retryKey = `${context.method || 'GET'}_${context.url || 'unknown'}`;
    
    const currentRetries = this.retryAttempts.get(retryKey) || 0;
    
    if (currentRetries < this.maxRetries && context.retry !== false) {
      this.retryAttempts.set(retryKey, currentRetries + 1);
      
      toast.error(`Network error. Retrying... (${currentRetries + 1}/${this.maxRetries})`);
      
      // Retry after delay
      setTimeout(() => {
        if (context.retryFunction) {
          context.retryFunction();
        }
      }, this.retryDelay * (currentRetries + 1));
    } else {
      this.retryAttempts.delete(retryKey);
      toast.error(errorDetails.message);
    }
  };

  /**
   * Handle server errors
   */
  handleServerError = (errorDetails) => {
    const { originalError } = errorDetails;
    const status = originalError.response?.status;
    
    let message = errorDetails.message;
    
    if (status === 503) {
      message = 'Service temporarily unavailable. Please try again later.';
    } else if (status === 502 || status === 504) {
      message = 'Server is currently unavailable. Please try again later.';
    }
    
    toast.error(message);
    
    // Log critical server errors
    if (status >= 500) {
      this.logCriticalError(errorDetails);
    }
  };

  /**
   * Handle generic errors
   */
  handleGenericError = (errorDetails) => {
    toast.error(errorDetails.message);
  };

  /**
   * Log errors for debugging and monitoring
   */
  logError = (errorDetails) => {
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Details');
      console.error('Type:', errorDetails.type);
      console.error('Severity:', errorDetails.severity);
      console.error('Message:', errorDetails.message);
      console.error('Context:', errorDetails.context);
      console.error('Original Error:', errorDetails.originalError);
      console.groupEnd();
    }

    // Store in local storage for debugging (keep last 100 errors)
    try {
      const errors = JSON.parse(localStorage.getItem('errorLog') || '[]');
      errors.push({
        ...errorDetails,
        originalError: errorDetails.originalError?.message || 'Unknown error',
      });
      
      localStorage.setItem('errorLog', JSON.stringify(errors.slice(-100)));
    } catch (e) {
      console.warn('Failed to log error to localStorage:', e);
    }
  };

  /**
   * Log critical errors that need immediate attention
   */
  logCriticalError = (errorDetails) => {
    console.error('🔥 CRITICAL ERROR:', errorDetails);
    
    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to error monitoring service (e.g., Sentry, LogRocket)
      this.sendToMonitoringService(errorDetails);
    }
  };

  /**
   * Send error to external monitoring service
   */
  sendToMonitoringService = (errorDetails) => {
    try {
      // Placeholder for external monitoring service integration
      // Example: Sentry.captureException(errorDetails.originalError);
      console.log('Sending error to monitoring service:', errorDetails);
    } catch (e) {
      console.warn('Failed to send error to monitoring service:', e);
    }
  };

  /**
   * Get error log for debugging
   */
  getErrorLog = (limit = 50) => {
    try {
      const errors = JSON.parse(localStorage.getItem('errorLog') || '[]');
      return errors.slice(-limit).reverse(); // Most recent first
    } catch (e) {
      console.warn('Failed to retrieve error log:', e);
      return [];
    }
  };

  /**
   * Clear error log
   */
  clearErrorLog = () => {
    try {
      localStorage.removeItem('errorLog');
      this.retryAttempts.clear();
      return true;
    } catch (e) {
      console.warn('Failed to clear error log:', e);
      return false;
    }
  };

  /**
   * Handle React component errors
   */
  handleComponentError = (error, errorInfo, componentName = 'Unknown') => {
    const errorDetails = {
      type: ERROR_TYPES.CLIENT,
      severity: ERROR_SEVERITY.HIGH,
      message: `Component error in ${componentName}: ${error.message}`,
      originalError: error,
      context: {
        componentName,
        errorInfo,
        componentStack: errorInfo.componentStack,
      },
      timestamp: new Date().toISOString(),
    };

    this.logError(errorDetails);
    
    // Show user-friendly error message
    toast.error('An unexpected error occurred. Please refresh the page.');
    
    return errorDetails;
  };

  /**
   * Handle async operation errors
   */
  handleAsyncError = async (asyncOperation, context = {}) => {
    try {
      return await asyncOperation();
    } catch (error) {
      return this.handleApiError(error, context);
    }
  };

  /**
   * Create error boundary HOC
   */
  createErrorBoundary = (fallbackComponent = null) => {
    return class ErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
      }

      static getDerivedStateFromError(error) {
        return { hasError: true, error };
      }

      componentDidCatch(error, errorInfo) {
        errorHandler.handleComponentError(error, errorInfo, this.props.componentName);
      }

      render() {
        if (this.state.hasError) {
          return fallbackComponent || (
            <div className="error-boundary p-4 text-center">
              <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
              <p className="text-gray-600 mb-4">
                We're sorry, but something unexpected happened.
              </p>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="btn-primary"
              >
                Try Again
              </button>
            </div>
          );
        }

        return this.props.children;
      }
    };
  };
}

// Create singleton instance
export const errorHandler = new ErrorHandler();

// Utility functions for common error handling patterns

/**
 * Wrap async functions with error handling
 */
export const withErrorHandling = (asyncFn, context = {}) => {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      errorHandler.handleApiError(error, context);
      throw error; // Re-throw for component error boundaries
    }
  };
};

/**
 * Create a higher-order component with error boundary
 */
export const withErrorBoundary = (Component, fallback = null) => {
  const ErrorBoundary = errorHandler.createErrorBoundary(fallback);
  
  return function WrappedComponent(props) {
    return (
      <ErrorBoundary componentName={Component.displayName || Component.name}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

/**
 * Global error handler setup
 */
export const setupGlobalErrorHandling = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handleApiError(event.reason, {
      type: 'unhandled_promise_rejection',
    });
  });

  // Handle global JavaScript errors
  window.addEventListener('error', (event) => {
    errorHandler.handleComponentError(event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    }, 'Global');
  });

  // Listen for custom auth logout events
  window.addEventListener('auth:logout', (event) => {
    const { reason } = event.detail || {};
    toast.error(`Session ended: ${reason || 'unknown reason'}`);
  });
};

export default errorHandler;