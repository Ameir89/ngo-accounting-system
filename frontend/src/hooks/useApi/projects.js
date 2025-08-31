import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiService } from "../../services/api";
import {
  defaultQueryOptions,
  createMutationSuccessHandler,
  createMutationErrorHandler,
} from "./core";

// ===== PROJECTS HOOKS =====
export const useProjects = (params = {}) => {
  return useQuery({
    queryKey: ["projects", params],
    queryFn: () => apiService.projects.getAll(params),
    select: (data) => data.data,
    ...defaultQueryOptions,
  });
};

export const useProject = (id) => {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: () => apiService.projects.getById(id),
    select: (data) => data.data,
    enabled: !!id,
    ...defaultQueryOptions,
  });
};

export const useCreateProject = () => {
  return useMutation({
    mutationFn: (data) => apiService.projects.create(data),
    onSuccess: createMutationSuccessHandler(
      [["projects"], ["dashboard"]],
      "Project created successfully"
    ),
    onError: createMutationErrorHandler("Failed to create project"),
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => apiService.projects.update(id, data),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      return createMutationSuccessHandler(
        [],
        "Project updated successfully"
      )(response);
    },
    onError: createMutationErrorHandler("Failed to update project"),
  });
};

export const useDeleteProject = () => {
  return useMutation({
    mutationFn: (id) => apiService.projects.delete(id),
    onSuccess: createMutationSuccessHandler(
      [["projects"], ["dashboard"]],
      "Project deleted successfully"
    ),
    onError: createMutationErrorHandler("Failed to delete project"),
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
