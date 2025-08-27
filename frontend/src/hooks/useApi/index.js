// This file aggregates and exports all hooks from the modular structure

// Import all hooks from their respective modules
export {
  useAccounts,
  useAccount,
  useAccountsHierarchy,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
} from "./accounts";

export {
  useJournalEntries,
  useJournalEntry,
  useCreateJournalEntry,
  useUpdateJournalEntry,
  usePostJournalEntry,
  useDeleteJournalEntry,
} from "./journalEntries";

export {
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useProjectExpenses,
} from "./projects";

export {
  useBudgets,
  useBudget,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
  useApproveBudget,
  useBudgetLines,
  useBudgetVarianceAnalysis,
} from "./budgets";

export {
  useSuppliers,
  useSupplier,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  useGrants,
  useGrant,
  useGrantUtilization,
  useCreateGrant,
  useFixedAssets,
  useFixedAsset,
  useCreateFixedAsset,
  useCostCenters,
  useCostCenter,
  useCreateCostCenter,
  useUpdateCostCenter,
  useDeleteCostCenter,
} from "./other";

export {
  useDashboardData,
  useDashboardOverview,
  useDashboardFinancialSummary,
  useDashboardCharts,
  useComprehensiveDashboard,
  useTrialBalance,
  useBalanceSheet,
  useIncomeStatement,
  useCashFlow,
  useApiHealth,
  useAdvancedApi,
} from "./reportsAndDashboard";

// Export core utilities for advanced usage
export {
  handleMutationError,
  createOptimisticUpdate,
  defaultQueryOptions,
  createMutationSuccessHandler,
  createMutationErrorHandler,
} from "./core";

// Export all hooks as a collection for easier imports (backward compatibility)
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
  useCreateCostCenter,
  useUpdateCostCenter,
  useDeleteCostCenter,
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useProjectExpenses,

  // Budgets
  useBudgets,
  useBudget,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
  useApproveBudget,
  useBudgetLines,
  useBudgetVarianceAnalysis,

  // Utility
  useApiHealth,
  useAdvancedApi,
};
