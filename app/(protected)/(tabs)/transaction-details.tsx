"use client";

import apiClient from "@/api/client";
import {
    fetchOrderById,
    getOrderTypeLabel,
    getPaymentMethodLabel,
    getPosOrderStatusBg,
    getPosOrderStatusColor,
    getPosOrderStatusLabel,
    PosOrder,
} from "@/lib/orders-api";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ReceiptPreviewModal } from "../../../components/receipt-preview-modal";
import { Card } from "../../../components/ui/card";
import { ThemedText } from "../../../components/ui/themed-text";
import { ThemedView } from "../../../components/ui/themed-view";

function parseApiError(err: any): string {
  const data = err?.response?.data;
  if (!data) return err?.message || "حدث خطأ غير معروف";
  if (Array.isArray(data?.messages) && data.messages.length > 0)
    return data.messages[0];
  if (data?.title) return data.title;
  return err?.message || "حدث خطأ غير معروف";
}

function parseApiDate(dateString: string): Date {
  const normalized = dateString
    ?.replace(/(\.\d{3})\d+/, "$1")
    ?.replace(/(?<![Z]|[+-]\d{2}:?\d{2})$/, "Z");
  return new Date(normalized);
}

export default function TransactionDetailsScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<PosOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [generatingReceipt, setGeneratingReceipt] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<any>(null);

  // Retry modal
  const [retryModalVisible, setRetryModalVisible] = useState(false);
  const [retryError, setRetryError] = useState("");

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    if (!orderId) {
      setError("معرف المعاملة غير موجود");
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await fetchOrderById(parseInt(orderId, 10));
      if (!data) throw new Error("لم يتم العثور على المعاملة");
      setOrder(data);
    } catch (err: any) {
      setError(
        err instanceof Error ? err.message : "فشل تحميل تفاصيل المعاملة",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReceipt = async () => {
    if (!order) return;
    setGeneratingReceipt(true);
    try {
      const res = await apiClient.post(
        `/api/pos/orders/${order.id}/generate-receipt`,
      );
      if (res.data?.succeeded) {
        setReceiptOrder(res.data.data);
        setShowReceiptPreview(true);
        // Reload order to reflect isReceiptCreated = true
        const updated = await fetchOrderById(order.id);
        if (updated) setOrder(updated);
      } else {
        const msg = res.data?.messages?.[0] || "فشل في إنشاء الإيصال";
        setRetryError(msg);
        setRetryModalVisible(true);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        Alert.alert(
          "تنبيه",
          "تم إنشاء هذا الإيصال مسبقاً. يمكنك مشاهدته في قائمة الإيصالات.",
        );
        return;
      }
      setRetryError(parseApiError(err));
      setRetryModalVisible(true);
    } finally {
      setGeneratingReceipt(false);
    }
  };

  const handleViewReceipt = () => {
    router.push("/(protected)/(tabs)/receipts");
  };

  const formatDate = (dateString: string) =>
    parseApiDate(dateString).toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

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

  if (error || !order) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.centerContent}>
          <ThemedText style={styles.errorText}>
            {error || "لم يتم العثور على المعاملة"}
          </ThemedText>
          <TouchableOpacity onPress={loadOrder} style={styles.retryButton}>
            <ThemedText style={styles.retryButtonText}>
              إعادة المحاولة
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    );
  }

  const canGenerateReceipt = !order.isReceiptCreated && order.status === "Paid";

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedView style={styles.headerContent}>
          <ThemedView style={styles.headerTop}>
            <ThemedText type="title">معاملة #{order.id}</ThemedText>
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
          </ThemedView>
          <ThemedText style={styles.subtitle}>
            {formatDate(order.createdAt)}
          </ThemedText>
        </ThemedView>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={styles.backText}>رجوع ←</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Info Card */}
        <Card style={styles.infoCard}>
          <ThemedView style={styles.infoGrid}>
            <ThemedView style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>رقم الطلب</ThemedText>
              <ThemedText style={styles.infoValue} numberOfLines={1}>
                {order.orderNumber}
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>النوع</ThemedText>
              <ThemedText style={styles.infoValue}>
                {getOrderTypeLabel(order.orderType)}
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.divider} />

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
            {order.paymentReference && (
              <ThemedView style={styles.detailItem}>
                <ThemedText style={styles.detailLabel}>مرجع الدفع</ThemedText>
                <ThemedText style={styles.detailValue} numberOfLines={1}>
                  {order.paymentReference}
                </ThemedText>
              </ThemedView>
            )}
            <ThemedView style={styles.detailItem}>
              <ThemedText style={styles.detailLabel}>الإيصال</ThemedText>
              <ThemedText
                style={[
                  styles.detailValue,
                  { color: order.isReceiptCreated ? "#059669" : "#d97706" },
                ]}
              >
                {order.isReceiptCreated ? "✓ تم الإنشاء" : "لم يُنشأ بعد"}
              </ThemedText>
            </ThemedView>
          </ThemedView>

          {order.notes && (
            <>
              <ThemedView style={styles.divider} />
              <ThemedText style={styles.notesLabel}>ملاحظات:</ThemedText>
              <ThemedText style={styles.notesValue}>{order.notes}</ThemedText>
            </>
          )}
        </Card>

        {/* Lines Card */}
        <Card style={styles.itemsCard}>
          <ThemedText style={styles.sectionTitle}>المنتجات</ThemedText>
          {order.lines?.map((line, i) => (
            <ThemedView key={i} style={styles.itemRow}>
              <ThemedView style={styles.itemMain}>
                <ThemedText style={styles.itemName} numberOfLines={1}>
                  {line.productName}
                </ThemedText>
                <ThemedView style={styles.itemMetaRow}>
                  <ThemedText style={styles.itemMeta}>
                    {line.quantity} × {line.unitPrice.toFixed(2)}
                  </ThemedText>
                  {line.taxAmount > 0 && (
                    <ThemedText style={styles.itemTax}>
                      ض: {line.taxAmount.toFixed(2)}
                    </ThemedText>
                  )}
                  {line.discountAmount > 0 && (
                    <ThemedText style={styles.itemDiscount}>
                      خصم: {line.discountAmount.toFixed(2)}
                    </ThemedText>
                  )}
                </ThemedView>
              </ThemedView>
              <ThemedText style={styles.itemTotal}>
                {line.total.toFixed(2)}
              </ThemedText>
            </ThemedView>
          ))}
        </Card>

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <ThemedText style={styles.sectionTitle}>ملخص المبلغ</ThemedText>
          <ThemedView style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>المجموع الفرعي:</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {order.subtotal.toFixed(2)} ج.م
            </ThemedText>
          </ThemedView>
          {order.extraDiscount > 0 && (
            <ThemedView style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>خصم إضافي:</ThemedText>
              <ThemedText style={[styles.summaryValue, { color: "#059669" }]}>
                -{order.extraDiscount.toFixed(2)} ج.م
              </ThemedText>
            </ThemedView>
          )}
          <ThemedView style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>الضريبة:</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {order.taxAmount.toFixed(2)} ج.م
            </ThemedText>
          </ThemedView>
          <ThemedView style={[styles.summaryRow, styles.totalRow]}>
            <ThemedText type="subtitle" style={styles.totalLabel}>
              الإجمالي:
            </ThemedText>
            <ThemedText type="subtitle" style={styles.totalValue}>
              {order.totalAmount.toFixed(2)} ج.م
            </ThemedText>
          </ThemedView>
        </Card>

        {/* Actions */}
        <ThemedView style={styles.actionsContainer}>
          {canGenerateReceipt && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.generateButton,
                generatingReceipt && { opacity: 0.6 },
              ]}
              onPress={handleGenerateReceipt}
              disabled={generatingReceipt}
            >
              {generatingReceipt ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <ThemedText style={styles.actionButtonText}>
                  إنشاء الإيصال
                </ThemedText>
              )}
            </TouchableOpacity>
          )}

          {order.isReceiptCreated && (
            <TouchableOpacity
              style={[styles.actionButton, styles.viewReceiptButton]}
              onPress={handleViewReceipt}
            >
              <ThemedText style={styles.actionButtonText}>
                عرض الإيصالات
              </ThemedText>
            </TouchableOpacity>
          )}

          {order.isReceiptCreated && order.orderType === "Sale" && (
            <ThemedView style={styles.returnHintBox}>
              <ThemedText style={styles.returnHintText}>
                💡 لإرجاع هذا الطلب، انتقل إلى الإيصالات وافتح الإيصال المقابل
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      </ScrollView>

      {receiptOrder && (
        <ReceiptPreviewModal
          visible={showReceiptPreview}
          document={receiptOrder}
          onClose={() => setShowReceiptPreview(false)}
        />
      )}

      {/* Retry Modal */}
      <Modal
        visible={retryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRetryModalVisible(false)}
      >
        <ThemedView style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>
              ⚠️ فشل إنشاء الإيصال
            </ThemedText>
            <ThemedText style={styles.modalMessage}>{retryError}</ThemedText>
            <ThemedView style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelMBtn]}
                onPress={() => setRetryModalVisible(false)}
              >
                <ThemedText style={styles.cancelMBtnText}>إغلاق</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.retryMBtn]}
                onPress={() => {
                  setRetryModalVisible(false);
                  handleGenerateReceipt();
                }}
              >
                <ThemedText style={styles.retryMBtnText}>
                  إعادة المحاولة
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, direction: "rtl", backgroundColor: "#f8f9fa" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e8eaed",
  },
  headerContent: { flex: 1 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: "600" },
  subtitle: { opacity: 0.6, fontSize: 12 },
  backText: { color: "#007AFF", fontWeight: "600", fontSize: 14 },

  content: { flex: 1, padding: 12 },

  infoCard: {
    marginBottom: 10,
    padding: 12,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8eaed",
  },
  infoGrid: { flexDirection: "row", gap: 8, marginBottom: 8 },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 11, opacity: 0.6, marginBottom: 3 },
  infoValue: { fontSize: 12, fontWeight: "600", color: "#1f2937" },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 10 },
  detailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  detailItem: { flex: 1, minWidth: "45%" },
  detailLabel: { fontSize: 11, opacity: 0.6, marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: "500", color: "#1f2937" },
  notesLabel: {
    fontSize: 11,
    opacity: 0.6,
    fontWeight: "600",
    marginBottom: 4,
  },
  notesValue: { fontSize: 12, opacity: 0.7, lineHeight: 16 },

  itemsCard: {
    marginBottom: 10,
    padding: 12,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8eaed",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
    color: "#1f2937",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 8,
  },
  itemMain: { flex: 1 },
  itemName: {
    fontWeight: "600",
    fontSize: 13,
    marginBottom: 3,
    color: "#1f2937",
  },
  itemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  itemMeta: { fontSize: 11, opacity: 0.6 },
  itemTax: {
    fontSize: 10,
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  itemDiscount: {
    fontSize: 10,
    color: "#059669",
    backgroundColor: "#d1fae5",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  itemTotal: {
    fontWeight: "700",
    fontSize: 14,
    color: "#007AFF",
    minWidth: 60,
    textAlign: "left",
  },

  summaryCard: {
    marginBottom: 10,
    padding: 12,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8eaed",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  summaryLabel: { fontSize: 13, color: "#6b7280" },
  summaryValue: { fontSize: 13, color: "#1f2937" },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: { fontSize: 15, color: "#1f2937" },
  totalValue: { fontSize: 16, color: "#007AFF" },

  actionsContainer: { gap: 8, marginBottom: 10 },
  actionButton: { paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  actionButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  generateButton: { backgroundColor: "#007AFF" },
  viewReceiptButton: { backgroundColor: "#059669" },
  returnButton: { backgroundColor: "#dc2626" },

  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: { marginTop: 12, opacity: 0.6, fontSize: 14 },
  errorText: {
    color: "#ef4444",
    textAlign: "center",
    marginBottom: 16,
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: { color: "#ffffff", fontWeight: "600", fontSize: 14 },

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
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
    color: "#1f2937",
  },
  modalMessage: {
    fontSize: 13,
    color: "#dc2626",
    textAlign: "center",
    marginBottom: 16,
  },
  modalButtons: { flexDirection: "row", gap: 10 },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelMBtn: { backgroundColor: "#f3f4f6" },
  cancelMBtnText: { color: "#374151", fontWeight: "600", fontSize: 14 },
  retryMBtn: { backgroundColor: "#007AFF" },
  retryMBtnText: { color: "#ffffff", fontWeight: "600", fontSize: 14 },
  returnHintBox: {
    backgroundColor: "#fefce8",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 8,
    padding: 12,
  },
  returnHintText: {
    fontSize: 13,
    color: "#92400e",
    textAlign: "center",
    lineHeight: 20,
  },
});
