import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useState } from "react";

export type SplitViewAction = "view" | "create" | "edit" | null;

interface SplitViewContextValue {
  selectedId: number | null;
  action: SplitViewAction;
  selectItem: (id: number) => void;
  editItem: (id: number) => void;
  createItem: () => void;
  clearSelection: () => void;
}

const SplitViewContext = createContext<SplitViewContextValue | null>(null);

interface SplitViewProviderProps {
  children: ReactNode;
}

export function SplitViewProvider({ children }: SplitViewProviderProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [action, setAction] = useState<SplitViewAction>(null);

  const selectItem = useCallback((id: number) => {
    setSelectedId(id);
    setAction("view");
  }, []);

  const editItem = useCallback((id: number) => {
    setSelectedId(id);
    setAction("edit");
  }, []);

  const createItem = useCallback(() => {
    setSelectedId(null);
    setAction("create");
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setAction(null);
  }, []);

  return (
    <SplitViewContext.Provider
      value={{
        selectedId,
        action,
        selectItem,
        editItem,
        createItem,
        clearSelection,
      }}
    >
      {children}
    </SplitViewContext.Provider>
  );
}

export function useSplitView(): SplitViewContextValue {
  const context = useContext(SplitViewContext);
  if (!context) {
    throw new Error("useSplitView must be used within a SplitViewProvider");
  }
  return context;
}
