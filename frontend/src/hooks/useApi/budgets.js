import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiService } from "../../services/api";
import {
  defaultQueryOptions,
  createMutationSuccessHandler,
  createMutationErrorHandler,
} from "./core";

// ===== BUDGETS HOOKS =====
export const useBudgets = (params = {}) => {
  return useQuery({
    queryKey: ["budgets", params],
    queryFn: () => apiService.budgets.getAll(params),
    select: (data) => data.data,
    ...defaultQueryOptions,
  });
};

export const useBudget = (id) => {
  return useQuery({
    queryKey: ["budgets", id],
    queryFn: () => apiService.budgets.getById(id),
    select: (data) => data.data,
    enabled: !!id,
    ...defaultQueryOptions,
  });
};

export const useCreateBudget = () => {
  return useMutation({
    mutationFn: (data) => apiService.budgets.create(data),
    onSuccess: createMutationSuccessHandler(
      [["budgets"], ["dashboard"]],
      "Budget created successfully"
    ),
    onError: createMutationErrorHandler("Failed to create budget"),
  });
};

export const useUpdateBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => apiService.budgets.update(id, data),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budgets", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      return createMutationSuccessHandler(
        [],
        "Budget updated successfully"
      )(response);
    },
    onError: createMutationErrorHandler("Failed to update budget"),
  });
};

export const useDeleteBudget = () => {
  return useMutation({
    mutationFn: (id) => apiService.budgets.delete(id),
    onSuccess: createMutationSuccessHandler(
      [["budgets"], ["dashboard"]],
      "Budget deleted successfully"
    ),
    onError: createMutationErrorHandler("Failed to delete budget"),
  });
};

export const useApproveBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => apiService.budgets.approve(id),
    onSuccess: (response, id) => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budgets", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      return createMutationSuccessHandler(
        [],
        "Budget approved successfully"
      )(response);
    },
    onError: createMutationErrorHandler("Failed to approve budget"),
  });
};

export const useBudgetLines = (budgetId) => {
  return useQuery({
    queryKey: ["budgets", budgetId, "lines"],
    queryFn: () => apiService.budgets.getLines(budgetId),
    select: (data) => data.data,
    enabled: !!budgetId,
    ...defaultQueryOptions,
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
