// frontend/src/components/UI/Modal.jsx

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  preventClose = false
}) => {
  const { isRTL } = useLanguage();
  const modalRef = useRef();
  const previousActiveElement = useRef();

  // Size classes
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full mx-4'
  };

  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousActiveElement.current = document.activeElement;
      
      // Focus the modal
      modalRef.current?.focus();
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Handle escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape' && !preventClose) {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
        
        // Restore focus to previous element
        if (previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen, onClose, preventClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && closeOnOverlayClick && !preventClose) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={handleOverlayClick}
      />
      
      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div 
          ref={modalRef}
          className={`
            relative bg-white dark:bg-gray-800 rounded-lg shadow-xl 
            transform transition-all w-full ${sizeClasses[size]}
            ${isRTL ? 'text-right' : 'text-left'}
          `}
          tabIndex="-1"
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              {title && (
                <h3 
                  id="modal-title" 
                  className="text-lg font-medium text-gray-900 dark:text-white"
                >
                  {title}
                </h3>
              )}
              
              {showCloseButton && !preventClose && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md"
                  aria-label="Close modal"
                >
                  <X className="h-6 w-6" />
                </button>
              )}
            </div>
          )}
          
          {/* Content */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;