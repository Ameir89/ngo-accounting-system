// frontend/src/hooks/useApi/reportsAndDashboard.js - Dashboard and reports hooks
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiService } from "../../services/api";
import { handleMutationError, createOptimisticUpdate } from "./core";

// ===== DASHBOARD HOOKS =====
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

// ===== UTILITY HOOKS =====
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
