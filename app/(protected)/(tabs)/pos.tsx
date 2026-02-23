"use client";

import apiClient from "@/api/client";
import { Colors } from "@/constants/theme";
import { useAuthStore } from "@/store/slices/auth.slice";
import { Ionicons } from "@expo/vector-icons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
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

interface MonitoringStats {
  totalSales: number;
  totalReturns: number;
  netSales: number;
  totalQuantitySold: number;
  totalQuantityReturned: number;
}

export default function PosScreen() {
  const { logout, user } = useAuthStore();

  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/pos/monitoring");
      setStats(res.data?.data ?? res.data);
    } catch {
      // keep previous value on error
    } finally {
      setStatsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setStatsLoading(true);
      loadStats();
    }, [loadStats]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const fmt = (n?: number) =>
    n == null ? "—" : n.toLocaleString("ar-EG", { maximumFractionDigits: 2 });

  const handleCreateOrder = () => {
    router.push("/(protected)/(tabs)/create-order");
  };

  const handleViewOrders = () => {
    router.push("/(protected)/(tabs)/transactions");
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
              {user?.branchName ?? "الرئيسية"}
            </ThemedText>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ThemedText style={styles.deviceId}>
                {user?.deviceSerial ?? ""}
              </ThemedText>
            </View>
          </ThemedView>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#f87171" />
          </TouchableOpacity>
        </ThemedView>
      </View>
      <View style={styles.line}></View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          إحصائيات اليوم
        </ThemedText>

        {statsLoading && !stats ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
          </View>
        ) : (
          <View>
            <ThemedView style={styles.statsContainer}>
              {/* Total Sales */}
              <Card style={[styles.statCard, styles.salesCard]}>
                <View style={styles.statIconRow}>
                  <Ionicons name="trending-up" size={20} color="#fff" />
                  <ThemedText type="title" style={styles.statValue}>
                    {fmt(stats?.totalSales)}
                  </ThemedText>
                </View>
                <ThemedText style={styles.statLabel}>مبيعات اليوم</ThemedText>
                <ThemedText style={styles.statSub}>
                  كمية: {fmt(stats?.totalQuantitySold)}
                </ThemedText>
              </Card>

              {/* Total Returns */}
              <Card style={[styles.statCard, styles.returnsCard]}>
                <View style={styles.statIconRow}>
                  <Ionicons name="trending-down" size={20} color="#fff" />
                  <ThemedText type="title" style={styles.statValue}>
                    {fmt(stats?.totalReturns)}
                  </ThemedText>
                </View>
                <ThemedText style={styles.statLabel}>مرتجعات اليوم</ThemedText>
                <ThemedText style={styles.statSub}>
                  كمية: {fmt(stats?.totalQuantityReturned)}
                </ThemedText>
              </Card>
            </ThemedView>

            {/* Net Sales — full width */}
            <Card style={[styles.statCardWide, styles.netCard]}>
              <View style={styles.statIconRow}>
                <FontAwesome6 name="sack-dollar" size={18} color="#fff" />
                <ThemedText
                  type="title"
                  style={[styles.statValue, { fontSize: 22 }]}
                >
                  {fmt(stats?.netSales)} ج.م
                </ThemedText>
              </View>
              <ThemedText style={styles.statLabel}>صافي المبيعات</ThemedText>
            </Card>
          </View>
        )}

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
                عرض المعاملات
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
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  statsContainer: {
    gap: 16,
    flexDirection: "row",
    marginBottom: 16,
  },
  statCard: {
    padding: 16,
    borderRadius: 16,
    flex: 1,
  },
  statCardWide: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 28,
  },
  salesCard: {
    backgroundColor: Colors.light.primary,
  },
  returnsCard: {
    backgroundColor: "#ef4444",
  },
  netCard: {
    backgroundColor: "#059669",
  },
  statIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    color: "#ffffff",
    flexShrink: 1,
  },
  statLabel: {
    fontSize: 12,
    color: "#eeeeee",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
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
