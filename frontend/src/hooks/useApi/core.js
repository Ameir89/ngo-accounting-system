import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

// Utility function to handle API errors consistently
export const handleMutationError = (error, defaultMessage) => {
  const message =
    error?.response?.data?.message || error?.message || defaultMessage;
  toast.error(message);
  console.error("Mutation error:", error);
};

// Utility function to handle optimistic updates
export const createOptimisticUpdate = (queryKey, updateFn) => ({
  onMutate: async (variables) => {
    const queryClient = useQueryClient();
    await queryClient.cancelQueries({ queryKey });
    const previousData = queryClient.getQueryData(queryKey);

    if (updateFn) {
      queryClient.setQueryData(queryKey, (old) => updateFn(old, variables));
    }

    return { previousData };
  },
  onError: (err, variables, context) => {
    const queryClient = useQueryClient();
    if (context?.previousData) {
      queryClient.setQueryData(queryKey, context.previousData);
    }
  },
  onSettled: () => {
    const queryClient = useQueryClient();
    queryClient.invalidateQueries({ queryKey });
  },
});

// Common query options
export const defaultQueryOptions = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  retry: (failureCount, error) => {
    if (error?.response?.status >= 400 && error?.response?.status < 500) {
      return false;
    }
    return failureCount < 3;
  },
};

// Common mutation success handler factory
export const createMutationSuccessHandler = (queryKeys, message) => {
  return (response) => {
    const queryClient = useQueryClient();
    queryKeys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key });
    });
    toast.success(message);
    return response.data;
  };
};

// Common mutation error handler factory
export const createMutationErrorHandler = (message) => {
  return (error) => handleMutationError(error, message);
};
