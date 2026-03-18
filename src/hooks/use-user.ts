"use client";

import { useUserContext } from "@/providers/user-provider";

export function useUser() {
  return useUserContext();
}
