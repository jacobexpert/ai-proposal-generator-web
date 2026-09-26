"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchHealth } from "./api";

export const healthQueryKey = ["system", "health"] as const;

export function useHealth() {
  return useQuery({
    queryKey: healthQueryKey,
    queryFn: ({ signal }) => fetchHealth(signal),
    retry: false,
    refetchInterval: 30_000,
  });
}
