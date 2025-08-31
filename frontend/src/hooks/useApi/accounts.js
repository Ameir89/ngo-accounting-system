import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiService } from "../../services/api";
import {
  defaultQueryOptions,
  createMutationSuccessHandler,
  createMutationErrorHandler,
} from "./core";

// ===== ACCOUNTS HOOKS =====
export const useAccounts = (params = {}) => {
  return useQuery({
    queryKey: ["accounts", params],
    queryFn: () => apiService.accounts.getAll(params),
    select: (data) => data.data,
    ...defaultQueryOptions,
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
  return useMutation({
    mutationFn: (data) => apiService.accounts.create(data),
    onSuccess: createMutationSuccessHandler(
      [["accounts"]],
      "Account created successfully"
    ),
    onError: createMutationErrorHandler("Failed to create account"),
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => apiService.accounts.update(id, data),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounts", id] });
      return createMutationSuccessHandler(
        [],
        "Account updated successfully"
      )(response);
    },
    onError: createMutationErrorHandler("Failed to update account"),
  });
};

export const useDeleteAccount = () => {
  return useMutation({
    mutationFn: (id) => apiService.accounts.delete(id),
    onSuccess: createMutationSuccessHandler(
      [["accounts"]],
      "Account deleted successfully"
    ),
    onError: createMutationErrorHandler("Failed to delete account"),
  });
};
