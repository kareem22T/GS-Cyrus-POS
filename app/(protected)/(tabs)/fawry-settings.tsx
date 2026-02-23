import apiClient from "@/api/client";
import { Colors } from "@/constants/theme";
import { useAuthStore } from "@/store/slices/auth.slice";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    Alert,
    I18nManager,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Card } from "../../../components/ui/card";
import { ThemedText } from "../../../components/ui/themed-text";
import { ThemedView } from "../../../components/ui/themed-view";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(user);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/pos/me");
      const data = res.data?.data ?? res.data;
      if (data) setProfile(data);
    } catch {
      // fall back to cached user from store
      setProfile(user);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert("تسجيل الخروج", "هل أنت متأكد أنك تريد تسجيل الخروج؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "تسجيل الخروج",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  const initials = (profile?.username ?? "U").substring(0, 2).toUpperCase();

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedView style={styles.headerInfo}>
          <ThemedText style={styles.headerTitle} type="subtitle">
            الملف الشخصي
          </ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            Profile & Settings
          </ThemedText>
        </ThemedView>
        <View style={styles.headerIconContainer}>
          <Ionicons
            name="person-circle-outline"
            size={28}
            color={Colors.light.primary}
          />
        </View>
      </View>

      <View style={styles.line} />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Avatar + Name */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <ThemedText style={styles.avatarText}>{initials}</ThemedText>
          </View>
          <ThemedText style={styles.userName}>
            {profile?.username ?? "—"}
          </ThemedText>
          {profile?.role ? (
            <View style={styles.roleBadge}>
              <ThemedText style={styles.roleText}>{profile.role}</ThemedText>
            </View>
          ) : null}
        </View>

        {/* User Info Card */}
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          بيانات الحساب
        </ThemedText>

        <Card style={styles.infoCard}>
          <InfoRow
            icon="person-outline"
            label="اسم المستخدم"
            value={profile?.username}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="business-outline"
            label="الشركة"
            value={profile?.companyName}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="location-outline"
            label="الفرع"
            value={profile?.branchName}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="hardware-chip-outline"
            label="الجهاز"
            value={profile?.deviceSerial}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="id-card-outline"
            label="رقم المستخدم"
            value={profile?.userId}
          />
        </Card>

        {/* Actions */}
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          الإجراءات
        </ThemedText>

        <View style={styles.actionsCard}>
          {/* Fawry Connect */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push("/(protected)/(tabs)/fawry-connect")}
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: "#eff6ff" },
              ]}
            >
              <Ionicons
                name="card-outline"
                size={22}
                color={Colors.light.primary}
              />
            </View>
            <ThemedView style={styles.actionTextContainer}>
              <ThemedText style={styles.actionButtonText} type="subtitle">
                ربط فوري
              </ThemedText>
              <ThemedText style={styles.actionButtonSubtext}>
                إعدادات اتصال جهاز فوري POS
              </ThemedText>
            </ThemedView>
            <Ionicons name="chevron-back" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <ThemedText style={styles.logoutText}>تسجيل الخروج</ThemedText>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ThemedView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value?: string | number | null;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={18} color="#64748b" />
      </View>
      <ThemedText style={styles.infoLabel}>{label}</ThemedText>
      <ThemedText style={styles.infoValue}>{value ?? "—"}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: "transparent",
  },
  headerInfo: { flex: 1, backgroundColor: "transparent" },
  headerTitle: { color: "#252525", fontSize: 18, marginTop: 4 },
  headerSubtitle: { color: "#64748b", fontSize: 12, marginTop: 2 },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  line: { height: 1, backgroundColor: "#e5e5e5b4", marginTop: 16 },
  content: { flex: 1, padding: 20 },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 12,
    marginTop: 8,
    color: "#64748b",
    fontWeight: "600",
  },
  // Avatar
  avatarSection: { alignItems: "center", paddingVertical: 24 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: "bold", color: "#fff" },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 6,
  },
  roleBadge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: { fontSize: 13, color: "#1d4ed8", fontWeight: "500" },
  // Info Card
  infoCard: {
    padding: 0,
    borderRadius: 16,
    marginBottom: 24,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: { flex: 1, fontSize: 14, color: "#64748b" },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    textAlign: "left",
  },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginHorizontal: 16 },
  // Actions
  actionsCard: { marginBottom: 16 },
  actionButton: {
    marginBottom: 12,
    padding: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTextContainer: { flex: 1, backgroundColor: "transparent" },
  actionButtonText: { fontSize: 15, color: "#1e293b" },
  actionButtonSubtext: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  // Logout
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 16,
    marginBottom: 12,
  },
  logoutText: { fontSize: 15, color: "#ef4444", fontWeight: "600" },
});
