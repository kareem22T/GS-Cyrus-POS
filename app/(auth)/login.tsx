import { Colors } from "@/constants/theme";
import { useAuthStore } from "@/store/slices/auth.slice";
import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  I18nManager,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText as Text } from "../../components/ui/themed-text";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("خطأ", "يرجى ملء جميع الحقول");
      return;
    }

    setLoading(true);
    try {
      await login(username, password, "2034082646");
      // Keep original navigation flow
      router.replace("/(protected)/(tabs)/pos");
    } catch (error: any) {
      Alert.alert(
        "فشل تسجيل الدخول",
        error.response?.data?.message ||
          error.message ||
          "بيانات الدخول غير صحيحة",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={require("@/assets/images/login.png")}
          style={{
            width: "100%",
            height: 220,
            resizeMode: "contain",
            marginBottom: 40,
          }}
        />

        <Text type="title" style={[styles.themedTitle]}>
          تسجيل الدخول
        </Text>
        <Text style={styles.subtitle}>
          من فضلك قم بإدخال بيانات الدخول الخاصة بك
        </Text>

        <View style={{ position: "relative", marginBottom: 16 }}>
          <Feather
            name="user"
            size={20}
            color={Colors.light.primary}
            style={{ position: "absolute", top: 18, start: 16, zIndex: 10 }}
          />
          <TextInput
            placeholder="اسم المستخدم"
            value={username}
            onChangeText={setUsername}
            keyboardType="default"
            autoCapitalize="none"
            onFocus={() => setFocusedField("username")}
            onBlur={() => setFocusedField(null)}
            style={[
              styles.input,
              focusedField === "username"
                ? { borderWidth: 2, borderColor: Colors.light.primary }
                : {},
            ]}
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={{ position: "relative", marginBottom: 24 }}>
          <Feather
            name="lock"
            size={20}
            color={Colors.light.primary}
            style={{ position: "absolute", top: 18, start: 16, zIndex: 10 }}
          />
          <TextInput
            placeholder="كلمة المرور"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            onFocus={() => setFocusedField("password")}
            onBlur={() => setFocusedField(null)}
            style={[
              styles.input,
              focusedField === "password"
                ? { borderWidth: 2, borderColor: Colors.light.primary }
                : {},
            ]}
            placeholderTextColor="#9ca3af"
          />
        </View>

        <TouchableOpacity
          style={[styles.loginButton, loading ? { opacity: 0.7 } : {}]}
          onPress={handleLogin}
          activeOpacity={0.8}
          disabled={loading}
        >
          <Text style={styles.loginButtonText}>
            {loading ? "جاري الدخول..." : "تسجيل الدخول"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    paddingVertical: 60,
    backgroundColor: "#ffffff",
  },
  themedTitle: {
    color: Colors.light.primary,
  },
  subtitle: {
    marginBottom: 32,
    opacity: 0.75,
    color: "#222",
  },
  input: {
    height: 62,
    paddingVertical: 16,
    paddingStart: 50,
    borderWidth: 0,
    borderRadius: 30,
    backgroundColor: "#f5f6f8",
    color: "#222",
    fontSize: 16,
    textAlign: "right",
  },
  loginButton: {
    marginBottom: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 30,
    height: 62,
    backgroundColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
