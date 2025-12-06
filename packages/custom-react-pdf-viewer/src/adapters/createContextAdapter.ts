import type { StateAdapter } from '../pdf/CustomPdfViewer';

/**
 * Interface representing a generic Context that manages PDF state.
 * Users would likely have something similar to this in their app.
 */
export interface PdfContextType {
  values: Record<string, any>;
  setValue: (key: string, value: any) => void;
}

/**
 * Creates a StateAdapter that bridges to a React Context.
 * * @param context - The object returned by useContext(MyContext)
 * @param persistenceId - Unique ID to namespace the keys within the context
 * @returns A StateAdapter compatible with CustomPdfViewer
 */
export function createContextAdapter(
  context: PdfContextType,
  persistenceId: string
): StateAdapter {
  return {
    get: <T>(key: string): T | undefined => {
      const contextKey = `${persistenceId}_${key}`;
      return context.values[contextKey] as T | undefined;
    },

    set: <T>(key: string, value: T): void => {
      const contextKey = `${persistenceId}_${key}`;
      context.setValue(contextKey, value);
    }
  };
}