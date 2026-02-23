"use client";

import { Colors } from "@/constants/theme";
import {
    fetchOrders,
    getOrderTypeLabel,
    getPaymentMethodLabel,
    getPosOrderStatusBg,
    getPosOrderStatusColor,
    getPosOrderStatusLabel,
    PosOrder,
} from "@/lib/orders-api";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
} from "react-native";
import { Card } from "../../../components/ui/card";
import { ThemedText } from "../../../components/ui/themed-text";
import { ThemedView } from "../../../components/ui/themed-view";

// normalize API dates for Hermes (strip extra fractional digits, ensure timezone)
function parseApiDate(dateString: string): Date {
  const normalized = dateString
    ?.replace(/(\.\d{3})\d+/, "$1")
    ?.replace(/(?<![Z]|[+-]\d{2}:?\d{2})$/, "Z");
  return new Date(normalized);
}

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { label: "الكل", value: "" },
  { label: "مدفوع", value: "Paid" },
  { label: "في انتظار الدفع", value: "PendingPayment" },
  { label: "فاشل", value: "Failed" },
  { label: "منتهي", value: "Expired" },
  { label: "معلق", value: "Pending" },
];

const TYPE_FILTERS = [
  { label: "الكل", value: "" },
  { label: "بيع", value: "Sale" },
  { label: "إرجاع", value: "Return" },
];

export default function TransactionsScreen() {
  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempDateFrom, setTempDateFrom] = useState<Date | null>(null);
  const [tempDateTo, setTempDateTo] = useState<Date | null>(null);
  const [tempFromPickerDate, setTempFromPickerDate] = useState<Date | null>(
    null,
  );
  const [tempToPickerDate, setTempToPickerDate] = useState<Date | null>(null);
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  const formatDateForAPI = (date: Date | null) =>
    date ? date.toISOString().split("T")[0] : undefined;

  const formatDateForDisplay = (date: Date | null) =>
    date
      ? date.toLocaleDateString("ar-EG", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "";

  const loadOrders = useCallback(
    async (page: number = 1) => {
      try {
        setError(null);
        if (page > 1) setLoadingMore(true);

        const result = await fetchOrders({
          pageNumber: page,
          pageSize: PAGE_SIZE,
          status: statusFilter || undefined,
          orderType: typeFilter || undefined,
          from: formatDateForAPI(dateFrom),
          to: formatDateForAPI(dateTo),
        });

        setOrders(result.orders);
        setPagination(result.pagination);
        setCurrentPage(page);
      } catch (err: any) {
        setError(err instanceof Error ? err.message : "فشل تحميل المعاملات");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [statusFilter, typeFilter, dateFrom, dateTo],
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadOrders(1);
    }, [loadOrders]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders(1);
  };

  const handleApplyFilters = () => {
    setDateFrom(tempDateFrom);
    setDateTo(tempDateTo);
    setShowFilterModal(false);
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) =>
    parseApiDate(dateString).toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const hasDateFilter = !!(dateFrom || dateTo);

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <ThemedText style={styles.loadingText}>جاري التحميل...</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.centerContent}>
          <ThemedText style={styles.errorText}>خطأ: {error}</ThemedText>
          <TouchableOpacity
            onPress={() => loadOrders(1)}
            style={styles.retryButton}
          >
            <ThemedText style={styles.retryButtonText}>
              إعادة المحاولة
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedView>
          <ThemedText type="title">المعاملات</ThemedText>
          <ThemedText style={styles.subtitle}>
            {pagination ? `${pagination.totalCount} معاملة` : ""}
          </ThemedText>
        </ThemedView>
        {pagination && pagination.totalPages > 1 && (
          <ThemedText style={styles.pageIndicator}>
            {currentPage}/{pagination.totalPages}
          </ThemedText>
        )}
      </ThemedView>

      {/* Status Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsContainer}
      >
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.chip, statusFilter === f.value && styles.chipActive]}
            onPress={() => {
              setStatusFilter(f.value);
              setCurrentPage(1);
            }}
          >
            <ThemedText
              style={[
                styles.chipText,
                statusFilter === f.value && styles.chipTextActive,
              ]}
            >
              {f.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Type + Date Filter Bar */}
      <ThemedView style={styles.filterBar}>
        {TYPE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[
              styles.typeChip,
              typeFilter === f.value && styles.typeChipActive,
            ]}
            onPress={() => {
              setTypeFilter(f.value);
              setCurrentPage(1);
            }}
          >
            <ThemedText
              style={[
                styles.typeChipText,
                typeFilter === f.value && styles.typeChipTextActive,
              ]}
            >
              {f.label}
            </ThemedText>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.dateButton, hasDateFilter && styles.dateButtonActive]}
          onPress={() => {
            setTempDateFrom(dateFrom);
            setTempDateTo(dateTo);
            setShowFilterModal(true);
          }}
        >
          <ThemedText
            style={[
              styles.dateButtonText,
              hasDateFilter && styles.dateButtonTextActive,
            ]}
          >
            📅{" "}
            {hasDateFilter
              ? `${formatDateForDisplay(dateFrom)}${dateTo ? " ← " + formatDateForDisplay(dateTo) : ""}`
              : "تاريخ"}
          </ThemedText>
        </TouchableOpacity>

        {hasDateFilter && (
          <TouchableOpacity
            onPress={() => {
              setDateFrom(null);
              setDateTo(null);
            }}
          >
            <ThemedText style={styles.clearDate}>✕</ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {orders.length === 0 ? (
          <ThemedView style={styles.centerContent}>
            <ThemedText style={styles.emptyText}>لا توجد معاملات</ThemedText>
          </ThemedView>
        ) : (
          <>
            {orders.map((order) => (
              <Card key={order.id} style={styles.orderCard}>
                {/* Header Row */}
                <ThemedView style={styles.orderHeader}>
                  <ThemedView style={styles.orderIdBadge}>
                    <ThemedText style={styles.orderIdText}>
                      #{order.id}
                    </ThemedText>
                  </ThemedView>

                  {/* Status Badge */}
                  <ThemedView
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getPosOrderStatusBg(order.status) },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.statusText,
                        { color: getPosOrderStatusColor(order.status) },
                      ]}
                    >
                      {getPosOrderStatusLabel(order.status)}
                    </ThemedText>
                  </ThemedView>

                  {/* Type Badge */}
                  <ThemedView
                    style={[
                      styles.typeBadge,
                      order.orderType === "Return" && styles.returnTypeBadge,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.typeBadgeText,
                        order.orderType === "Return" &&
                          styles.returnTypeBadgeText,
                      ]}
                    >
                      {getOrderTypeLabel(order.orderType)}
                    </ThemedText>
                  </ThemedView>

                  <ThemedText style={styles.dateText}>
                    {formatDate(order.createdAt)}
                  </ThemedText>
                </ThemedView>

                {/* Details */}
                <ThemedView style={styles.detailsGrid}>
                  <ThemedView style={styles.detailItem}>
                    <ThemedText style={styles.detailLabel}>العميل</ThemedText>
                    <ThemedText style={styles.detailValue} numberOfLines={1}>
                      {order.customerName}
                    </ThemedText>
                  </ThemedView>
                  <ThemedView style={styles.detailItem}>
                    <ThemedText style={styles.detailLabel}>الدفع</ThemedText>
                    <ThemedText style={styles.detailValue}>
                      {getPaymentMethodLabel(order.paymentMethod)}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>

                {/* Totals */}
                <ThemedView style={styles.priceRow}>
                  <ThemedView style={styles.priceItem}>
                    <ThemedText style={styles.priceLabel}>المجموع:</ThemedText>
                    <ThemedText style={styles.priceValue}>
                      {order.subtotal?.toFixed(2)}
                    </ThemedText>
                  </ThemedView>
                  <ThemedView style={styles.priceItem}>
                    <ThemedText style={styles.priceLabel}>الضريبة:</ThemedText>
                    <ThemedText style={styles.priceValue}>
                      {order.taxAmount?.toFixed(2)}
                    </ThemedText>
                  </ThemedView>
                  <ThemedView style={styles.totalItem}>
                    <ThemedText style={styles.totalLabel}>الإجمالي:</ThemedText>
                    <ThemedText style={styles.totalValue}>
                      {order.totalAmount?.toFixed(2)} ج.م
                    </ThemedText>
                  </ThemedView>
                </ThemedView>

                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() =>
                    router.push({
                      pathname: "/(protected)/(tabs)/transaction-details",
                      params: { orderId: order.id.toString() },
                    })
                  }
                >
                  <ThemedText style={styles.viewButtonText}>
                    عرض التفاصيل
                  </ThemedText>
                </TouchableOpacity>
              </Card>
            ))}

            {pagination && pagination.totalPages > 1 && (
              <ThemedView style={styles.paginationControls}>
                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    !pagination.hasPrevious && styles.paginationButtonDisabled,
                  ]}
                  onPress={() => loadOrders(currentPage - 1)}
                  disabled={!pagination.hasPrevious || loadingMore}
                >
                  <ThemedText
                    style={[
                      styles.paginationButtonText,
                      !pagination.hasPrevious &&
                        styles.paginationButtonTextDisabled,
                    ]}
                  >
                    →
                  </ThemedText>
                </TouchableOpacity>
                <ThemedText style={styles.pageInfo}>
                  {currentPage} / {pagination.totalPages}
                </ThemedText>
                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    !pagination.hasNext && styles.paginationButtonDisabled,
                  ]}
                  onPress={() => loadOrders(currentPage + 1)}
                  disabled={!pagination.hasNext || loadingMore}
                >
                  <ThemedText
                    style={[
                      styles.paginationButtonText,
                      !pagination.hasNext &&
                        styles.paginationButtonTextDisabled,
                    ]}
                  >
                    ←
                  </ThemedText>
                </TouchableOpacity>
              </ThemedView>
            )}

            {loadingMore && (
              <ThemedView style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#007AFF" />
              </ThemedView>
            )}
          </>
        )}
      </ScrollView>

      {/* Date Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <ThemedView style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>تصفية حسب التاريخ</ThemedText>

            <ThemedView style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>من تاريخ:</ThemedText>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => {
                  setTempFromPickerDate(tempDateFrom || new Date());
                  setShowFromDatePicker(true);
                }}
              >
                <ThemedText style={styles.datePickerButtonText}>
                  {tempDateFrom
                    ? formatDateForDisplay(tempDateFrom)
                    : "اختر التاريخ"}
                </ThemedText>
              </TouchableOpacity>
              {tempDateFrom && (
                <TouchableOpacity
                  style={styles.clearDateButton}
                  onPress={() => setTempDateFrom(null)}
                >
                  <ThemedText style={styles.clearDateText}>✕ مسح</ThemedText>
                </TouchableOpacity>
              )}
            </ThemedView>

            <ThemedView style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>إلى تاريخ:</ThemedText>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => {
                  setTempToPickerDate(tempDateTo || new Date());
                  setShowToDatePicker(true);
                }}
              >
                <ThemedText style={styles.datePickerButtonText}>
                  {tempDateTo
                    ? formatDateForDisplay(tempDateTo)
                    : "اختر التاريخ"}
                </ThemedText>
              </TouchableOpacity>
              {tempDateTo && (
                <TouchableOpacity
                  style={styles.clearDateButton}
                  onPress={() => setTempDateTo(null)}
                >
                  <ThemedText style={styles.clearDateText}>✕ مسح</ThemedText>
                </TouchableOpacity>
              )}
            </ThemedView>

            <ThemedView style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowFilterModal(false)}
              >
                <ThemedText style={styles.cancelButtonText}>إلغاء</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.applyButton]}
                onPress={handleApplyFilters}
              >
                <ThemedText style={styles.applyButtonText}>تطبيق</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </Modal>

      {/* Date Pickers */}
      {showFromDatePicker &&
        (Platform.OS === "android" ? (
          <DateTimePicker
            value={tempDateFrom || new Date()}
            mode="date"
            display="calendar"
            onChange={(e: any, d?: Date) => {
              setShowFromDatePicker(false);
              if (e?.type === "set" && d) setTempDateFrom(d);
            }}
          />
        ) : (
          <Modal
            transparent
            animationType="slide"
            visible={showFromDatePicker}
            onRequestClose={() => setShowFromDatePicker(false)}
          >
            <ThemedView style={styles.modalOverlay}>
              <ThemedView
                style={[styles.modalContent, { maxWidth: 400, padding: 16 }]}
              >
                <DateTimePicker
                  value={tempFromPickerDate || tempDateFrom || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(_: any, d?: Date) => {
                    if (d) setTempFromPickerDate(d);
                  }}
                  locale="ar"
                />
                <ThemedView
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 12,
                  }}
                >
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowFromDatePicker(false)}
                  >
                    <ThemedText style={styles.cancelButtonText}>
                      إلغاء
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.applyButton]}
                    onPress={() => {
                      setTempDateFrom(
                        tempFromPickerDate || tempDateFrom || new Date(),
                      );
                      setShowFromDatePicker(false);
                    }}
                  >
                    <ThemedText style={styles.applyButtonText}>
                      تأكيد
                    </ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              </ThemedView>
            </ThemedView>
          </Modal>
        ))}

      {showToDatePicker &&
        (Platform.OS === "android" ? (
          <DateTimePicker
            value={tempDateTo || new Date()}
            mode="date"
            display="calendar"
            onChange={(e: any, d?: Date) => {
              setShowToDatePicker(false);
              if (e?.type === "set" && d) setTempDateTo(d);
            }}
          />
        ) : (
          <Modal
            transparent
            animationType="slide"
            visible={showToDatePicker}
            onRequestClose={() => setShowToDatePicker(false)}
          >
            <ThemedView style={styles.modalOverlay}>
              <ThemedView
                style={[styles.modalContent, { maxWidth: 400, padding: 16 }]}
              >
                <DateTimePicker
                  value={tempToPickerDate || tempDateTo || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(_: any, d?: Date) => {
                    if (d) setTempToPickerDate(d);
                  }}
                  locale="ar"
                />
                <ThemedView
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 12,
                  }}
                >
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowToDatePicker(false)}
                  >
                    <ThemedText style={styles.cancelButtonText}>
                      إلغاء
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.applyButton]}
                    onPress={() => {
                      setTempDateTo(
                        tempToPickerDate || tempDateTo || new Date(),
                      );
                      setShowToDatePicker(false);
                    }}
                  >
                    <ThemedText style={styles.applyButtonText}>
                      تأكيد
                    </ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              </ThemedView>
            </ThemedView>
          </Modal>
        ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, direction: "rtl", backgroundColor: "#f8f9fa" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 10,
    backgroundColor: "#ffffff",
  },
  subtitle: { opacity: 0.6, marginTop: 2, fontSize: 12 },
  pageIndicator: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chipsScroll: { maxHeight: 44, backgroundColor: "#ffffff" },
  chipsContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipActive: { backgroundColor: "#dbeafe", borderColor: "#3b82f6" },
  chipText: { fontSize: 12, fontWeight: "500", color: "#374151" },
  chipTextActive: { color: "#1e40af", fontWeight: "600" },

  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e8eaed",
  },
  typeChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  typeChipActive: { backgroundColor: "#d1fae5", borderColor: "#059669" },
  typeChipText: { fontSize: 12, fontWeight: "500", color: "#374151" },
  typeChipTextActive: { color: "#047857", fontWeight: "600" },
  dateButton: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  dateButtonActive: { backgroundColor: "#fef3c7", borderColor: "#d97706" },
  dateButtonText: { fontSize: 11, color: "#374151" },
  dateButtonTextActive: { color: "#92400e" },
  clearDate: { fontSize: 16, color: "#6b7280", paddingHorizontal: 4 },

  content: { flex: 1, padding: 12 },

  orderCard: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8eaed",
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  orderIdBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orderIdText: { fontSize: 12, fontWeight: "700", color: "#1f2937" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: "600" },
  typeBadge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: { color: "#1e40af", fontSize: 11, fontWeight: "600" },
  returnTypeBadge: { backgroundColor: "#fee2e2" },
  returnTypeBadgeText: { color: "#dc2626" },
  dateText: { fontSize: 11, color: "#6b7280", marginRight: "auto" },

  detailsGrid: { flexDirection: "row", gap: 8, marginBottom: 8 },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 11, opacity: 0.6, marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: "500", color: "#1f2937" },

  priceRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    marginBottom: 8,
  },
  priceItem: { flex: 1 },
  priceLabel: { fontSize: 10, opacity: 0.6, marginBottom: 2 },
  priceValue: { fontSize: 12, fontWeight: "500", color: "#1f2937" },
  totalItem: { flex: 1 },
  totalLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
    color: "#1f2937",
  },
  totalValue: { fontSize: 14, fontWeight: "700", color: "#007AFF" },

  viewButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 8,
    marginTop: 4,
    borderRadius: 6,
    alignItems: "center",
  },
  viewButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },

  paginationControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#007AFF",
    borderRadius: 6,
    minWidth: 50,
    alignItems: "center",
  },
  paginationButtonDisabled: { backgroundColor: "#e5e7eb" },
  paginationButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
  paginationButtonTextDisabled: { color: "#9ca3af" },
  pageInfo: { fontSize: 14, fontWeight: "600" },
  loadingMore: { paddingVertical: 16, alignItems: "center" },

  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  loadingText: { marginTop: 12, opacity: 0.6, fontSize: 14 },
  errorText: {
    color: "#ef4444",
    textAlign: "center",
    marginBottom: 12,
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: { color: "#ffffff", fontWeight: "600", fontSize: 14 },
  emptyText: { opacity: 0.6, textAlign: "center", fontSize: 14 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
  },
  inputGroup: { marginBottom: 12 },
  inputLabel: { marginBottom: 6, fontSize: 13, fontWeight: "500" },
  datePickerButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  datePickerButtonText: { fontSize: 14, color: "#374151" },
  clearDateButton: { marginTop: 6, alignSelf: "flex-start" },
  clearDateText: { color: "#dc2626", fontSize: 12, fontWeight: "600" },
  modalButtons: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: { backgroundColor: "#f3f4f6" },
  cancelButtonText: { color: "#374151", fontWeight: "600", fontSize: 14 },
  applyButton: { backgroundColor: "#007AFF" },
  applyButtonText: { color: "#ffffff", fontWeight: "600", fontSize: 14 },
});
