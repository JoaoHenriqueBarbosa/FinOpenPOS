import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import type { MutationFunctionContext } from "@tanstack/query-core";
import { toast } from "sonner";

interface UseCrudMutationOptions<TData, TError, TVariables, TOnMutateResult> {
  mutationOptions: UseMutationOptions<TData, TError, TVariables, TOnMutateResult>;
  invalidateKeys: unknown[] | unknown[][];
  successMessage: string;
  errorMessage: string;
  onSuccess?: (data: TData) => void;
}

export function useCrudMutation<
  TData,
  TError = Error,
  TVariables = void,
  TOnMutateResult = unknown,
>({
  mutationOptions,
  invalidateKeys,
  successMessage,
  errorMessage,
  onSuccess: onSuccessCallback,
}: UseCrudMutationOptions<TData, TError, TVariables, TOnMutateResult>) {
  const queryClient = useQueryClient();

  const isArrayOfArrays =
    invalidateKeys.length > 0 && Array.isArray(invalidateKeys[0]);

  const { onSuccess: originalOnSuccess, onError: originalOnError, ...rest } =
    mutationOptions;

  return useMutation<TData, TError, TVariables, TOnMutateResult>({
    ...rest,
    onSuccess: (
      data: TData,
      variables: TVariables,
      onMutateResult: TOnMutateResult,
      context: MutationFunctionContext,
    ) => {
      if (isArrayOfArrays) {
        for (const key of invalidateKeys as unknown[][]) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      } else {
        queryClient.invalidateQueries({ queryKey: invalidateKeys });
      }
      toast.success(successMessage);
      onSuccessCallback?.(data);
      originalOnSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (
      error: TError,
      variables: TVariables,
      onMutateResult: TOnMutateResult | undefined,
      context: MutationFunctionContext,
    ) => {
      toast.error(errorMessage);
      originalOnError?.(error, variables, onMutateResult, context);
    },
  });
}
