"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { logout } from "./api";

/** US-FE-02 AC4: end the session, drop every cached query, go to /login. */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: logout,
    meta: { errorToast: false },
    // The BFF clears the cookies even when the API is unreachable, so always leave.
    onSettled: () => {
      queryClient.clear();
      router.replace("/login");
      router.refresh();
    },
  });
}
