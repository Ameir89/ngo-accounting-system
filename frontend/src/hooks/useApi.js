// 4. Advanced React Hook for API Integration
// frontend/src/hooks/useAdvancedApi.js

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from 'react-query';

export const useAdvancedApi = () => {
  const queryClient = useQueryClient();
  const abortControllerRef = useRef();

  // Cleanup function to abort requests
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Generic query hook with advanced features
  const useAdvancedQuery = (key, queryFn, options = {}) => {
    return useQuery(key, queryFn, {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error.response?.status >= 400 && error.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      onError: (error) => {
        if (options.showErrorToast !== false) {
          toast.error(error.message || 'Failed to fetch data');
        }
      },
      ...options
    });
  };

  // Optimistic updates mutation
  const useOptimisticMutation = (mutationFn, options = {}) => {
    return useMutation(mutationFn, {
      onMutate: async (variables) => {
        // Cancel outgoing refetches
        if (options.queryKey) {
          await queryClient.cancelQueries(options.queryKey);
          
          // Snapshot previous value
          const previousData = queryClient.getQueryData(options.queryKey);
          
          // Optimistically update
          if (options.optimisticUpdate) {
            queryClient.setQueryData(options.queryKey, old => 
              options.optimisticUpdate(old, variables)
            );
          }
          
          return { previousData };
        }
      },
      onError: (error, variables, context) => {
        // Rollback on error
        if (context?.previousData && options.queryKey) {
          queryClient.setQueryData(options.queryKey, context.previousData);
        }
        
        toast.error(error.message || 'Operation failed');
        
        if (options.onError) {
          options.onError(error, variables, context);
        }
      },
      onSuccess: (data, variables, context) => {
        if (options.successMessage) {
          toast.success(options.successMessage);
        }
        
        if (options.onSuccess) {
          options.onSuccess(data, variables, context);
        }
      },
      onSettled: () => {
        // Refetch to ensure consistency
        if (options.queryKey) {
          queryClient.invalidateQueries(options.queryKey);
        }
      }
    });
  };

  // Batch operations hook
  const useBatchOperations = () => {
    const [operations, setOperations] = useState([]);
    const [isExecuting, setIsExecuting] = useState(false);

    const addOperation = useCallback((operation) => {
      setOperations(prev => [...prev, operation]);
    }, []);

    const removeOperation = useCallback((index) => {
      setOperations(prev => prev.filter((_, i) => i !== index));
    }, []);

    const executeBatch = useCallback(async () => {
      if (operations.length === 0) return;

      setIsExecuting(true);
      const results = [];
      const errors = [];

      try {
        for (const operation of operations) {
          try {
            const result = await operation.execute();
            results.push({ success: true, data: result, operation });
          } catch (error) {
            errors.push({ success: false, error, operation });
          }
        }

        if (errors.length === 0) {
          toast.success(`Successfully executed ${operations.length} operations`);
        } else {
          toast.error(`${errors.length} operations failed`);
        }

        setOperations([]);
        return { results, errors };
      } finally {
        setIsExecuting(false);
      }
    }, [operations]);

    return {
      operations,
      addOperation,
      removeOperation,
      executeBatch,
      isExecuting,
      canExecute: operations.length > 0 && !isExecuting
    };
  };

  // Real-time data hook using polling
  const useRealTimeData = (key, queryFn, interval = 30000) => {
    const [isPolling, setIsPolling] = useState(false);

    const query = useAdvancedQuery(
      key,
      queryFn,
      {
        refetchInterval: isPolling ? interval : false,
        refetchIntervalInBackground: true
      }
    );

    const startPolling = useCallback(() => setIsPolling(true), []);
    const stopPolling = useCallback(() => setIsPolling(false), []);

    return {
      ...query,
      isPolling,
      startPolling,
      stopPolling
    };
  };

  return {
    useAdvancedQuery,
    useOptimisticMutation,
    useBatchOperations,
    useRealTimeData
  };
};