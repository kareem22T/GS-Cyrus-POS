/**
 * FawryAutoConnect
 *
 * Drop this inside your root layout (e.g. app/(protected)/_layout.tsx).
 * On mount it reads saved credentials from AsyncStorage and connects to the
 * Fawry POS device. State is stored in useFawryStore (Zustand) so ALL
 * components — checkout, settings, etc. — share the exact same isConnected value.
 */
import { useFawryStore } from "@/store/slices/fawry.slice";
import { useEffect } from "react";

export function FawryAutoConnect() {
  const loadAndConnect = useFawryStore((s) => s.loadAndConnect);

  useEffect(() => {
    loadAndConnect();
  }, []);

  return null;
}
