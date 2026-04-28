// frontend/src/pages/admin/UnsavedChangesContext.tsx
//
// Global context that lets any admin page/component register:
//   1. Whether it has unsaved changes ("dirty" state)
//   2. An async save handler to call from the "Save & Leave" modal button
//
// AdminLayout reads hasDirty and uses useBlocker (React Router v6) to
// intercept navigation attempts. The modal offers Save & Leave, Discard &
// Leave, and Keep Editing.

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UnsavedChangesContextValue {
  /** Mark a named slot as dirty or clean. Use a stable unique key (e.g. row.id or field name). */
  setDirty: (key: string, dirty: boolean) => void;
  /** Register an async save fn for a slot. Called by "Save & Leave". Re-register whenever the fn changes. */
  registerSaveHandler: (key: string, fn: () => Promise<void>) => void;
  /** Unregister a slot's save handler (call on unmount). Dirty state is preserved. */
  unregisterSaveHandler: (key: string) => void;
  /** True when any slot is dirty. */
  hasDirty: boolean;
  /** Save all currently registered handlers (dirty slots only), then clear all dirty state. */
  saveAll: () => Promise<void>;
  /** Discard all dirty state without saving. */
  discardAll: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const UnsavedChangesContext = createContext<UnsavedChangesContextValue>({
  setDirty: () => {},
  registerSaveHandler: () => {},
  unregisterSaveHandler: () => {},
  hasDirty: false,
  saveAll: async () => {},
  discardAll: () => {},
});

export function useUnsavedChanges() {
  return useContext(UnsavedChangesContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  // Set of keys that are currently dirty
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());

  // Save handlers live in a ref so they're always current without re-rendering
  const handlersRef = useRef<Map<string, () => Promise<void>>>(new Map());

  const setDirty = useCallback((key: string, dirty: boolean) => {
    setDirtyKeys((prev) => {
      if (dirty === prev.has(key)) return prev; // no change
      const next = new Set(prev);
      dirty ? next.add(key) : next.delete(key);
      return next;
    });
  }, []);

  const registerSaveHandler = useCallback(
    (key: string, fn: () => Promise<void>) => {
      handlersRef.current.set(key, fn);
    },
    [],
  );

  const unregisterSaveHandler = useCallback((key: string) => {
    handlersRef.current.delete(key);
  }, []);

  const saveAll = useCallback(async () => {
    // Only invoke handlers for currently dirty keys
    const promises = Array.from(dirtyKeys)
      .map((key) => handlersRef.current.get(key))
      .filter(Boolean)
      .map((fn) => fn!());
    await Promise.allSettled(promises);
    setDirtyKeys(new Set());
  }, [dirtyKeys]);

  const discardAll = useCallback(() => {
    setDirtyKeys(new Set());
  }, []);

  return (
    <UnsavedChangesContext.Provider
      value={{
        setDirty,
        registerSaveHandler,
        unregisterSaveHandler,
        hasDirty: dirtyKeys.size > 0,
        saveAll,
        discardAll,
      }}
    >
      {children}
    </UnsavedChangesContext.Provider>
  );
}
