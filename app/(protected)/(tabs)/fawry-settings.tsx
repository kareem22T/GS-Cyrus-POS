"use client";

import { Colors } from "@/constants/theme";
import { useFawryCredentials } from "@/hooks/usefawrycredentials";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    Alert,
    I18nManager,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Card } from "../../../components/ui/card";
import { ThemedText } from "../../../components/ui/themed-text";
import { ThemedView } from "../../../components/ui/themed-view";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function FawrySettingsScreen() {
  const {
    credentials,
    isConnected,
    isConnecting,
    error,
    saveAndConnect,
    clearCredentials,
    retryConnection,
    hasCredentials,
  } = useFawryCredentials();

  const [username, setUsername] = useState(credentials?.username ?? "");
  const [password, setPassword] = useState(credentials?.password ?? "");
  const [terminalId, setTerminalId] = useState(credentials?.terminalId ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(!hasCredentials);

  const handleSave = async () => {
    if (!username.trim() || !password.trim() || !terminalId.trim()) {
      Alert.alert("خطأ", "يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    await saveAndConnect({
      username: username.trim(),
      password: password.trim(),
      terminalId: terminalId.trim(),
    });
    setIsEditing(false);
  };

  const handleClear = () => {
    Alert.alert(
      "حذف بيانات الاعتماد",
      "هل أنت متأكد أنك تريد حذف بيانات اتصال فوري؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            await clearCredentials();
            setUsername("");
            setPassword("");
            setTerminalId("");
            setIsEditing(true);
          },
        },
      ],
    );
  };

  const statusColor = isConnected ? "#10b981" : error ? "#ef4444" : "#94a3b8";
  const statusIcon = isConnected
    ? "checkmark-circle"
    : error
      ? "close-circle"
      : "ellipse-outline";
  const statusLabel = isConnected
    ? "متصل بجهاز فوري ✓"
    : isConnecting
      ? "جارٍ الاتصال..."
      : error
        ? "غير متصل"
        : "لم يتم الاتصال بعد";

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedView style={styles.headerInfo}>
          <ThemedText style={styles.headerTitle} type="subtitle">
            إعدادات جهاز فوري
          </ThemedText>
          <ThemedText style={styles.headerSubtitle}>POS Integration</ThemedText>
        </ThemedView>
        <View style={styles.headerIconContainer}>
          <Ionicons
            name="card-outline"
            size={28}
            color={Colors.light.primary}
          />
        </View>
      </View>

      <View style={styles.line} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Info Banner — non-intrusive hint for non-POS users */}
          <Card style={styles.infoBanner}>
            <View style={styles.infoBannerRow}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#3b82f6"
              />
              <ThemedText style={styles.infoBannerText}>
                هذا الإعداد مخصص لأجهزة نقاط البيع (POS) التي تعمل بنظام فوري.
                إذا كنت تستخدم التطبيق على هاتف عادي، يمكنك تجاهل هذا القسم
                تماماً.
              </ThemedText>
            </View>
          </Card>

          {/* Connection Status */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            حالة الاتصال
          </ThemedText>

          <Card style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Ionicons name={statusIcon} size={22} color={statusColor} />
              <ThemedText
                type="subtitle"
                style={[styles.statusText, { color: statusColor }]}
              >
                {statusLabel}
              </ThemedText>
            </View>

            {error && (
              <ThemedText style={styles.errorDetail}>{error}</ThemedText>
            )}

            {hasCredentials && !isConnected && !isConnecting && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={retryConnection}
              >
                <Ionicons name="refresh-outline" size={16} color="#fff" />
                <ThemedText type="subtitle" style={styles.retryButtonText}>
                  إعادة الاتصال
                </ThemedText>
              </TouchableOpacity>
            )}

            {hasCredentials && credentials && !isEditing && (
              <View style={styles.savedInfoContainer}>
                <View style={styles.savedInfoRow}>
                  <ThemedText style={styles.savedInfoLabel}>
                    اسم المستخدم
                  </ThemedText>
                  <ThemedText
                    type="defaultSemiBold"
                    style={styles.savedInfoValue}
                  >
                    {credentials.username}
                  </ThemedText>
                </View>
                <View style={styles.savedInfoRow}>
                  <ThemedText style={styles.savedInfoLabel}>
                    رقم الطرفية
                  </ThemedText>
                  <ThemedText
                    type="defaultSemiBold"
                    style={styles.savedInfoValue}
                  >
                    {credentials.terminalId}
                  </ThemedText>
                </View>
                <View style={styles.savedInfoRow}>
                  <ThemedText style={styles.savedInfoLabel}>
                    كلمة المرور
                  </ThemedText>
                  <ThemedText
                    type="defaultSemiBold"
                    style={styles.savedInfoValue}
                  >
                    ••••••••
                  </ThemedText>
                </View>
              </View>
            )}
          </Card>

          {/* Credentials Form */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            بيانات الاعتماد
          </ThemedText>

          {isEditing ? (
            <Card style={styles.formCard}>
              {/* Username */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>اسم المستخدم</ThemedText>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color="#94a3b8"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="أدخل اسم المستخدم"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    textAlign="right"
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>كلمة المرور</ThemedText>
                <View style={styles.inputWrapper}>
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.inputIcon}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="أدخل كلمة المرور"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    textAlign="right"
                  />
                </View>
              </View>

              {/* Terminal ID */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>
                  رقم الطرفية (Terminal ID)
                </ThemedText>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="hardware-chip-outline"
                    size={18}
                    color="#94a3b8"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={terminalId}
                    onChangeText={setTerminalId}
                    placeholder="أدخل رقم الطرفية"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    keyboardType="default"
                    textAlign="right"
                  />
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  isConnecting && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={isConnecting}
              >
                <Ionicons
                  name={isConnecting ? "hourglass-outline" : "link-outline"}
                  size={18}
                  color="#fff"
                />
                <ThemedText type="subtitle" style={styles.saveButtonText}>
                  {isConnecting ? "جارٍ الاتصال..." : "حفظ والاتصال"}
                </ThemedText>
              </TouchableOpacity>

              {hasCredentials && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setIsEditing(false)}
                >
                  <ThemedText style={styles.cancelButtonText}>إلغاء</ThemedText>
                </TouchableOpacity>
              )}
            </Card>
          ) : (
            <View style={styles.actionCard}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setIsEditing(true)}
              >
                <View
                  style={[
                    styles.actionIconContainer,
                    { backgroundColor: "#dbeafe" },
                  ]}
                >
                  <Ionicons name="create-outline" size={22} color="#3b82f6" />
                </View>
                <ThemedView style={styles.actionTextContainer}>
                  <ThemedText style={styles.actionButtonText} type="subtitle">
                    تعديل بيانات الاعتماد
                  </ThemedText>
                  <ThemedText style={styles.actionButtonSubtext}>
                    تغيير اسم المستخدم أو كلمة المرور
                  </ThemedText>
                </ThemedView>
                <Ionicons name="chevron-back" size={20} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleClear}
              >
                <View
                  style={[
                    styles.actionIconContainer,
                    { backgroundColor: "#fee2e2" },
                  ]}
                >
                  <Ionicons name="trash-outline" size={22} color="#ef4444" />
                </View>
                <ThemedView style={styles.actionTextContainer}>
                  <ThemedText
                    style={[styles.actionButtonText, { color: "#ef4444" }]}
                    type="subtitle"
                  >
                    حذف بيانات الاعتماد
                  </ThemedText>
                  <ThemedText style={styles.actionButtonSubtext}>
                    إزالة بيانات اتصال فوري المحفوظة
                  </ThemedText>
                </ThemedView>
                <Ionicons name="chevron-back" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: "transparent",
  },
  headerInfo: {
    flex: 1,
    backgroundColor: "transparent",
  },
  headerTitle: {
    color: "#252525",
    fontSize: 18,
    marginTop: 4,
  },
  headerSubtitle: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  line: {
    height: 1,
    backgroundColor: "#e5e5e5b4",
    marginTop: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12,
    marginTop: 4,
    color: "#1e293b",
  },
  // Info Banner
  infoBanner: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  infoBannerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#1d4ed8",
    lineHeight: 20,
    textAlign: "right",
  },
  // Status Card
  statusCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusText: {
    fontSize: 15,
  },
  errorDetail: {
    marginTop: 8,
    fontSize: 12,
    color: "#ef4444",
    textAlign: "right",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: Colors.light.primary,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  savedInfoContainer: {
    marginTop: 14,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 14,
  },
  savedInfoRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  savedInfoLabel: {
    fontSize: 13,
    color: "#64748b",
  },
  savedInfoValue: {
    fontSize: 13,
    color: "#1e293b",
  },
  // Form Card
  formCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 6,
    textAlign: "right",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginLeft: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1e293b",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  cancelButtonText: {
    color: "#94a3b8",
    fontSize: 14,
  },
  // Action Buttons (edit/delete when credentials exist)
  actionCard: {
    borderRadius: 16,
    marginBottom: 16,
    gap: 0,
  },
  actionButton: {
    marginBottom: 12,
    padding: 16,
    backgroundColor: "#fcfeffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 4,
  },
  actionTextContainer: {
    flex: 1,
    backgroundColor: "transparent",
  },
  actionButtonText: {
    fontSize: 15,
    color: "#1e293b",
  },
  actionButtonSubtext: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
});
