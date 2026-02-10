import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ChatModel } from "@flatsby/validators/models";
import { CHAT_MODELS } from "@flatsby/validators/models";

const STORAGE_KEY = "chat-store";

interface PersistedState {
  selectedModel: ChatModel;
  toolsEnabled: boolean;
}

interface ChatStoreState extends PersistedState {
  setSelectedModel: (model: ChatModel) => void;
  setToolsEnabled: (enabled: boolean) => void;
  isLoading: boolean;
}

const ChatStoreContext = createContext<ChatStoreState | null>(null);

export function ChatStoreProvider({ children }: { children: ReactNode }) {
  const [selectedModel, setSelectedModelState] = useState<ChatModel>(
    CHAT_MODELS[0].id,
  );
  const [toolsEnabled, setToolsEnabledState] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const persist = useCallback((state: Partial<PersistedState>) => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        const current = value ? (JSON.parse(value) as PersistedState) : {};
        return AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...current, ...state }),
        );
      })
      .catch(console.error);
  }, []);

  // Load persisted state on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value) {
          const parsed = JSON.parse(value) as PersistedState;
          // Validate that the stored model is still valid
          const isValidModel = CHAT_MODELS.some((m) => m.id === parsed.selectedModel);
          if (isValidModel) {
            setSelectedModelState(parsed.selectedModel);
          }
          if (typeof parsed.toolsEnabled === "boolean") {
            setToolsEnabledState(parsed.toolsEnabled);
          }
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const setSelectedModel = useCallback(
    (model: ChatModel) => {
      setSelectedModelState(model);
      persist({ selectedModel: model });
    },
    [persist],
  );

  const setToolsEnabled = useCallback(
    (enabled: boolean) => {
      setToolsEnabledState(enabled);
      persist({ toolsEnabled: enabled });
    },
    [persist],
  );

  return (
    <ChatStoreContext.Provider
      value={{
        selectedModel,
        setSelectedModel,
        toolsEnabled,
        setToolsEnabled,
        isLoading,
      }}
    >
      {children}
    </ChatStoreContext.Provider>
  );
}

export function useChatStore() {
  const context = useContext(ChatStoreContext);
  if (!context) {
    throw new Error("useChatStore must be used within a ChatStoreProvider");
  }
  return context;
}
