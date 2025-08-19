// frontend/src/components/UI/LoadingSpinner.jsx

const LoadingSpinner = ({ 
  size = 'md', 
  message = 'Loading...', 
  color = 'border-indigo-600',
  fullscreen = false
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <div 
      className={`flex flex-col items-center justify-center p-8 
      ${fullscreen ? 'fixed inset-0 bg-white/70 dark:bg-black/50 z-50' : ''}`}
      role="status"
      aria-label={message}
    >
      <div 
        className={`animate-spin rounded-full border-b-2 ${color} ${sizeClasses[size]}`} 
      ></div>
      {message && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{message}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
