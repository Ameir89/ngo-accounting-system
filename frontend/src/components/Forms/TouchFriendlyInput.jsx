// frontend/src/components/Forms/TouchFriendlyInput.jsx

import { Eye, EyeOff } from 'lucide-react';

const TouchFriendlyInput = ({ 
  type = 'text', 
  label, 
  error, 
  showPasswordToggle = false,
  ...props 
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          type={inputType}
          className={`
            appearance-none block w-full px-4 py-3 border rounded-lg
            text-base leading-6 placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
            ${error ? 'border-red-300' : 'border-gray-300'}
            touch-manipulation
          `}
          {...props}
        />
        
        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 px-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400" />
            )}
          </button>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};