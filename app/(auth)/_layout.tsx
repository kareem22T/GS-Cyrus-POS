import { useAuthStore } from "@/store/slices/auth.slice";
import { Redirect, Stack } from "expo-router";
import LoadingScreen from "../../components/common/LoadingScreen";

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(protected)/(tabs)/pos" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
