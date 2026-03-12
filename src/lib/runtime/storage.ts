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

export function clearAllRuntimeStates(): void {
  if (typeof window === "undefined") {
    return;
  }

  const keysToRemove: string[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (key?.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => {
    window.localStorage.removeItem(key);
  });
}
