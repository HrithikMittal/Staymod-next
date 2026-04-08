"use client";

import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";

import { apiFetch, type ApiFetchOptions } from "@/utils/api-fetch";

type Key = readonly unknown[];

export function useApiQuery<TData, TKey extends Key = Key>(
  queryKey: TKey,
  path: string,
  fetchOptions?: ApiFetchOptions,
  options?: Omit<UseQueryOptions<TData, Error, TData, TKey>, "queryKey" | "queryFn">,
): UseQueryResult<TData, Error> {
  return useQuery({
    queryKey,
    queryFn: () => apiFetch<TData>(path, fetchOptions),
    ...options,
  });
}
