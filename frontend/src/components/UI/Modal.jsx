// frontend/src/components/UI/Modal.jsx - Optimized Version
import { X } from 'lucide-react';
import { memo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';

// Focus trap hook for better accessibility
const useFocusTrap = (isOpen, containerRef) => {
  const previousActiveElement = useRef();

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement;

    // Get all focusable elements
    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Focus the first element
    if (firstFocusable) {
      firstFocusable.focus();
    }

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (focusableElements.length === 1) {
        e.preventDefault();
        return;
      }

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);

    return () => {
      document.removeEventListener('keydown', handleTabKey);
      // Restore focus to the previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, containerRef]);
};

// Enhanced Modal component
const Modal = memo(({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  preventClose = false,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  maxHeight = '90vh',
  centered = true,
  animationDuration = 200,
  overlay = true,
  footer,
  loading = false
}) => {
  const { isRTL } = useLanguage();
  const modalRef = useRef();
  const overlayRef = useRef();

  // Use focus trap
  useFocusTrap(isOpen, modalRef);

  // Size classes with responsive design
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    '3xl': 'max-w-7xl',
    full: 'max-w-full mx-4'
  };

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape' && closeOnEscape && !preventClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape, preventClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === overlayRef.current && closeOnOverlayClick && !preventClose) {
      onClose();
    }
  }, [onClose, closeOnOverlayClick, preventClose]);

  const handleClose = useCallback(() => {
    if (!preventClose) {
      onClose();
    }
  }, [onClose, preventClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className={`fixed inset-0 z-50 overflow-y-auto ${overlay ? 'bg-black bg-opacity-50' : ''} 
                  transition-all duration-${animationDuration} ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      aria-describedby="modal-description"
      ref={overlayRef}
      onClick={handleOverlayClick}
    >
      <div className={`flex items-center ${centered ? 'justify-center' : 'justify-start'} 
                      min-h-screen p-4 text-center sm:p-0`}>
        <div 
          ref={modalRef}
          className={`
            relative inline-block w-full ${sizeClasses[size]} 
            transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 
            text-left align-bottom shadow-xl transition-all duration-${animationDuration}
            sm:align-middle border border-gray-200 dark:border-gray-700
            ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
            ${className}
          `}
          style={{ 
            maxHeight,
            direction: isRTL ? 'rtl' : 'ltr'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 dark:bg-gray-800 dark:bg-opacity-75 
                          flex items-center justify-center z-10 rounded-lg">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading...</p>
              </div>
            </div>
          )}

          {/* Header */}
          {(title || showCloseButton) && (
            <div className={`flex items-center justify-between p-6 border-b border-gray-200 
                           dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-t-lg ${headerClassName}`}>
              {title && (
                <h3 
                  id="modal-title" 
                  className="text-lg font-semibold leading-6 text-gray-900 dark:text-white"
                >
                  {title}
                </h3>
              )}
              
              {showCloseButton && !preventClose && (
                <button
                  onClick={handleClose}
                  className="rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                           dark:focus:ring-offset-gray-800 p-1 transition-colors duration-200"
                  aria-label="Close modal"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
          
          {/* Content */}
          <div 
            id="modal-description"
            className={`p-6 overflow-y-auto custom-scrollbar ${bodyClassName}`}
            style={{ maxHeight: `calc(${maxHeight} - 8rem)` }}
          >
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className={`px-6 py-4 border-t border-gray-200 dark:border-gray-700 
                           bg-gray-50 dark:bg-gray-700/50 rounded-b-lg ${footerClassName}`}>
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document root
  return createPortal(modalContent, document.body);
});

Modal.displayName = 'Modal';

// Enhanced Modal Hook for common patterns
export const useModal = (initialState = false) => {
  const [isOpen, setIsOpen] = useState(initialState);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);
  const toggleModal = useCallback(() => setIsOpen(prev => !prev), []);

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal,
    setIsOpen
  };
};

// Confirmation Modal Component
export const ConfirmModal = memo(({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message = 'Are you sure you want to continue?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'default', // default, danger, warning
  loading = false
}) => {
  const handleConfirm = useCallback(async () => {
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirmation action failed:', error);
    }
  }, [onConfirm, onClose]);

  const typeStyles = {
    default: {
      icon: '❓',
      confirmClass: 'btn-primary',
      iconBg: 'bg-blue-100 dark:bg-blue-900/20'
    },
    danger: {
      icon: '⚠️',
      confirmClass: 'btn-danger',
      iconBg: 'bg-red-100 dark:bg-red-900/20'
    },
    warning: {
      icon: '⚠️',
      confirmClass: 'btn-warning',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/20'
    }
  };

  const style = typeStyles[type];

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="sm"
      loading={loading}
      preventClose={loading}
    >
      <div className="text-center">
        <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${style.iconBg} mb-4`}>
          <span className="text-2xl">{style.icon}</span>
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {message}
        </p>
        
        <div className="flex space-x-3 justify-center">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-secondary"
          >
            {cancelText}
          </button>
          
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`${style.confirmClass} flex items-center`}
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
});

ConfirmModal.displayName = 'ConfirmModal';

// Success Modal Component
export const SuccessModal = memo(({ 
  isOpen, 
  onClose, 
  title = 'Success!',
  message = 'Operation completed successfully.',
  actionText = 'Continue',
  autoClose = false,
  autoCloseDelay = 3000
}) => {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="sm"
      showCloseButton={false}
    >
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
          <span className="text-2xl">✅</span>
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {message}
        </p>
        
        <button
          type="button"
          onClick={onClose}
          className="btn-success"
        >
          {actionText}
        </button>
      </div>
    </Modal>
  );
});

SuccessModal.displayName = 'SuccessModal';

export default Modal;