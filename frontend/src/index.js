// frontend/src/index.js
// import React from 'react';
// import ReactDOM from 'react-dom/client';
// import App from './App';
// import './index.css';

// const root = ReactDOM.createRoot(document.getElementById('root'));
// root.render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>
// );

// frontend/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Error boundary for the entire app
class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Root Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            maxWidth: '500px',
            width: '100%'
          }}>
            <h1 style={{ color: '#dc2626', marginBottom: '1rem' }}>
              Application Error
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              Something went wrong. Please refresh the page or contact support.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#4f46e5',
                color: 'white',
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Function to initialize the app
const initializeApp = () => {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
    return;
  }

  // Find the root element
  const container = document.getElementById('root');
  
  if (!container) {
    console.error('Failed to find the root element');
    
    // Create a fallback error display
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f9fafb; font-family: system-ui, sans-serif;">
        <div style="text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <h1 style="color: #dc2626; margin-bottom: 1rem;">Initialization Error</h1>
          <p style="color: #6b7280; margin-bottom: 1rem;">Unable to find root container element.</p>
          <p style="color: #6b7280; font-size: 0.875rem;">Please ensure the HTML file contains a div with id="root"</p>
        </div>
      </div>
    `;
    document.body.appendChild(errorDiv);
    return;
  }

  try {
    // Create React root and render the app
    const root = ReactDOM.createRoot(container);
    
    root.render(
      <React.StrictMode>
        <RootErrorBoundary>
          <App />
        </RootErrorBoundary>
      </React.StrictMode>
    );

    // Hide loading screen if it exists
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      setTimeout(() => {
        loadingScreen.style.opacity = '0';
        loadingScreen.style.transition = 'opacity 0.3s ease-out';
        setTimeout(() => {
          loadingScreen.style.display = 'none';
        }, 300);
      }, 100);
    }

    console.log('NGO Accounting System initialized successfully');
    
  } catch (error) {
    console.error('Failed to initialize React app:', error);
    
    // Fallback error display
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f9fafb; font-family: system-ui, sans-serif;">
        <div style="text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <h1 style="color: #dc2626; margin-bottom: 1rem;">React Initialization Error</h1>
          <p style="color: #6b7280; margin-bottom: 1rem;">Failed to start the application.</p>
          <button onclick="window.location.reload()" style="background: #4f46e5; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer;">
            Reload Page
          </button>
          <details style="margin-top: 1rem; text-align: left;">
            <summary style="cursor: pointer; color: #6b7280;">Error Details</summary>
            <pre style="background: #f3f4f6; padding: 1rem; border-radius: 4px; overflow: auto; font-size: 0.75rem; margin-top: 0.5rem;">${error.toString()}</pre>
          </details>
        </div>
      </div>
    `;
  }
};

// Start the initialization
initializeApp();
