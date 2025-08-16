// frontend/src/hooks/useApi.js
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { apiService } from '../services/api';

// Generic hook for GET requests
export const useApiQuery = (key, queryFn, options = {}) => {
  return useQuery(key, queryFn, {
    onError: (error) => {
      if (options.showErrorToast !== false) {
        toast.error(error.response?.data?.message || 'Failed to fetch data');
      }
    },
    ...options,
  });
};

// Generic hook for mutations (POST, PUT, DELETE)
export const useApiMutation = (mutationFn, options = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation(mutationFn, {
    onSuccess: (data, variables, context) => {
      if (options.successMessage) {
        toast.success(options.successMessage);
      }
      
      if (options.invalidateQueries) {
        options.invalidateQueries.forEach((queryKey) => {
          queryClient.invalidateQueries(queryKey);
        });
      }
      
      if (options.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      if (options.showErrorToast !== false) {
        toast.error(error.response?.data?.message || 'Operation failed');
      }
      
      if (options.onError) {
        options.onError(error, variables, context);
      }
    },
    ...options,
  });
};

// Specific API hooks
export const useAccounts = (params = {}) => {
  return useApiQuery(
    ['accounts', params],
    () => apiService.accounts.getAll(params).then(res => res.data),
    { staleTime: 5 * 60 * 1000 }
  );
};

export const useCreateAccount = () => {
  return useApiMutation(
    (data) => apiService.accounts.create(data),
    {
      successMessage: 'Account created successfully',
      invalidateQueries: [['accounts']],
    }
  );
};

export const useJournalEntries = (params = {}) => {
  return useApiQuery(
    ['journalEntries', params],
    () => apiService.journalEntries.getAll(params).then(res => res.data)
  );
};

export const useCreateJournalEntry = () => {
  return useApiMutation(
    (data) => apiService.journalEntries.create(data),
    {
      successMessage: 'Journal entry created successfully',
      invalidateQueries: [['journalEntries'], ['dashboard']],
    }
  );
};

export const usePostJournalEntry = () => {
  return useApiMutation(
    (id) => apiService.journalEntries.post(id),
    {
      successMessage: 'Journal entry posted successfully',
      invalidateQueries: [['journalEntries'], ['dashboard']],
    }
  );
};

export const useDashboardData = () => {
  return useApiQuery(
    ['dashboard'],
    () => apiService.dashboard.getSummary().then(res => res.data),
    { staleTime: 2 * 60 * 1000 }
  );
};

export const useSuppliers = (params = {}) => {
  return useApiQuery(
    ['suppliers', params],
    () => apiService.suppliers.getAll(params).then(res => res.data)
  );
};

export const useCreateSupplier = () => {
  return useApiMutation(
    (data) => apiService.suppliers.create(data),
    {
      successMessage: 'Supplier created successfully',
      invalidateQueries: [['suppliers']],
    }
  );
};

export const useGrants = (params = {}) => {
  return useApiQuery(
    ['grants', params],
    () => apiService.grants.getAll(params).then(res => res.data)
  );
};

export const useFixedAssets = (params = {}) => {
  return useApiQuery(
    ['fixedAssets', params],
    () => apiService.fixedAssets.getAll(params).then(res => res.data)
  );
};

export const useReports = {
  trialBalance: (params = {}) => {
    return useApiQuery(
      ['reports', 'trialBalance', params],
      () => apiService.reports.trialBalance(params).then(res => res.data),
      { enabled: false } // Only run when explicitly triggered
    );
  },
  
  balanceSheet: (params = {}) => {
    return useApiQuery(
      ['reports', 'balanceSheet', params],
      () => apiService.reports.balanceSheet(params).then(res => res.data),
      { enabled: false }
    );
  },
};
