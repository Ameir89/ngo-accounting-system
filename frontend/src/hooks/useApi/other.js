import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiService } from "../../services/api";
import {
  defaultQueryOptions,
  createMutationSuccessHandler,
  createMutationErrorHandler,
} from "./core";

// ===== SUPPLIERS HOOKS =====
export const useSuppliers = (params = {}) => {
  return useQuery({
    queryKey: ["suppliers", params],
    queryFn: () => apiService.suppliers.getAll(params),
    select: (data) => data.data,
    ...defaultQueryOptions,
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
  return useMutation({
    mutationFn: (data) => apiService.suppliers.create(data),
    onSuccess: createMutationSuccessHandler(
      [["suppliers"]],
      "Supplier created successfully"
    ),
    onError: createMutationErrorHandler("Failed to create supplier"),
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => apiService.suppliers.update(id, data),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers", id] });
      return createMutationSuccessHandler(
        [],
        "Supplier updated successfully"
      )(response);
    },
    onError: createMutationErrorHandler("Failed to update supplier"),
  });
};

export const useDeleteSupplier = () => {
  return useMutation({
    mutationFn: (id) => apiService.suppliers.delete(id),
    onSuccess: createMutationSuccessHandler(
      [["suppliers"]],
      "Supplier deleted successfully"
    ),
    onError: createMutationErrorHandler("Failed to delete supplier"),
  });
};

// ===== GRANTS HOOKS =====
export const useGrants = (params = {}) => {
  return useQuery({
    queryKey: ["grants", params],
    queryFn: () => apiService.grants.getAll(params),
    select: (data) => data.data,
    ...defaultQueryOptions,
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
  return useMutation({
    mutationFn: (data) => apiService.grants.create(data),
    onSuccess: createMutationSuccessHandler(
      [["grants"], ["dashboard"]],
      "Grant created successfully"
    ),
    onError: createMutationErrorHandler("Failed to create grant"),
  });
};

// ===== FIXED ASSETS HOOKS =====
export const useFixedAssets = (params = {}) => {
  return useQuery({
    queryKey: ["fixed-assets", params],
    queryFn: () => apiService.fixedAssets.getAll(params),
    select: (data) => data.data,
    ...defaultQueryOptions,
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
  return useMutation({
    mutationFn: (data) => apiService.fixedAssets.create(data),
    onSuccess: createMutationSuccessHandler(
      [["fixed-assets"], ["dashboard"]],
      "Fixed asset created successfully"
    ),
    onError: createMutationErrorHandler("Failed to create fixed asset"),
  });
};

// ===== COST CENTERS HOOKS =====
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

export const useCreateCostCenter = () => {
  return useMutation({
    mutationFn: (data) => apiService.costCenters.create(data),
    onSuccess: createMutationSuccessHandler(
      [["cost-centers"], ["dashboard"]],
      "Cost center created successfully"
    ),
    onError: createMutationErrorHandler("Failed to create cost center"),
  });
};

/*************  ✨ Windsurf Command ⭐  *************/
/**
   * Hook for updating a cost center.
   *
   * Upon success, invalidates the cache for:
   * - The list of cost centers
   * - The specific cost center that was updated
   * - The dashboard
   *
   * @returns A mutation hook with the following properties:
   * - `mutate`: A function that accepts an object with `id` and `data` properties.
   * - `isLoading`: A boolean indicating whether the mutation is in progress.
   * - `isSuccess`: A boolean indicating whether the mutation was successful.
   * - `isError`: A boolean indicating whether the mutation failed.

/*******  fd10d162-12d3-4046-9f1d-5732c415c698  *******/
export const useUpdateCostCenter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => apiService.costCenters.update(id, data),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["cost-centers"] });
      queryClient.invalidateQueries({ queryKey: ["cost-centers", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });

      // Use toast directly here (not in a handler function)
      toast.success("Cost center updated successfully");
    },
    onError: createMutationErrorHandler("Failed to update cost center"),
  });
};

export const useDeleteCostCenter = () => {
  return useMutation({
    mutationFn: (id) => apiService.costCenters.delete(id),
    onSuccess: createMutationSuccessHandler(
      [["cost-centers"], ["dashboard"]],
      "Cost center deleted successfully"
    ),
    onError: createMutationErrorHandler("Failed to delete cost center"),
  });
};
