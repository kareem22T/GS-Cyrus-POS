import { API_BASE_URL } from "@/constants/config";
import { emitUnauthorized } from "@/utils/auth-events";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await SecureStore.getItemAsync("accessToken");
    console.log("token", token);

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor - Handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear auth data
      await SecureStore.deleteItemAsync("accessToken");
      await SecureStore.deleteItemAsync("refreshToken");

      // Tell the app that we're unauthorized so the auth store can update
      emitUnauthorized();

      // Redirect to login (UI + layouts will now see isAuthenticated = false)
      router.replace("/(auth)/login");
    }
    return Promise.reject(error);
  },
);

export default apiClient;
