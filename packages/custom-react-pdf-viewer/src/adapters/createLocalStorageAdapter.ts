import type { StateAdapter } from '../pdf/CustomPdfViewer';

/**
 * Creates a StateAdapter that persists to localStorage.
 * * @param persistenceId - A unique ID for the document or view context (e.g. "contract.pdf" or "left-pane").
 * @returns A StateAdapter with the ID curried into the get/set calls.
 */
export function createLocalStorageAdapter(persistenceId: string): StateAdapter {
  return {
    get: <T>(key: string): T | undefined => {
      try {
        const storageKey = `pdf_viewer_${persistenceId}_${key}`;
        const item = localStorage.getItem(storageKey);
        return item ? JSON.parse(item) : undefined;
      } catch (e) {
        return undefined;
      }
    },

    set: <T>(key: string, value: T): void => {
      try {
        const storageKey = `pdf_viewer_${persistenceId}_${key}`;
        localStorage.setItem(storageKey, JSON.stringify(value));
      } catch (e) {
        console.warn("Storage write error", e);
      }
    }
  };
}