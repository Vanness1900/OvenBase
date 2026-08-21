"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * localStorage-backed string state.
 *
 * Restoring a saved value with `useState` + `useEffect` means calling setState
 * inside an effect, which React 19's lint rightly flags as a cascading render.
 * localStorage is an external store, so `useSyncExternalStore` is the right
 * primitive -- and it is built to handle a server snapshot that differs from
 * the client one: React hydrates with the server value, then re-renders with
 * the client value without reporting a mismatch.
 *
 * That divergence is exactly what we need for currency, where the server can't
 * know the visitor's region.
 */

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb); // writes from other tabs
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * getSnapshot runs on every render, so results are cached: it must return a
 * referentially stable value or React loops.
 */
const snapshots = new Map<string, string>();

function computeSnapshot(key: string, serverDefault: string, clientDefault?: () => string): string {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(key);
  } catch {
    stored = null;
  }

  const next = stored ?? clientDefault?.() ?? serverDefault;
  const prev = snapshots.get(key);
  if (prev === next) return prev;
  snapshots.set(key, next);
  return next;
}

export function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode or quota -- keep it in memory for this session */
  }
  snapshots.set(key, value);
  for (const cb of listeners) cb();
}

/**
 * @param key            localStorage key
 * @param serverDefault  rendered on the server and used if nothing resolves
 * @param clientDefault  optional client-only guess when nothing is stored
 */
export function usePersistentString(
  key: string,
  serverDefault: string,
  clientDefault?: () => string,
): [string, (v: string) => void] {
  const getSnapshot = useCallback(
    () => computeSnapshot(key, serverDefault, clientDefault),
    [key, serverDefault, clientDefault],
  );
  const getServerSnapshot = useCallback(() => serverDefault, [serverDefault]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const set = useCallback((v: string) => writeStored(key, v), [key]);

  return [value, set];
}
