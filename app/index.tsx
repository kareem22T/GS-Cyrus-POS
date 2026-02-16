import { useAuthStore } from "@/store/slices/auth.slice";
import { Redirect } from "expo-router";
import LoadingScreen from "../components/common/LoadingScreen";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return <LoadingScreen />;

  return (
    <Redirect
      href={isAuthenticated ? "/(protected)/(tabs)/pos" : "/(auth)/login"}
    />
  );
}
