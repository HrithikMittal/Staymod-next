"use client";

import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";

import { apiFetch, type ApiFetchOptions } from "@/utils/api-fetch";

export function useApiMutation<TData, TVariables = void>(
  path: string,
  getOptions?: (variables: TVariables) => ApiFetchOptions,
  options?: Omit<
    UseMutationOptions<TData, Error, TVariables>,
    "mutationFn"
  >,
): UseMutationResult<TData, Error, TVariables> {
  return useMutation({
    mutationFn: async (variables) => {
      const extra = getOptions?.(variables) ?? {};
      return apiFetch<TData>(path, {
        method: "POST",
        ...extra,
        ...(variables === undefined ? {} : { json: variables }),
      });
    },
    ...options,
  });
}
