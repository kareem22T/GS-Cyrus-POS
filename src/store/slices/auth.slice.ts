import apiClient from "@/api/client";
import { onUnauthorized } from "@/utils/auth-events";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

interface User {
  userId: string;
  username: string;
  role: string;
  companyId: number;
  companyName: string;
  branchId: number;
  branchName: string;
  deviceId: number;
  deviceSerial: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    username: string,
    password: string,
    deviceSerial?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // subscribe once to unauthorized events so that any 401 clears auth state
  onUnauthorized(() => {
    // call store logout action if available
    get().logout?.();
  });

  return {
    user: null,
    isAuthenticated: false,
    isLoading: true,

    login: async (
      username: string,
      password: string,
      deviceSerial: string = "2034082646",
    ) => {
      try {
        const response = await apiClient.post("/api/pos/login", {
          username,
          password,
          deviceSerial,
        });
        const { token, isSuccess, user, message } = response.data;

        if (!isSuccess || !token) {
          throw new Error(message || "Authentication failed");
        }

        // Store token securely
        await AsyncStorage.setItem("accessToken", token);

        set({ user, isAuthenticated: true });
      } catch (error) {
        throw error;
      }
    },

    logout: async () => {
      // Clear local data regardless of API call success
      await AsyncStorage.removeItem("accessToken");
      await AsyncStorage.removeItem("refreshToken");
      set({ user: null, isAuthenticated: false });
    },

    checkAuth: async () => {
      try {
        const token = await AsyncStorage.getItem("accessToken");
        if (!token) {
          set({ isAuthenticated: false, isLoading: false });
          return;
        }

        const response = await apiClient.get("/api/pos/me");
        set({
          user: response.data,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        // invalid/expired token
        await AsyncStorage.removeItem("accessToken");
        set({ isAuthenticated: false, isLoading: false });
      }
    },
  };
});
