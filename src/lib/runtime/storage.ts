import type { RuntimeState } from "@/lib/runtime/types";

const STORAGE_PREFIX = "ldt:runtime:";

export function getRuntimeStorageKey(courseId: string): string {
  return `${STORAGE_PREFIX}${courseId}`;
}

export function loadRuntimeState(courseId: string): RuntimeState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(getRuntimeStorageKey(courseId));

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as RuntimeState;
  } catch {
    window.localStorage.removeItem(getRuntimeStorageKey(courseId));
    return null;
  }
}

export function saveRuntimeState(courseId: string, state: RuntimeState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getRuntimeStorageKey(courseId),
    JSON.stringify(state)
  );
}

export function clearRuntimeState(courseId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getRuntimeStorageKey(courseId));
}
