/**
 * useFawryCredentials
 *
 * Thin wrapper around useFawryStore for use in the Settings screen.
 * All state is global — any component reading isConnected sees the same value.
 */
import { useFawryStore } from "@/store/slices/fawry.slice";

export function useFawryCredentials() {
  const {
    credentials,
    isConnected,
    isConnecting,
    error,
    saveAndConnect,
    clearCredentials,
    retryConnection,
  } = useFawryStore();

  return {
    credentials,
    isConnected,
    isConnecting,
    error,
    saveAndConnect,
    clearCredentials,
    retryConnection,
    hasCredentials: !!credentials,
  };
}
