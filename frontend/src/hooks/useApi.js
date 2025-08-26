// frontend/src/hooks/useApi.js - Fixed all API call issues
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { apiService } from "../services/api";

// Utility function to handle API errors consistently
const handleMutationError = (error, defaultMessage) => {
  const message =
    error?.response?.data?.message || error?.message || defaultMessage;
  toast.error(message);
  console.error("Mutation error:", error);
};

// Utility function to handle optimistic updates
const createOptimisticUpdate = (queryKey, updateFn) => ({
  onMutate: async (variables) => {
    await queryClient.cancelQueries({ queryKey });
    const previousData = queryClient.getQueryData(queryKey);

    if (updateFn) {
      queryClient.setQueryData(queryKey, (old) => updateFn(old, variables));
    }

    return { previousData };
  },
  onError: (err, variables, context) => {
    if (context?.previousData) {
      queryClient.setQueryData(queryKey, context.previousData);
    }
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey });
  },
});

// ===== ACCOUNTS HOOKS =====
export const useAccounts = (params = {}) => {
  return useQuery({
    queryKey: ["accounts", params],
    queryFn: () => apiService.accounts.getAll(params),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

export const useAccount = (id) => {
  return useQuery({
    queryKey: ["accounts", id],
    queryFn: () => apiService.accounts.getById(id),
    select: (data) => data.data,
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
};

export const useAccountsHierarchy = () => {
  return useQuery({
    queryKey: ["accounts", "hierarchy"],
    queryFn: () => apiService.accounts.getHierarchy(),
    select: (data) => data.data,
    staleTime: 15 * 60 * 1000,
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => apiService.accounts.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account created successfully");
      return response.data;
    },
    onError: (error) => handleMutationError(error, "Failed to create account"),
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => apiService.accounts.update(id, data),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounts", id] });
      toast.success("Account updated successfully");
      return response.data;
    },
    onError: (error) => handleMutationError(error, "Failed to update account"),
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => apiService.accounts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account deleted successfully");
    },
    onError: (error) => handleMutationError(error, "Failed to delete account"),
  });
};

// ===== JOURNAL ENTRIES HOOKS =====
export const useJournalEntries = (params = {}) => {
  return useQuery({
    queryKey: ["journal-entries", params],
    queryFn: () => apiService.journalEntries.getAll(params),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000,
  });
};

export const useJournalEntry = (id) => {
  return useQuery({
    queryKey: ["journal-entries", id],
    queryFn: () => apiService.journalEntries.getById(id),
    select: (data) => data.data,
    enabled: !!id,
  });
};

export const useCreateJournalEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => apiService.journalEntries.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Journal entry created successfully");
      return response.data;
    },
    onError: (error) =>
      handleMutationError(error, "Failed to create journal entry"),
  });
};

export const useUpdateJournalEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => apiService.journalEntries.update(id, data),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Journal entry updated successfully");
      return response.data;
    },
    onError: (error) =>
      handleMutationError(error, "Failed to update journal entry"),
  });
};

export const usePostJournalEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => apiService.journalEntries.post(id),
    onSuccess: (response, id) => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Journal entry posted successfully");
      return response.data;
    },
    onError: (error) =>
      handleMutationError(error, "Failed to post journal entry"),
  });
};

export const useDeleteJournalEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => apiService.journalEntries.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Journal entry deleted successfully");
    },
    onError: (error) =>
      handleMutationError(error, "Failed to delete journal entry"),
  });
};

// ===== SUPPLIERS HOOKS =====
export const useSuppliers = (params = {}) => {
  return useQuery({
    queryKey: ["suppliers", params],
    queryFn: () => apiService.suppliers.getAll(params),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSupplier = (id) => {
  return useQuery({
    queryKey: ["suppliers", id],
    queryFn: () => apiService.suppliers.getById(id),
    select: (data) => data.data,
    enabled: !!id,
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => apiService.suppliers.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier created successfully");
      return response.data;
    },
    onError: (error) => handleMutationError(error, "Failed to create supplier"),
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => apiService.suppliers.update(id, data),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers", id] });
      toast.success("Supplier updated successfully");
      return response.data;
    },
    onError: (error) => handleMutationError(error, "Failed to update supplier"),
  });
};

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => apiService.suppliers.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier deleted successfully");
    },
    onError: (error) => handleMutationError(error, "Failed to delete supplier"),
  });
};

// ===== GRANTS HOOKS =====
export const useGrants = (params = {}) => {
  return useQuery({
    queryKey: ["grants", params],
    queryFn: () => apiService.grants.getAll(params),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000,
  });
};

export const useGrant = (id) => {
  return useQuery({
    queryKey: ["grants", id],
    queryFn: () => apiService.grants.getById(id),
    select: (data) => data.data,
    enabled: !!id,
  });
};

export const useGrantUtilization = (id) => {
  return useQuery({
    queryKey: ["grants", id, "utilization"],
    queryFn: () => apiService.grants.getUtilization(id),
    select: (data) => data.data,
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateGrant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => apiService.grants.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["grants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Grant created successfully");
      return response.data;
    },
    onError: (error) => handleMutationError(error, "Failed to create grant"),
  });
};

// ===== FIXED ASSETS HOOKS =====
export const useFixedAssets = (params = {}) => {
  return useQuery({
    queryKey: ["fixed-assets", params],
    queryFn: () => apiService.fixedAssets.getAll(params),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000,
  });
};

export const useFixedAsset = (id) => {
  return useQuery({
    queryKey: ["fixed-assets", id],
    queryFn: () => apiService.fixedAssets.getById(id),
    select: (data) => data.data,
    enabled: !!id,
  });
};

export const useCreateFixedAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => apiService.fixedAssets.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["fixed-assets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Fixed asset created successfully");
      return response.data;
    },
    onError: (error) =>
      handleMutationError(error, "Failed to create fixed asset"),
  });
};

// ===== DASHBOARD HOOKS - FIXED =====
export const useDashboardData = (params = {}) => {
  return useQuery({
    queryKey: ["dashboard", "summary", params],
    queryFn: () =>
      apiService.dashboard.getSummary
        ? apiService.dashboard.getSummary(params)
        : apiService.dashboard.getOverview(params),
    select: (data) => data.data,
    staleTime: 2 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });
};

export const useDashboardOverview = (params = {}) => {
  return useQuery({
    queryKey: ["dashboard", "overview", params],
    queryFn: () => apiService.dashboard.getOverview(params),
    select: (data) => data.data,
    staleTime: 2 * 60 * 1000,
  });
};

export const useDashboardFinancialSummary = (params = {}) => {
  return useQuery({
    queryKey: ["dashboard", "financial-summary", params],
    queryFn: () => apiService.dashboard.getFinancialSummary(params),
    select: (data) => data.data,
    staleTime: 2 * 60 * 1000,
  });
};

export const useDashboardCharts = (params = {}) => {
  return useQuery({
    queryKey: ["dashboard", "charts", params],
    queryFn: async () => {
      const [revenueChart, expenseChart] = await Promise.allSettled([
        apiService.dashboard.getRevenueChart(params),
        apiService.dashboard.getExpenseChart(params),
      ]);

      return {
        revenueChart:
          revenueChart.status === "fulfilled" ? revenueChart.value.data : null,
        expenseChart:
          expenseChart.status === "fulfilled" ? expenseChart.value.data : null,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
};

// Comprehensive dashboard data hook
export const useComprehensiveDashboard = (params = {}) => {
  return useQuery({
    queryKey: ["dashboard", "comprehensive", params],
    queryFn: () => apiService.dashboard.getComprehensiveData(params),
    staleTime: 2 * 60 * 1000,
    retry: 2,
    select: (data) => data,
  });
};

// ===== REPORTS HOOKS =====
export const useTrialBalance = (params = {}) => {
  return useQuery({
    queryKey: ["reports", "trial-balance", params],
    queryFn: () => apiService.reports.trialBalance(params),
    select: (data) => data.data,
    enabled: false, // Only run when explicitly requested
    staleTime: 0, // Always fresh for reports
  });
};

export const useBalanceSheet = (params = {}) => {
  return useQuery({
    queryKey: ["reports", "balance-sheet", params],
    queryFn: () => apiService.reports.balanceSheet(params),
    select: (data) => data.data,
    enabled: false,
    staleTime: 0,
  });
};

export const useIncomeStatement = (params = {}) => {
  return useQuery({
    queryKey: ["reports", "income-statement", params],
    queryFn: () => apiService.reports.incomeStatement(params),
    select: (data) => data.data,
    enabled: false,
    staleTime: 0,
  });
};

export const useCashFlow = (params = {}) => {
  return useQuery({
    queryKey: ["reports", "cash-flow", params],
    queryFn: () => apiService.reports.cashFlow(params),
    select: (data) => data.data,
    enabled: false,
    staleTime: 0,
  });
};

// ===== COST CENTERS & PROJECTS HOOKS =====
export const useCostCenters = (params = {}) => {
  return useQuery({
    queryKey: ["cost-centers", params],
    queryFn: () => apiService.costCenters.getAll(params),
    select: (data) => data.data,
    staleTime: 10 * 60 * 1000,
  });
};

export const useCostCenter = (id) => {
  return useQuery({
    queryKey: ["cost-centers", id],
    queryFn: () => apiService.costCenters.getById(id),
    select: (data) => data.data,
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
};

// FIXED: Add the missing cost center mutation hooks
export const useCreateCostCenter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => apiService.costCenters.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["cost-centers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Cost center created successfully");
      return response.data;
    },
    onError: (error) =>
      handleMutationError(error, "Failed to create cost center"),
  });
};

export const useUpdateCostCenter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => apiService.costCenters.update(id, data),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["cost-centers"] });
      queryClient.invalidateQueries({ queryKey: ["cost-centers", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Cost center updated successfully");
      return response.data;
    },
    onError: (error) =>
      handleMutationError(error, "Failed to update cost center"),
  });
};

export const useDeleteCostCenter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => apiService.costCenters.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-centers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Cost center deleted successfully");
    },
    onError: (error) =>
      handleMutationError(error, "Failed to delete cost center"),
  });
};

export const useProjects = (params = {}) => {
  return useQuery({
    queryKey: ["projects", params],
    queryFn: () => apiService.projects.getAll(params),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000,
  });
};

export const useProjectExpenses = (id, params = {}) => {
  return useQuery({
    queryKey: ["projects", id, "expenses", params],
    queryFn: () => apiService.projects.getExpenses(id, params),
    select: (data) => data.data,
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

// ===== BUDGETS HOOKS =====
export const useBudgets = (params = {}) => {
  return useQuery({
    queryKey: ["budgets", params],
    queryFn: () => apiService.budgets.getAll(params),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000,
  });
};

export const useBudgetLines = (budgetId) => {
  return useQuery({
    queryKey: ["budgets", budgetId, "lines"],
    queryFn: () => apiService.budgets.getLines(budgetId),
    select: (data) => data.data,
    enabled: !!budgetId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useBudgetVarianceAnalysis = (budgetId) => {
  return useQuery({
    queryKey: ["budgets", budgetId, "variance"],
    queryFn: () => apiService.budgets.getVarianceAnalysis(budgetId),
    select: (data) => data.data,
    enabled: !!budgetId,
    staleTime: 2 * 60 * 1000,
  });
};

// ===== UTILITY HOOKS =====

// Health check hook
export const useApiHealth = () => {
  return useQuery({
    queryKey: ["api", "health"],
    queryFn: () => apiService.health.check(),
    select: (data) => data.data,
    refetchInterval: 30000, // Check every 30 seconds
    refetchIntervalInBackground: false,
    retry: 1,
  });
};

// Advanced API Hook for complex scenarios
export const useAdvancedApi = () => {
  const queryClient = useQueryClient();

  const useAdvancedQuery = (key, queryFn, options = {}) => {
    return useQuery({
      queryKey: key,
      queryFn,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
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
      ...createOptimisticUpdate(options.queryKey, options.optimisticUpdate),
      onSuccess: (data, variables, context) => {
        if (options.onSuccess) {
          options.onSuccess(data, variables, context);
        }
      },
      onError: (error, variables, context) => {
        if (options.onError) {
          options.onError(error, variables, context);
        } else {
          handleMutationError(error, "Operation failed");
        }
      },
    });
  };

  return {
    useAdvancedQuery,
    useOptimisticMutation,
  };
};

// Export all hooks as a collection for easier imports
export const apiHooks = {
  // Accounts
  useAccounts,
  useAccount,
  useAccountsHierarchy,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,

  // Journal Entries
  useJournalEntries,
  useJournalEntry,
  useCreateJournalEntry,
  useUpdateJournalEntry,
  usePostJournalEntry,
  useDeleteJournalEntry,

  // Suppliers
  useSuppliers,
  useSupplier,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,

  // Grants
  useGrants,
  useGrant,
  useGrantUtilization,
  useCreateGrant,

  // Fixed Assets
  useFixedAssets,
  useFixedAsset,
  useCreateFixedAsset,

  // Dashboard
  useDashboardData,
  useDashboardOverview,
  useDashboardFinancialSummary,
  useDashboardCharts,
  useComprehensiveDashboard,

  // Reports
  useTrialBalance,
  useBalanceSheet,
  useIncomeStatement,
  useCashFlow,

  // Cost Centers & Projects
  useCostCenters,
  useCostCenter,
  useCreateCostCenter, // FIXED: Added missing hook
  useUpdateCostCenter, // FIXED: Added missing hook
  useDeleteCostCenter, // FIXED: Added missing hook
  useProjects,
  useProjectExpenses,

  // Budgets
  useBudgets,
  useBudgetLines,
  useBudgetVarianceAnalysis,

  // Utility
  useApiHealth,
  useAdvancedApi,
};
