// frontend/src/contexts/SecurityContext.jsx - Fixed version to prevent infinite loops and hook errors

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const SecurityContext = createContext();

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error("useSecurityContext must be used within SecurityProvider");
  }
  return context;
};

export const SecurityProvider = ({ children }) => {
  // Remove the useAuth hook call that was causing the circular dependency
  // Instead, we'll get auth state from localStorage or props when needed

  const [securitySettings] = useState({
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    },
    loginAttempts: {
      maxAttempts: 5,
      lockoutDuration: 15 * 60 * 1000, // 15 minutes
    },
    encryptionEnabled: true,
  });

  // Use refs to prevent infinite loops
  const sessionTimeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const isActiveRef = useRef(true);

  const [sessionInfo, setSessionInfo] = useState({
    lastActivity: Date.now(),
    warningShown: false,
    isActive: true,
  });

  // Get auth state from localStorage instead of useAuth hook
  const getAuthState = useCallback(() => {
    try {
      const token = localStorage.getItem("authToken");
      const user = localStorage.getItem("user");
      return {
        isAuthenticated: !!(token && user),
        user: user ? JSON.parse(user) : null,
      };
    } catch (error) {
      console.error("Error getting auth state:", error);
      return { isAuthenticated: false, user: null };
    }
  }, []);

  // Session timeout monitoring with proper cleanup
  useEffect(() => {
    const { isAuthenticated } = getAuthState();

    if (!isAuthenticated) {
      // Clear any existing timeouts
      if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      return;
    }

    const handleSessionTimeout = () => {
      isActiveRef.current = false;
      setSessionInfo((prev) => ({ ...prev, isActive: false }));
      // Force logout
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      window.location.reload();
    };

    const resetTimer = () => {
      // Clear existing timeouts
      if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);

      const now = Date.now();
      lastActivityRef.current = now;

      // Only update state if values actually changed
      setSessionInfo((prev) => {
        if (prev.lastActivity !== now || prev.warningShown || !prev.isActive) {
          return {
            lastActivity: now,
            warningShown: false,
            isActive: true,
          };
        }
        return prev;
      });

      // Set warning timer (5 minutes before timeout)
      warningTimeoutRef.current = setTimeout(() => {
        setSessionInfo((prev) => ({ ...prev, warningShown: true }));
      }, securitySettings.sessionTimeout - 5 * 60 * 1000);

      // Set timeout timer
      sessionTimeoutRef.current = setTimeout(
        handleSessionTimeout,
        securitySettings.sessionTimeout
      );
    };

    const handleActivity = useCallback(() => {
      if (isActiveRef.current) {
        resetTimer();
      }
    }, []);

    // Activity listeners
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initialize timer
    resetTimer();

    return () => {
      // Cleanup
      if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [securitySettings.sessionTimeout, getAuthState]);

  // Password strength validation
  const validatePassword = useCallback(
    (password) => {
      const { passwordPolicy } = securitySettings;
      const errors = [];

      if (password.length < passwordPolicy.minLength) {
        errors.push(
          `Password must be at least ${passwordPolicy.minLength} characters long`
        );
      }

      if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push("Password must contain at least one uppercase letter");
      }

      if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
        errors.push("Password must contain at least one lowercase letter");
      }

      if (passwordPolicy.requireNumbers && !/\d/.test(password)) {
        errors.push("Password must contain at least one number");
      }

      if (
        passwordPolicy.requireSpecialChars &&
        !/[!@#$%^&*(),.?":{}|<>]/.test(password)
      ) {
        errors.push("Password must contain at least one special character");
      }

      return {
        isValid: errors.length === 0,
        errors,
        strength: calculatePasswordStrength(password),
      };
    },
    [securitySettings]
  );

  const calculatePasswordStrength = useCallback((password) => {
    let score = 0;

    // Length
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    // Character types
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

    // Patterns
    if (!/(.)\1{2,}/.test(password)) score += 1; // No repeated chars
    if (!/123|abc|qwe|password/i.test(password)) score += 1; // No common patterns

    if (score <= 3) return "weak";
    if (score <= 6) return "medium";
    if (score <= 8) return "strong";
    return "very_strong";
  }, []);

  // Data encryption/decryption
  const encryptSensitiveData = useCallback(
    (data) => {
      if (!securitySettings.encryptionEnabled) return data;

      try {
        // In production, use proper encryption library
        return btoa(JSON.stringify(data));
      } catch (error) {
        console.error("Encryption error:", error);
        return data;
      }
    },
    [securitySettings.encryptionEnabled]
  );

  const decryptSensitiveData = useCallback(
    (encryptedData) => {
      if (!securitySettings.encryptionEnabled) return encryptedData;

      try {
        return JSON.parse(atob(encryptedData));
      } catch (error) {
        console.error("Decryption error:", error);
        return encryptedData;
      }
    },
    [securitySettings.encryptionEnabled]
  );

  // Secure API request wrapper
  const secureApiRequest = useCallback(async (apiCall) => {
    try {
      const response = await apiCall();

      // Update last activity
      lastActivityRef.current = Date.now();
      setSessionInfo((prev) => ({ ...prev, lastActivity: Date.now() }));

      return response;
    } catch (error) {
      // Handle security-related errors
      if (error.response?.status === 401) {
        // Unauthorized - force logout
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
      throw error;
    }
  }, []);

  // Audit logging
  const logSecurityEvent = useCallback(
    (eventType, details = {}) => {
      // Get user from localStorage instead of using useAuth
      const { user } = getAuthState();

      const securityEvent = {
        timestamp: new Date().toISOString(),
        user: user?.username,
        eventType,
        details,
        userAgent: navigator.userAgent,
        ipAddress: "client-side", // Would be set by server
      };

      // In production, send to security monitoring service
      console.log("Security Event:", securityEvent);

      // Store locally for debugging (remove in production)
      const events = JSON.parse(localStorage.getItem("securityEvents") || "[]");
      events.push(securityEvent);
      localStorage.setItem(
        "securityEvents",
        JSON.stringify(events.slice(-100))
      ); // Keep last 100
    },
    [getAuthState]
  );

  // Check for suspicious activity
  const checkSuspiciousActivity = useCallback(() => {
    const events = JSON.parse(localStorage.getItem("securityEvents") || "[]");
    const recentEvents = events.filter(
      (event) =>
        Date.now() - new Date(event.timestamp).getTime() < 60 * 60 * 1000 // Last hour
    );

    // Check for multiple failed logins
    const failedLogins = recentEvents.filter(
      (event) => event.eventType === "login_failed"
    );
    if (failedLogins.length >= securitySettings.loginAttempts.maxAttempts) {
      return {
        suspicious: true,
        reason: "Multiple failed login attempts",
        action: "account_lockout",
      };
    }

    // Check for rapid succession of actions
    const rapidActions = recentEvents.filter(
      (event) =>
        Date.now() - new Date(event.timestamp).getTime() < 5 * 60 * 1000 // Last 5 minutes
    );
    if (rapidActions.length > 50) {
      return {
        suspicious: true,
        reason: "Rapid succession of actions",
        action: "rate_limit",
      };
    }

    return { suspicious: false };
  }, [securitySettings.loginAttempts.maxAttempts]);

  const extendSession = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    isActiveRef.current = true;
    setSessionInfo({
      lastActivity: now,
      warningShown: false,
      isActive: true,
    });
  }, []);

  const timeUntilTimeout = useCallback(() => {
    const elapsed = Date.now() - lastActivityRef.current;
    return Math.max(0, securitySettings.sessionTimeout - elapsed);
  }, [securitySettings.sessionTimeout]);

  const value = {
    securitySettings,
    sessionInfo,
    validatePassword,
    encryptSensitiveData,
    decryptSensitiveData,
    secureApiRequest,
    logSecurityEvent,
    checkSuspiciousActivity,
    extendSession,
    timeUntilTimeout,
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}

      {/* Session Warning Modal */}
      {sessionInfo.warningShown && (
        <SessionWarningModal onExtend={extendSession} />
      )}
    </SecurityContext.Provider>
  );
};

// Session Warning Modal Component
const SessionWarningModal = ({ onExtend }) => {
  const [countdown, setCountdown] = useState(300); // 5 minutes

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.location.reload(); // Force logout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Session Expiring Soon
        </h3>
        <p className="text-gray-600 mb-4">
          Your session will expire in {formatTime(countdown)}. Would you like to
          extend your session?
        </p>
        <div className="flex space-x-3">
          <button onClick={onExtend} className="btn-primary flex-1">
            Extend Session
          </button>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary flex-1"
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
};
