"use client";

import { Colors } from "@/constants/theme";
import {
  fetchDocuments,
  getDocumentTypeLabel,
  getPaymentMethodLabel,
} from "@/lib/document-api";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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

const PAGE_SIZE = 10;

export default function OrdersScreen() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deviceId, setDeviceId] = useState<string>("2034082646");

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [tempDateFrom, setTempDateFrom] = useState<Date | null>(null);
  const [tempDateTo, setTempDateTo] = useState<Date | null>(null);
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [tempFromPickerDate, setTempFromPickerDate] = useState<Date | null>(
    null,
  );
  const [tempToPickerDate, setTempToPickerDate] = useState<Date | null>(null);

  useEffect(() => {
    async function loadId() {
      const androidId = "2034082646";
      setDeviceId(androidId ?? "");
    }
    loadId();
  }, []);

  const formatDateForAPI = (date: Date | null): string | undefined => {
    if (!date) return undefined;
    return date.toISOString().split("T")[0];
  };

  const formatDateForDisplay = (date: Date | null): string => {
    if (!date) return "";
    return date.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const loadDocuments = async (page: number = 1, append: boolean = false) => {
    try {
      setError(null);
      if (append) setLoadingMore(true);

      const result = await fetchDocuments({
        pageNumber: page,
        pageSize: PAGE_SIZE,
        deviceId: deviceId,
        dateFrom: formatDateForAPI(dateFrom),
        dateTo: formatDateForAPI(dateTo),
      });

      if (append) setDocuments((p) => [...p, ...result.documents]);
      else setDocuments(result.documents);

      setPagination(result.pagination);
      setCurrentPage(page);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "فشل تحميل الطلبات");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (deviceId) loadDocuments(1);
    }, [deviceId, dateFrom, dateTo]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    loadDocuments(1, false);
  };

  const loadNextPage = () => {
    if (pagination && pagination.hasNext && !loadingMore) {
      loadDocuments(currentPage + 1, false);
    }
  };

  const loadPreviousPage = () => {
    if (pagination && pagination.hasPrevious && !loadingMore) {
      loadDocuments(currentPage - 1, false);
    }
  };

  const handleViewOrder = (document: any) => {
    router.push({
      pathname: "(protected)/(tabs)/order-details",
      params: { orderId: document.id },
    });
  };

  const handleApplyFilters = () => {
    setDateFrom(tempDateFrom);
    setDateTo(tempDateTo);
    setShowFilterModal(false);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setTempDateFrom(null);
    setTempDateTo(null);
    setDateFrom(null);
    setDateTo(null);
    setShowFilterModal(false);
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hasActiveFilters = !!(dateFrom || dateTo);

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
            onPress={() => loadDocuments(1)}
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
      {/* Compact Header */}
      <ThemedView style={styles.header}>
        <ThemedView>
          <ThemedText type="title">الطلبات</ThemedText>
          <ThemedText style={styles.subtitle}>
            {pagination ? `${pagination.totalCount} طلب` : ""}
          </ThemedText>
        </ThemedView>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={styles.backText}>رجوع ←</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {/* Compact Filter Bar */}
      <ThemedView style={styles.filterBar}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            hasActiveFilters && styles.filterButtonActive,
          ]}
          onPress={() => {
            setTempDateFrom(dateFrom);
            setTempDateTo(dateTo);
            setShowFilterModal(true);
          }}
        >
          <ThemedText
            style={[
              styles.filterButtonText,
              hasActiveFilters && styles.filterButtonTextActive,
            ]}
          >
            🔍 فلتر
          </ThemedText>
        </TouchableOpacity>

        {hasActiveFilters && (
          <ThemedView style={styles.activeFilterChip}>
            <ThemedText style={styles.activeFilterText}>
              {dateFrom && formatDateForDisplay(dateFrom)}
              {dateFrom && dateTo && " - "}
              {dateTo && formatDateForDisplay(dateTo)}
            </ThemedText>
            <TouchableOpacity
              onPress={handleClearFilters}
              style={styles.clearChip}
            >
              <ThemedText style={styles.clearChipText}>✕</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}

        {pagination && pagination.totalPages > 1 && (
          <ThemedText style={styles.pageIndicator}>
            {currentPage}/{pagination.totalPages}
          </ThemedText>
        )}
      </ThemedView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {documents.length === 0 ? (
          <ThemedView style={styles.centerContent}>
            <ThemedText style={styles.emptyText}>لا توجد طلبات</ThemedText>
          </ThemedView>
        ) : (
          <>
            {documents.map((doc) => (
              <Card key={doc.id} style={styles.orderCard}>
                {/* Compact Header Row */}
                <ThemedView style={styles.orderHeader}>
                  <ThemedView style={styles.orderIdBadge}>
                    <ThemedText style={styles.orderIdText}>
                      #{doc.id}
                    </ThemedText>
                  </ThemedView>

                  <ThemedView
                    style={[
                      styles.typeBadge,
                      doc.documentType === 4 && styles.returnBadge,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.typeBadgeText,
                        doc.documentType === 4 && styles.returnBadgeText,
                      ]}
                    >
                      {getDocumentTypeLabel(doc.documentType)}
                    </ThemedText>
                  </ThemedView>

                  <ThemedText style={styles.dateText}>
                    {formatDate(doc.receiptDate)}
                  </ThemedText>
                </ThemedView>

                {/* Compact Details Grid */}
                <ThemedView style={styles.detailsGrid}>
                  <ThemedView style={styles.detailItem}>
                    <ThemedText style={styles.detailLabel}>العميل</ThemedText>
                    <ThemedText style={styles.detailValue} numberOfLines={1}>
                      {doc.customerName || doc.customerCode}
                    </ThemedText>
                  </ThemedView>

                  <ThemedView style={styles.detailItem}>
                    <ThemedText style={styles.detailLabel}>الدفع</ThemedText>
                    <ThemedText style={styles.detailValue}>
                      {getPaymentMethodLabel(doc.paymentMethod)}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>

                {/* Compact Price Row */}
                <ThemedView style={styles.priceRow}>
                  <ThemedView style={styles.priceItem}>
                    <ThemedText style={styles.priceLabel}>المجموع:</ThemedText>
                    <ThemedText style={styles.priceValue}>
                      {doc.subtotal.toFixed(2)}
                    </ThemedText>
                  </ThemedView>

                  <ThemedView style={styles.priceItem}>
                    <ThemedText style={styles.priceLabel}>الضريبة:</ThemedText>
                    <ThemedText style={styles.priceValue}>
                      {doc.totalVAT.toFixed(2)}
                    </ThemedText>
                  </ThemedView>

                  <ThemedView style={styles.totalItem}>
                    <ThemedText style={styles.totalLabel}>الإجمالي:</ThemedText>
                    <ThemedText style={styles.totalValue}>
                      {doc.totalAmount.toFixed(2)} ج.م
                    </ThemedText>
                  </ThemedView>
                </ThemedView>

                {/* Compact View Button */}
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => handleViewOrder(doc)}
                >
                  <ThemedText style={styles.viewButtonText}>
                    عرض التفاصيل
                  </ThemedText>
                </TouchableOpacity>
              </Card>
            ))}

            {/* Compact Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <ThemedView style={styles.paginationControls}>
                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    !pagination.hasPrevious && styles.paginationButtonDisabled,
                  ]}
                  onPress={loadPreviousPage}
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
                  onPress={loadNextPage}
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

      {/* Filter Modal */}
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

      {/* Date Pickers (same as before) */}
      {showFromDatePicker &&
        (Platform.OS === "android" ? (
          <DateTimePicker
            value={tempDateFrom || new Date()}
            mode="date"
            display="calendar"
            onChange={(event: any, selectedDate?: Date) => {
              setShowFromDatePicker(false);
              if (event?.type === "set" && selectedDate)
                setTempDateFrom(selectedDate);
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
                  onChange={(event: any, selectedDate?: Date) => {
                    if (selectedDate) setTempFromPickerDate(selectedDate);
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
            onChange={(event: any, selectedDate?: Date) => {
              setShowToDatePicker(false);
              if (event?.type === "set" && selectedDate)
                setTempDateTo(selectedDate);
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
                  onChange={(event: any, selectedDate?: Date) => {
                    if (selectedDate) setTempToPickerDate(selectedDate);
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

  // Compact Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 10,
    backgroundColor: "#ffffff",
  },
  subtitle: { opacity: 0.6, marginTop: 2, fontSize: 12 },
  backText: { color: "#007AFF", fontWeight: "600", fontSize: 14 },

  // Compact Filter Bar
  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e8eaed",
  },
  filterButton: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterButtonActive: { backgroundColor: "#dbeafe", borderColor: "#3b82f6" },
  filterButtonText: { fontSize: 13, fontWeight: "500", color: "#374151" },
  filterButtonTextActive: { color: "#1e40af", fontWeight: "600" },

  activeFilterChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dbeafe",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 6,
  },
  activeFilterText: {
    flex: 1,
    color: "#1e40af",
    fontSize: 11,
    fontWeight: "500",
  },
  clearChip: { padding: 2 },
  clearChipText: { color: "#1e40af", fontSize: 14, fontWeight: "bold" },

  pageIndicator: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  content: { flex: 1, padding: 12 },

  // Compact Order Card
  orderCard: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8eaed",
  },

  // Compact Header Row
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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

  typeBadge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: { color: "#1e40af", fontSize: 11, fontWeight: "600" },
  returnBadge: { backgroundColor: "#fee2e2" },
  returnBadgeText: { color: "#dc2626" },

  dateText: { fontSize: 11, color: "#6b7280", marginRight: "auto" },

  // Compact Details Grid
  detailsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 11, opacity: 0.6, marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: "500", color: "#1f2937" },

  // Compact Price Row
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

  // Compact View Button
  viewButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 8,
    marginTop: 4,
    borderRadius: 6,
    alignItems: "center",
  },
  viewButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },

  // Compact Pagination
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

  // Center Content
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
