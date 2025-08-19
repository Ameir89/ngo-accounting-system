// frontend/src/components/UI/ErrorMessage.jsx
import { AlertTriangle, RefreshCw } from 'lucide-react';

const ErrorMessage = ({ 
  message = 'Something went wrong', 
  onRetry, 
  showRetry = true,
  className = '' 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div className="rounded-full bg-red-100 p-3 mb-4">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Error
      </h3>
      
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4 max-w-md">
        {message}
      </p>
      
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="btn-primary"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;