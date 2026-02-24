"use client";

import apiClient from "@/api/client";
import { useFawryPayment } from "@/hooks/useFawryPayment";
import {
  fetchOrderById,
  getOrderTypeLabel,
  getPaymentMethodLabel,
  getPosOrderStatusBg,
  getPosOrderStatusColor,
  getPosOrderStatusLabel,
  PosOrder,
} from "@/lib/orders-api";
import { useFawryStore } from "@/store/slices/fawry.slice";
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

  // translate known header status descriptions
  const translateStatusDesc = (
    desc: string | undefined | null,
  ): string | undefined => {
    if (!desc) return String(desc);
    switch (desc) {
      case "Payment.VALUE_PAYMENT_STATUS_REFUNDED":
        return "تم الارجاع بنجا"; // as requested, keep original phrasing
      case "Payment.VALUE_PAYMENT_STATUS_SUCCESS":
        return "تم الدفع بنجاح";
      case "Payment.VALUE_PAYMENT_STATUS__VOIDED":
        return "تم الالغاء";
      default:
        return desc;
    }
  };
  const [order, setOrder] = useState<PosOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isFawryConnected = useFawryStore((s) => s.isConnected);
  const { inquireTransaction, voidTransaction } = useFawryPayment();

  const [generatingReceipt, setGeneratingReceipt] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<any>(null);

  // Retry modal
  const [retryModalVisible, setRetryModalVisible] = useState(false);
  const [retryError, setRetryError] = useState("");

  // Fawry inquiry
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [inquiryModalVisible, setInquiryModalVisible] = useState(false);
  const [inquiryResult, setInquiryResult] = useState<any>(null);
  const [inquiryError, setInquiryError] = useState<string | null>(null);

  // Fawry void (triggered from inside inquiry modal)
  const [voidLoading, setVoidLoading] = useState(false);
  const [voidResult, setVoidResult] = useState<string | null>(null);
  const [voidError, setVoidError] = useState<string | null>(null);

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

  const formatDateForInq = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  };

  const handleFawryInquiry = async () => {
    if (!order) return;
    if (!isFawryConnected) {
      Alert.alert("فوري غير متصل", "يجب توصيل جهاز فوري لإجراء الاستعلام.");
      return;
    }
    setInquiryLoading(true);
    setInquiryError(null);
    setInquiryResult(null);
    try {
      const txDate = parseApiDate(order.createdAt);
      const fromDate = new Date(txDate);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(txDate);
      toDate.setHours(23, 59, 59, 0);

      const res = await inquireTransaction({
        transactionId: order.paymentReference
          ? order.paymentReference
          : order.orderNumber,
        idType: order.paymentReference ? "FCRN" : "ORDER_ID",
        fromDate: formatDateForInq(fromDate),
        toDate: formatDateForInq(toDate),
        printReceipt: false,
      });

      let parsed: any = res.response;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          /* keep as string */
        }
      }
      setInquiryResult(parsed);
    } catch (err: any) {
      setInquiryError(err?.message || "فشل الاستعلام عن المعاملة");
    } finally {
      setInquiryLoading(false);
      setInquiryModalVisible(true);
    }
  };

  const handleVoidTransaction = async () => {
    const fcrn = inquiryResult?.body?.fawryReference;
    if (!fcrn) return;
    Alert.alert(
      "تأكيد الإلغاء",
      `هل أنت متأكد من إلغاء هذه المعاملة عبر فوري؟\nFCRN: ${fcrn}`,
      [
        { text: "لا", style: "cancel" },
        {
          text: "نعم، إلغاء",
          style: "destructive",
          onPress: async () => {
            setVoidLoading(true);
            setVoidResult(null);
            setVoidError(null);
            try {
              await voidTransaction(fcrn, order!.orderNumber);
              setVoidResult("✅ تم إلغاء المعاملة بنجاح عبر فوري");
              // Reload order so status reflects any backend update
              const updated = await fetchOrderById(order!.id);
              if (updated) setOrder(updated);
            } catch (err: any) {
              setVoidError(err?.message || "فشل إلغاء المعاملة");
            } finally {
              setVoidLoading(false);
            }
          },
        },
      ],
    );
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
                type="defaultSemiBold"
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
          <ThemedText type="defaultSemiBold" style={styles.backText}>
            رجوع ←
          </ThemedText>
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
              <ThemedText type="subtitle" style={styles.itemTotal}>
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

          {/* Fawry Inquiry Button — only for Sale orders when Fawry is connected */}
          {order.orderType === "Sale" && isFawryConnected && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.inquiryButton,
                inquiryLoading && { opacity: 0.6 },
              ]}
              onPress={handleFawryInquiry}
              disabled={inquiryLoading}
            >
              {inquiryLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <ThemedText style={styles.actionButtonText}>
                  🔍 استعلام فوري
                </ThemedText>
              )}
            </TouchableOpacity>
          )}
        </ThemedView>
      </ScrollView>

      {/* Fawry Inquiry Result Modal */}
      <Modal
        visible={inquiryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInquiryModalVisible(false)}
      >
        <ThemedView style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { maxHeight: "80%" }]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {inquiryError ? "⚠️ فشل الاستعلام" : "🔍 نتيجة استعلام فوري"}
            </ThemedText>

            {inquiryError ? (
              <ThemedText style={styles.modalMessage}>
                {inquiryError}
              </ThemedText>
            ) : (
              <ScrollView
                style={{ marginBottom: 12 }}
                showsVerticalScrollIndicator={false}
              >
                {inquiryResult?.body ? (
                  <ThemedView style={styles.inquiryBody}>
                    {[
                      ["رقم FCRN", inquiryResult.body.fawryReference],
                      [
                        "رقم الطلب",
                        inquiryResult.body.merchantRefNumber ??
                          order?.orderNumber,
                      ],
                      // status from header if available
                      [
                        "حالة الاستجابة",
                        translateStatusDesc(
                          inquiryResult.header?.status?.statusDesc,
                        ) || inquiryResult.header?.status?.statusCode,
                      ],
                      ["الحالة", inquiryResult.body.transactionStatus],
                      ["نوع العملية", inquiryResult.body.transactionType],
                      [
                        "طريقة الدفع",
                        inquiryResult.body.paymentMethod ||
                          inquiryResult.body.paymentOption,
                      ],
                      [
                        "المبلغ",
                        (inquiryResult.body.paymentAmount != null
                          ? inquiryResult.body.paymentAmount
                          : inquiryResult.body.amount) != null
                          ? `${
                              inquiryResult.body.paymentAmount ??
                              inquiryResult.body.amount
                            } ج.م`
                          : undefined,
                      ],
                      ["التاريخ", inquiryResult.body.transactionDate],
                      [
                        "رسالة",
                        inquiryResult.body.statusDescription ??
                          inquiryResult.body.description,
                      ],
                    ]
                      .filter(([, v]) => v != null && v !== "")
                      .map(([label, value], i) => (
                        <ThemedView key={i} style={styles.inquiryRow}>
                          <ThemedText style={styles.inquiryLabel}>
                            {label}
                          </ThemedText>
                          <ThemedText style={styles.inquiryValue}>
                            {String(value ?? "")}
                          </ThemedText>
                        </ThemedView>
                      ))}
                  </ThemedView>
                ) : (
                  <ThemedText style={styles.inquiryRaw}>
                    {typeof inquiryResult === "string"
                      ? inquiryResult
                      : JSON.stringify(inquiryResult, null, 2)}
                  </ThemedText>
                )}
              </ScrollView>
            )}

            {/* Void button: order not paid locally but Fawry says SUCCESS */}
            {!inquiryError &&
              order?.status !== "Paid" &&
              order?.orderType === "Sale" &&
              inquiryResult?.header?.status?.statusDesc ===
                "Payment.VALUE_PAYMENT_STATUS_SUCCESS" &&
              inquiryResult?.body?.fawryReference &&
              !voidResult && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.voidButton,
                    { marginBottom: 8 },
                    voidLoading && { opacity: 0.6 },
                  ]}
                  onPress={handleVoidTransaction}
                  disabled={voidLoading}
                >
                  {voidLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <ThemedText style={styles.actionButtonText}>
                      ❌ إلغاء المعاملة عبر فوري
                    </ThemedText>
                  )}
                </TouchableOpacity>
              )}

            {voidResult && (
              <ThemedView style={styles.voidSuccessBox}>
                <ThemedText style={styles.voidSuccessText}>
                  {voidResult}
                </ThemedText>
              </ThemedView>
            )}

            {voidError && (
              <ThemedText style={[styles.modalMessage, { marginBottom: 8 }]}>
                ⚠️ {voidError}
              </ThemedText>
            )}

            <TouchableOpacity
              style={[styles.modalButton, styles.retryMBtn, { marginTop: 4 }]}
              onPress={() => {
                setInquiryModalVisible(false);
                setVoidResult(null);
                setVoidError(null);
              }}
            >
              <ThemedText style={styles.retryMBtnText}>إغلاق</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </Modal>

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
  statusText: { fontSize: 11 },
  subtitle: { opacity: 0.6, fontSize: 12 },
  backText: { color: "#007AFF", fontSize: 14 },

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
  infoValue: { fontSize: 12, color: "#1f2937" },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 10 },
  detailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  detailItem: { flex: 1, minWidth: "45%" },
  detailLabel: { fontSize: 11, opacity: 0.6, marginBottom: 2 },
  detailValue: { fontSize: 13, color: "#1f2937" },
  notesLabel: {
    fontSize: 11,
    opacity: 0.6,
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
  actionButtonText: { color: "#ffffff", fontSize: 14 },
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
  retryButtonText: { color: "#ffffff", fontSize: 14 },

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
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelMBtn: { backgroundColor: "#f3f4f6" },
  cancelMBtnText: { color: "#374151", fontSize: 14 },
  retryMBtn: { backgroundColor: "#007AFF" },
  retryMBtnText: { color: "#ffffff", fontSize: 14 },
  inquiryButton: { backgroundColor: "#7c3aed" },
  voidButton: { backgroundColor: "#dc2626" },
  voidSuccessBox: {
    backgroundColor: "#d1fae5",
    borderWidth: 1,
    borderColor: "#6ee7b7",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  voidSuccessText: { fontSize: 13, color: "#065f46", textAlign: "center" },
  inquiryBody: { gap: 6 },
  inquiryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 8,
  },
  inquiryLabel: { fontSize: 12, color: "#6b7280", flex: 1 },
  inquiryValue: {
    fontSize: 12,
    color: "#1f2937",
    flex: 2,
    textAlign: "right",
  },
  inquiryRaw: { fontSize: 11, color: "#374151", fontFamily: "monospace" },
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
