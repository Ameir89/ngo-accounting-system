// frontend/src/hooks/useApi.js
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiService } from '../services/api';

// Accounts Hooks
export const useAccounts = (params = {}) => {
  return useQuery({
    queryKey: ['accounts', params],
    queryFn: () => apiService.accounts.getAll(params),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000,
  });
};

export const useAccount = (id) => {
  return useQuery({
    queryKey: ['accounts', id],
    queryFn: () => apiService.accounts.getById(id),
    select: (data) => data.data,
    enabled: !!id,
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => apiService.accounts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create account');
    },
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => apiService.accounts.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update account');
    },
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => apiService.accounts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete account');
    },
  });
};

// Journal Entries Hooks
export const useJournalEntries = (params = {}) => {
  return useQuery({
    queryKey: ['journal-entries', params],
    queryFn: () => apiService.journalEntries.getAll(params),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000,
  });
};

export const useJournalEntry = (id) => {
  return useQuery({
    queryKey: ['journal-entries', id],
    queryFn: () => apiService.journalEntries.getById(id),
    select: (data) => data.data,
    enabled: !!id,
  });
};

export const useCreateJournalEntry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => apiService.journalEntries.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success('Journal entry created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create journal entry');
    },
  });
};

export const useUpdateJournalEntry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => apiService.journalEntries.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success('Journal entry updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update journal entry');
    },
  });
};

export const usePostJournalEntry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => apiService.journalEntries.post(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success('Journal entry posted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to post journal entry');
    },
  });
};

export const useDeleteJournalEntry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => apiService.journalEntries.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success('Journal entry deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete journal entry');
    },
  });
};

// Suppliers Hooks
export const useSuppliers = (params = {}) => {
  return useQuery({
    queryKey: ['suppliers', params],
    queryFn: () => apiService.suppliers.getAll(params),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSupplier = (id) => {
  return useQuery({
    queryKey: ['suppliers', id],
    queryFn: () => apiService.suppliers.getById(id),
    select: (data) => data.data,
    enabled: !!id,
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => apiService.suppliers.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create supplier');
    },
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => apiService.suppliers.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update supplier');
    },
  });
};

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => apiService.suppliers.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete supplier');
    },
  });
};

// Grants Hooks
export const useGrants = (params = {}) => {
  return useQuery({
    queryKey: ['grants', params],
    queryFn: () => apiService.grants.getAll(params),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000,
  });
};

export const useGrant = (id) => {
  return useQuery({
    queryKey: ['grants', id],
    queryFn: () => apiService.grants.getById(id),
    select: (data) => data.data,
    enabled: !!id,
  });
};

export const useCreateGrant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => apiService.grants.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grants'] });
      toast.success('Grant created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create grant');
    },
  });
};

// Fixed Assets Hooks
export const useFixedAssets = (params = {}) => {
  return useQuery({
    queryKey: ['fixed-assets', params],
    queryFn: () => apiService.fixedAssets.getAll(params),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000,
  });
};

export const useFixedAsset = (id) => {
  return useQuery({
    queryKey: ['fixed-assets', id],
    queryFn: () => apiService.fixedAssets.getById(id),
    select: (data) => data.data,
    enabled: !!id,
  });
};

export const useCreateFixedAsset = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => apiService.fixedAssets.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
      toast.success('Fixed asset created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create fixed asset');
    },
  });
};

// Dashboard Hook
export const useDashboardData = () => {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiService.dashboard.getSummary(),
    select: (data) => data.data,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Reports Hooks
export const useTrialBalance = (params = {}) => {
  return useQuery({
    queryKey: ['reports', 'trial-balance', params],
    queryFn: () => apiService.reports.trialBalance(params),
    select: (data) => data.data,
    enabled: false, // Only run when explicitly requested
  });
};

export const useBalanceSheet = (params = {}) => {
  return useQuery({
    queryKey: ['reports', 'balance-sheet', params],
    queryFn: () => apiService.reports.balanceSheet(params),
    select: (data) => data.data,
    enabled: false,
  });
};

export const useIncomeStatement = (params = {}) => {
  return useQuery({
    queryKey: ['reports', 'income-statement', params],
    queryFn: () => apiService.reports.incomeStatement(params),
    select: (data) => data.data,
    enabled: false,
  });
};

export const useCashFlow = (params = {}) => {
  return useQuery({
    queryKey: ['reports', 'cash-flow', params],
    queryFn: () => apiService.reports.cashFlow(params),
    select: (data) => data.data,
    enabled: false,
  });
};

// Advanced API Hook (keeping existing functionality)
export const useAdvancedApi = () => {
  const queryClient = useQueryClient();

  const useAdvancedQuery = (key, queryFn, options = {}) => {
    return useQuery({
      queryKey: key,
      queryFn,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000, // Updated from cacheTime
      retry: (failureCount, error) => {
        if (error.response?.status >= 400 && error.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...options,
    });
  };

  const useOptimisticMutation = (mutationFn, options = {}) => {
    return useMutation({
      mutationFn,
      onMutate: async (variables) => {
        if (options.queryKey) {
          await queryClient.cancelQueries({ queryKey: options.queryKey });
          
          const previousData = queryClient.getQueryData(options.queryKey);
          
          if (options.optimisticUpdate) {
            queryClient.setQueryData(options.queryKey, old => 
              options.optimisticUpdate(old, variables)
            );
          }
          
          return { previousData };
        }
      },
      onError: (error, variables, context) => {
        if (context?.previousData && options.queryKey) {
          queryClient.setQueryData(options.queryKey, context.previousData);
        }
        
        if (options.onError) {
          options.onError(error, variables, context);
        }
      },
      onSuccess: (data, variables, context) => {
        if (options.onSuccess) {
          options.onSuccess(data, variables, context);
        }
      },
      onSettled: () => {
        if (options.queryKey) {
          queryClient.invalidateQueries({ queryKey: options.queryKey });
        }
      }
    });
  };

  return {
    useAdvancedQuery,
    useOptimisticMutation,
  };
};