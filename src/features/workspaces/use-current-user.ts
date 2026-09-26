"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchCurrentUser } from "./api";
import { meKey } from "./query-keys";

/** The signed-in user with their workspaces (`GET /api/me`). */
export function useCurrentUser() {
  return useQuery({ queryKey: meKey, queryFn: ({ signal }) => fetchCurrentUser(signal) });
}
