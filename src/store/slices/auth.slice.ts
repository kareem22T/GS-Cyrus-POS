import apiClient from "@/api/client";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

interface User {
  id: string;
  email: string;
  name: string;
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

export const useAuthStore = create<AuthState>((set) => ({
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
      await SecureStore.setItemAsync("accessToken", token);

      set({ user, isAuthenticated: true });
    } catch (error) {
      throw error;
    }
  },

  logout: async () => {
    // Clear local data regardless of API call success
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      if (!token) {
        set({ isAuthenticated: false, isLoading: false });
        return;
      }

      // Validate token with backend
      // const response = await apiClient.get("/auth/me");
      set({
        user: /*response.data*/ {
          id: "",
          name: "",
          email: "",
        },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      set({ isAuthenticated: false, isLoading: false });
    }
  },
}));
