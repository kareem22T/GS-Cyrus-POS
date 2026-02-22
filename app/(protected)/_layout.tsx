import { useAuthStore } from "@/store/slices/auth.slice";
import { Redirect, Stack } from "expo-router";
import LoadingScreen from "../../components/common/LoadingScreen";
import { FawryAutoConnect } from "../../components/FawryAutoConnect";

export default function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <>
      <FawryAutoConnect />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
