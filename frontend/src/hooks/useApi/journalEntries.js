import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiService } from "../../services/api";
import {
  defaultQueryOptions,
  createMutationSuccessHandler,
  createMutationErrorHandler,
} from "./core";

// ===== JOURNAL ENTRIES HOOKS =====
export const useJournalEntries = (params = {}) => {
  return useQuery({
    queryKey: ["journal-entries", params],
    queryFn: () => apiService.journalEntries.getAll(params),
    select: (data) => data.data,
    ...defaultQueryOptions,
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
  return useMutation({
    mutationFn: (data) => apiService.journalEntries.create(data),
    onSuccess: createMutationSuccessHandler(
      [["journal-entries"], ["dashboard"]],
      "Journal entry created successfully"
    ),
    onError: createMutationErrorHandler("Failed to create journal entry"),
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
      return createMutationSuccessHandler(
        [],
        "Journal entry updated successfully"
      )(response);
    },
    onError: createMutationErrorHandler("Failed to update journal entry"),
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
      return createMutationSuccessHandler(
        [],
        "Journal entry posted successfully"
      )(response);
    },
    onError: createMutationErrorHandler("Failed to post journal entry"),
  });
};

export const useDeleteJournalEntry = () => {
  return useMutation({
    mutationFn: (id) => apiService.journalEntries.delete(id),
    onSuccess: createMutationSuccessHandler(
      [["journal-entries"], ["dashboard"]],
      "Journal entry deleted successfully"
    ),
    onError: createMutationErrorHandler("Failed to delete journal entry"),
  });
};
