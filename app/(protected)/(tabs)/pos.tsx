"use client";

import { Colors } from "@/constants/theme";
import { useAuthStore } from "@/store/slices/auth.slice";
import { Ionicons } from "@expo/vector-icons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { router } from "expo-router";
import {
  Alert,
  I18nManager,
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

// Static data
const STATIC_STATS = {
  sumOfQuantitySR: 1250,
  sumOfTotalsSR: 45780,
  sumOfQuantityRR: 87,
  sumOfTotalsRR: 3420,
};

const STATIC_BRANCH_NAME = "فرع المعادي";
const STATIC_DEVICE_ID = "ABC123XYZ789";

export default function PosScreen() {
  const { logout } = useAuthStore();

  const handleCreateOrder = () => {
    router.push("/(protected)/(tabs)/create-order");
  };

  const handleViewOrders = () => {
    router.push("/(protected)/(tabs)/orders");
  };

  const handleChangeBranch = () => {
    // Handle branch change
    console.log("Change branch clicked");
  };

  const handleLogout = () => {
    Alert.alert("تسجيل الخروج", "هل انت متاكد انك تريد تسجيل الخروج؟", [
      {
        text: "الغاء",
        style: "cancel",
      },
      {
        text: "تسجيل الخروج",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerGradient}>
        <ThemedView style={styles.header}>
          <ThemedView style={styles.headerInfo}>
            <ThemedText style={styles.branchName} type="subtitle">
              {STATIC_BRANCH_NAME}
            </ThemedText>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ThemedText style={styles.deviceId}>
                {STATIC_DEVICE_ID}
              </ThemedText>
            </View>
          </ThemedView>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#f87171" />
          </TouchableOpacity>
        </ThemedView>
      </View>
      <View style={styles.line}></View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          إحصائيات اليوم
        </ThemedText>

        <View>
          <ThemedView style={styles.statsContainer}>
            {/* Total Sales Card */}
            <Card style={[styles.statCard, styles.totalCard]}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <Ionicons name="cash" size={22} color="#fff" />
                <ThemedText type="title" style={styles.statValue}>
                  {STATIC_STATS.sumOfTotalsSR.toLocaleString()} EGP
                </ThemedText>
              </View>
              <ThemedText style={styles.statLabel}>إجمالي المبيعات</ThemedText>
            </Card>
            <Card style={[styles.statCard, styles.totalCard]}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <FontAwesome6 name="jar" size={24} color="#fff" />
                <ThemedText type="title" style={styles.statValue}>
                  {STATIC_STATS.sumOfQuantitySR.toLocaleString()}
                </ThemedText>
              </View>
              <ThemedText style={styles.statLabel}>
                إجمالي كمية المبيعات
              </ThemedText>
            </Card>
          </ThemedView>
          <ThemedView style={styles.statsContainer}>
            {/* Returns Card */}
            <Card style={[styles.statCard, styles.totalCard]}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <Ionicons name="cash" size={22} color="#fff" />
                <ThemedText type="title" style={styles.statValue}>
                  {STATIC_STATS.sumOfTotalsRR.toLocaleString()} EGP
                </ThemedText>
              </View>
              <ThemedText style={styles.statLabel}>إجمالي المرتجعات</ThemedText>
            </Card>

            {/* Returns Quantity Card */}
            <Card style={[styles.statCard, styles.totalCard]}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <FontAwesome6 name="jar" size={24} color="#fff" />
                <ThemedText type="title" style={styles.statValue}>
                  {STATIC_STATS.sumOfQuantityRR.toLocaleString()}
                </ThemedText>
              </View>
              <ThemedText style={styles.statLabel}>
                إجمالي كمية المرتجعات
              </ThemedText>
            </Card>
          </ThemedView>
        </View>

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          إجراءات سريعة
        </ThemedText>

        <View style={styles.actionCard}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCreateOrder}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="add-circle" size={24} color="#3b82f6" />
            </View>
            <ThemedView style={styles.actionTextContainer}>
              <ThemedText style={styles.actionButtonText} type="subtitle">
                إنشاء طلب جديد
              </ThemedText>
              <ThemedText style={styles.actionButtonSubtext}>
                ابدأ طلب جديد الآن
              </ThemedText>
            </ThemedView>
            <Ionicons name="chevron-back" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleViewOrders}
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: "#dcfce7" },
              ]}
            >
              <Ionicons name="list" size={24} color="#10b981" />
            </View>
            <ThemedView style={styles.actionTextContainer}>
              <ThemedText style={styles.actionButtonText} type="subtitle">
                عرض الطلبات
              </ThemedText>
              <ThemedText style={styles.actionButtonSubtext}>
                تصفح جميع الطلبات
              </ThemedText>
            </ThemedView>
            <Ionicons name="chevron-back" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  headerGradient: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    backgroundColor: "transparent",
  },
  headerInfo: {
    flex: 1,
    backgroundColor: "transparent",
  },
  welcomeText: {
    color: "#222",
    fontSize: 28,
    marginBottom: 4,
  },
  branchName: {
    color: "#252525ff",
    fontSize: 16,
    marginTop: 4,
  },
  deviceId: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(248, 113, 113, 0.1)",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 16,
    color: "#1e293b",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  statsContainer: {
    gap: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 32,
  },
  statCard: {
    padding: 16,
    borderRadius: 16,
    flex: 1,
  },
  totalCard: {
    backgroundColor: Colors.light.primary,
  },
  taxCard: {
    backgroundColor: Colors.light.primary,
  },
  discountCard: {
    backgroundColor: "#ef4444",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffffff",
  },
  statLabel: {
    fontSize: 12,
    color: "#eeeeeeff",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: -5,
  },
  actionCard: {
    borderRadius: 16,
    marginBottom: 24,
  },
  actionButton: {
    marginBottom: 16,
    padding: 20,
    paddingVertical: 10,
    backgroundColor: "#fcfeffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 25,
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 10,
  },
  actionTextContainer: {
    flex: 1,
    backgroundColor: "transparent",
  },
  actionButtonText: {
    fontSize: 16,
    color: "#1e293b",
  },
  actionButtonSubtext: {
    fontSize: 12,
    color: "#64748b",
  },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 16,
  },
  line: {
    height: 1,
    backgroundColor: "#e5e5e5b4",
    marginTop: 20,
  },
});
