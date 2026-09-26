"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "apg.sidebar-collapsed";
const listeners = new Set<() => void>();
// Fallback when storage is unavailable (private mode, blocked site data).
let memoryValue = false;

function read(): boolean {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === null ? memoryValue : stored === "1";
  } catch {
    return memoryValue;
  }
}

function write(value: boolean) {
  memoryValue = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    /* keep the in-memory value */
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Per-viewer UI preference only — never data or tokens. Server render is always expanded. */
export function useSidebarCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(subscribe, read, () => false);
  const toggle = useCallback(() => write(!read()), []);
  return [collapsed, toggle];
}

/** Test helper. */
export function resetSidebarPreference() {
  memoryValue = false;
}
