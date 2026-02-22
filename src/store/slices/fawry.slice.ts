import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { FawryPaymentModule } from "../../../modules/FawryPaymentModule"; // adjust path as needed

const FAWRY_CREDENTIALS_KEY = "fawry_pos_credentials";

export interface FawryCredentials {
  username: string;
  password: string;
  terminalId: string;
}

interface FawryState {
  credentials: FawryCredentials | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;

  // Actions
  loadAndConnect: () => Promise<void>;
  saveAndConnect: (creds: FawryCredentials) => Promise<void>;
  clearCredentials: () => Promise<void>;
  retryConnection: () => Promise<void>;
  setConnected: (val: boolean) => void;
}

export const useFawryStore = create<FawryState>(
  (set, get) =>
    ({
      credentials: null,
      isConnected: false,
      isConnecting: false,
      error: null,

      setConnected: (val) => set({ isConnected: val }),

      loadAndConnect: async () => {
        try {
          const stored = await AsyncStorage.getItem(FAWRY_CREDENTIALS_KEY);
          if (!stored) return;

          const creds: FawryCredentials = JSON.parse(stored);
          set({ credentials: creds });
          await get()._connect(creds);
        } catch {
          // Silently fail on load
        }
      },

      saveAndConnect: async (creds) => {
        set({ error: null });
        await AsyncStorage.setItem(
          FAWRY_CREDENTIALS_KEY,
          JSON.stringify(creds),
        );
        set({ credentials: creds });
        await get()._connect(creds);
      },

      clearCredentials: async () => {
        await AsyncStorage.removeItem(FAWRY_CREDENTIALS_KEY);
        set({ credentials: null, isConnected: false, error: null });
      },

      retryConnection: async () => {
        const { credentials } = get();
        if (credentials) {
          await get()._connect(credentials);
        }
      },

      // Internal — not exposed in type but used internally
      _connect: async (creds: FawryCredentials) => {
        set({ isConnecting: true, error: null });
        try {
          await FawryPaymentModule.connect(creds.username, creds.password);
          set({ isConnected: true, isConnecting: false });
        } catch (err: any) {
          set({
            isConnected: false,
            isConnecting: false,
            error: err?.message || "فشل الاتصال بجهاز فوري",
          });
        }
      },
    }) as any,
);
