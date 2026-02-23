import apiClient from "@/api/client";
import { Colors } from "@/constants/theme";
import { useFawryPayment } from "@/hooks/useFawryPayment";
import { useFawryStore } from "@/store/slices/fawry.slice";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ReceiptPreviewModal } from "../../../components/receipt-preview-modal";
import { Card } from "../../../components/ui/card";
import { ThemedText } from "../../../components/ui/themed-text";
import { ThemedView } from "../../../components/ui/themed-view";
// ─── Step type ────────────────────────────────────────────────────────────────
type ReturnStep =
  | "idle"
  | "creating_return"
  | "fawry_payment"
  | "reporting_payment"
  | "generating_receipt"
  | "done";

function getStepLabel(step: ReturnStep): string {
  switch (step) {
    case "creating_return":
      return "جاري إنشاء طلب الإرجاع...";
    case "fawry_payment":
      return "جاري معالجة استرداد البطاقة...";
    case "reporting_payment":
      return "جاري تأكيد الدفع...";
    case "generating_receipt":
      return "جاري إنشاء إيصال الإرجاع...";
    default:
      return "تأكيد الإرجاع";
  }
}

// ─── Error helper ─────────────────────────────────────────────────────────────
function parseApiError(err: any): string {
  const data = err?.response?.data;
  if (!data) return err?.message || "حدث خطأ غير معروف";
  if (Array.isArray(data?.messages) && data.messages.length > 0)
    return data.messages[0];
  if (data?.errors && typeof data.errors === "object") {
    const firstKey = Object.keys(data.errors)[0];
    const msgs = data.errors[firstKey];
    if (Array.isArray(msgs) && msgs.length > 0) return msgs[0];
  }
  if (data?.title) return data.title;
  if (typeof data === "string") return data;
  return err?.message || "حدث خطأ غير معروف";
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ReturnOrderScreen() {
  const { receiptId, orderData } = useLocalSearchParams<{
    receiptId: string;
    orderData: string;
  }>();

  // parse the orderData once; memoize to avoid creating a new object every render
  const document = React.useMemo(() => {
    if (!orderData) return null;
    try {
      return JSON.parse(orderData);
    } catch {
      return null;
    }
  }, [orderData]);

  // Support both PosOrder.lines and PosReceipt.lines field names
  const sourceLines = React.useMemo<any[]>(
    () => document?.lines ?? document?.receiptItems ?? [],
    [document],
  );

  const isFawryConnected = useFawryStore((s) => s.isConnected);
  const { refundTransaction } = useFawryPayment();

  const [returnItems, setReturnItems] = useState<any[]>([]);
  useEffect(() => {
    setReturnItems(
      sourceLines.map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        originalQuantity: item.quantity,
        returnQuantity: 0,
        unitPrice: item.unitPrice,
        taxAmount: item.taxAmount ?? item.vat ?? 0,
        discountAmount: item.discountAmount ?? 0,
      })),
    );
  }, [sourceLines]);

  const [returnNotes, setReturnNotes] = useState("");
  const [step, setStep] = useState<ReturnStep>("idle");
  const [showPreview, setShowPreview] = useState(false);
  const [createdReceipt, setCreatedReceipt] = useState<any | null>(null);

  // Retry modal for generate-receipt failures
  const [retryModalVisible, setRetryModalVisible] = useState(false);
  const [retryError, setRetryError] = useState("");
  const [pendingReturnOrderId, setPendingReturnOrderId] = useState<
    number | null
  >(null);
  const [generateRetryExpired, setGenerateRetryExpired] = useState(false);

  // Retry modal for Fawry refund failures
  const [paymentRetryModalVisible, setPaymentRetryModalVisible] =
    useState(false);
  const [paymentRetryError, setPaymentRetryError] = useState("");
  const [pendingReturnIdForPayment, setPendingReturnIdForPayment] = useState<
    number | null
  >(null);
  const [pendingRefundAmount, setPendingRefundAmount] = useState<number>(0);
  const [pendingOriginalOrderNumber, setPendingOriginalOrderNumber] =
    useState<string>("");
  const [pendingOriginalFcrn, setPendingOriginalFcrn] = useState<string>("");

  const isProcessing = step !== "idle" && step !== "done";

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const updateReturnQuantity = (index: number, quantity: string) => {
    const numQuantity = parseFloat(quantity) || 0;
    const maxQuantity = returnItems[index].originalQuantity;
    if (numQuantity < 0) return;
    if (numQuantity > maxQuantity) return;
    const updated = [...returnItems];
    updated[index].returnQuantity = numQuantity;
    setReturnItems(updated);
  };

  const selectAllItems = () =>
    setReturnItems(
      returnItems.map((i) => ({ ...i, returnQuantity: i.originalQuantity })),
    );
  const clearAllItems = () =>
    setReturnItems(returnItems.map((i) => ({ ...i, returnQuantity: 0 })));

  const getReturnSubtotal = () =>
    returnItems.reduce((s, it) => s + it.unitPrice * it.returnQuantity, 0);
  const getReturnTax = () =>
    returnItems.reduce(
      (s, it) =>
        s + (it.taxAmount / (it.originalQuantity || 1)) * it.returnQuantity,
      0,
    );
  const getReturnTotal = () => getReturnSubtotal() + getReturnTax();
  const hasItemsToReturn = () => returnItems.some((i) => i.returnQuantity > 0);

  // ─── Step: Generate receipt for the return order ──────────────────────────
  const generateReturnReceipt = async (
    returnOrderId: number,
  ): Promise<boolean> => {
    setStep("generating_receipt");
    setGenerateRetryExpired(false);
    try {
      const res = await apiClient.post(
        `/api/pos/orders/${returnOrderId}/generate-receipt`,
      );
      if (res.data?.succeeded || res.status === 200) {
        setCreatedReceipt(res.data?.data ?? res.data);
        setStep("done");
        setShowPreview(true);
        return true;
      }
      throw new Error(res.data?.messages?.[0] || "فشل إنشاء الإيصال");
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setStep("done");
        router.replace("/(protected)/(tabs)/receipts");
        return true;
      }
      const isExpired = err?.response?.status === 422;
      const msg = isExpired
        ? "انتهت صلاحية الطلب — لا يمكن إنشاء الإيصال بعد الآن."
        : parseApiError(err);
      setPendingReturnOrderId(returnOrderId);
      setRetryError(msg);
      setGenerateRetryExpired(isExpired);
      setRetryModalVisible(true);
      setStep("idle");
      return false;
    }
  };

  // ─── Retry Fawry refund on the existing pending return order ───────────────
  const retryFawryRefund = async () => {
    if (!pendingReturnIdForPayment) return;
    setPaymentRetryModalVisible(false);
    setStep("fawry_payment");

    let fcrn: string | undefined;
    let rawResponse: string;
    let fawrySucceeded = false;

    try {
      const fawryResult = await refundTransaction(
        pendingRefundAmount,
        pendingOriginalOrderNumber,
        pendingOriginalFcrn,
      );
      rawResponse = fawryResult.response;
      fcrn = JSON.parse(fawryResult.response)?.body?.fawryReference;
      fawrySucceeded = fawryResult?.status === "success";
    } catch (fawryErr: any) {
      rawResponse = JSON.stringify({ error: fawryErr?.message ?? "unknown" });
      fawrySucceeded = false;
    }

    if (!fawrySucceeded) {
      setPaymentRetryError(
        "فشلت عملية الاسترداد مجدداً. تأكد من اتصال الجهاز وصلاحية البطاقة.",
      );
      setPaymentRetryModalVisible(true);
      setStep("idle");
      return;
    }

    setStep("reporting_payment");
    const orderIdToGenerate = pendingReturnIdForPayment;
    try {
      await apiClient.post(
        `/api/pos/orders/${pendingReturnIdForPayment}/payment-result`,
        {
          status: "Success",
          externalReference: fcrn ?? `FAWRY-${Date.now()}`,
          rawResponse,
        },
      );
    } catch (err: any) {
      if (err?.response?.status !== 409) {
        setPaymentRetryError(parseApiError(err));
        setPaymentRetryModalVisible(true);
        setStep("idle");
        return;
      }
    }

    setPendingReturnIdForPayment(null);
    await generateReturnReceipt(orderIdToGenerate);
  };

  // ─── Cancel pending return: report Failed to backend and navigate away ──────
  const cancelPendingReturn = async () => {
    if (pendingReturnIdForPayment) {
      try {
        await apiClient.post(
          `/api/pos/orders/${pendingReturnIdForPayment}/payment-result`,
          {
            status: "Failed",
            externalReference: `CANCELLED-${Date.now()}`,
            rawResponse: JSON.stringify({ cancelled: true }),
          },
        );
      } catch {
        // Best-effort — ignore errors
      }
    }
    setPaymentRetryModalVisible(false);
    setPendingReturnIdForPayment(null);
    setStep("idle");
    router.replace("/(protected)/(tabs)/transactions");
  };

  // ─── Return complete: show success feedback ────────────────────────────────
  const handleReturnComplete = () => {
    setShowPreview(false);
    Alert.alert(
      "✅ تم الإرجاع بنجاح",
      "تمت عملية الإرجاع وإنشاء الإيصال بنجاح.",
      [
        {
          text: "عرض الإيصالات",
          onPress: () => router.replace("/(protected)/(tabs)/receipts"),
        },
        {
          text: "رجوع",
          style: "cancel",
          onPress: () => router.back(),
        },
      ],
    );
  };

  // ─── Submit return ────────────────────────────────────────────────────────
  const handleSubmitReturn = async () => {
    if (!hasItemsToReturn()) {
      Alert.alert("تنبيه", "الرجاء تحديد المنتجات المراد إرجاعها");
      return;
    }

    const originalReceiptId = receiptId
      ? parseInt(receiptId, 10)
      : document?.id;

    if (!originalReceiptId) {
      Alert.alert("خطأ", "لا يمكن تحديد معرف الإيصال الأصلي");
      return;
    }

    Alert.alert(
      "تأكيد الإرجاع",
      `هل أنت متأكد من إرجاع هذه المنتجات؟\nالإجمالي: ${getReturnTotal().toFixed(2)} ج.م`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تأكيد",
          onPress: async () => {
            setStep("creating_return");
            try {
              const itemsPayload = returnItems
                .filter((it) => it.returnQuantity > 0)
                .map((it) => ({
                  productId: it.productId,
                  quantity: it.returnQuantity,
                }));

              const payload = {
                originalReceiptId,
                items: itemsPayload,
              };

              const res = await apiClient.post(
                "/api/pos/orders/return",
                payload,
              );

              if (!res.data?.succeeded) {
                throw new Error(
                  res.data?.messages?.[0] || "فشل إنشاء طلب الإرجاع",
                );
              }

              const returnOrder = res.data.data;
              const returnOrderId: number = returnOrder.id;
              const returnStatus: string = returnOrder.status;
              const returnTotal: number =
                returnOrder.totalAmount ?? getReturnTotal();

              // Cash return: immediately Paid → generate receipt
              if (returnStatus === "Paid") {
                await generateReturnReceipt(returnOrderId);
                return;
              }

              // Visa return: Pending → Fawry refund by orderNumber → payment-result → generate-receipt
              if (!isFawryConnected) {
                setStep("idle");
                Alert.alert(
                  "فوري غير متصل",
                  "يجب توصيل جهاز فوري لإتمام الاسترداد بالبطاقة",
                );
                return;
              }

              setStep("fawry_payment");
              let fcrn: string | undefined;
              let rawResponse: string;
              let fawrySucceeded = false;

              try {
                const fawryResult = await refundTransaction(
                  returnTotal,
                  document.orderNumber,
                  document.paymentReference ?? "",
                );
                rawResponse = fawryResult.response;
                fcrn = JSON.parse(fawryResult.response)?.body?.fawryReference;
                fawrySucceeded = fawryResult?.status === "success";
              } catch (fawryErr: any) {
                rawResponse = JSON.stringify({
                  error: fawryErr?.message ?? "unknown",
                });
                fawrySucceeded = false;
              }

              // Refund failed → show retry modal (return order stays Pending)
              if (!fawrySucceeded) {
                setPendingReturnIdForPayment(returnOrderId);
                setPendingRefundAmount(returnTotal);
                setPendingOriginalOrderNumber(document.orderNumber ?? "");
                setPendingOriginalFcrn(document.paymentReference ?? "");
                setPaymentRetryError(
                  "فشلت عملية استرداد البطاقة. يمكنك إعادة المحاولة أو إلغاء الإرجاع.",
                );
                setPaymentRetryModalVisible(true);
                setStep("idle");
                return;
              }

              // Refund succeeded → report Success to backend
              setStep("reporting_payment");
              try {
                await apiClient.post(
                  `/api/pos/orders/${returnOrderId}/payment-result`,
                  {
                    status: "Success",
                    externalReference: fcrn ?? `FAWRY-${Date.now()}`,
                    rawResponse,
                  },
                );
              } catch (err: any) {
                if (err?.response?.status !== 409) {
                  setPendingReturnIdForPayment(returnOrderId);
                  setPendingRefundAmount(returnTotal);
                  setPendingOriginalOrderNumber(document.orderNumber ?? "");
                  setPendingOriginalFcrn(document.paymentReference ?? "");
                  setPaymentRetryError(parseApiError(err));
                  setPaymentRetryModalVisible(true);
                  setStep("idle");
                  return;
                }
              }

              await generateReturnReceipt(returnOrderId);
            } catch (err: any) {
              setStep("idle");
              const msg = parseApiError(err);
              Alert.alert("فشل الإرجاع", msg);
            }
          },
        },
      ],
    );
  };

  if (!document) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.centerContent}>
          <ThemedText style={styles.errorText}>
            لم يتم العثور على بيانات الطلب
          </ThemedText>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.retryButton}
          >
            <ThemedText style={styles.retryButtonText}>رجوع</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    );
  }

  if (isProcessing) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={styles.processingText}>
          {getStepLabel(step)}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Receipt Preview Modal */}
      {createdReceipt && (
        <ReceiptPreviewModal
          visible={showPreview}
          document={createdReceipt}
          onClose={() => {
            setShowPreview(false);
            router.replace("/(protected)/(tabs)/receipts");
          }}
          onComplete={handleReturnComplete}
        />
      )}

      {/* Generate Receipt Retry Modal */}
      <Modal
        visible={retryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          !generateRetryExpired && setRetryModalVisible(false)
        }
      >
        <ThemedView style={styles.modalOverlay}>
          <Card style={styles.retryModalCard}>
            <ThemedText style={styles.retryModalTitle}>
              {generateRetryExpired
                ? "⏰ انتهت صلاحية الطلب"
                : "فشل إنشاء الإيصال"}
            </ThemedText>
            <ThemedText style={styles.retryModalMessage}>
              {retryError}
            </ThemedText>
            <ThemedText style={styles.retryModalHint}>
              {generateRetryExpired
                ? "تم تسجيل الإرجاع بنجاح لكن انتهت صلاحية الطلب. يرجى مراجعة المعاملات."
                : "تم تسجيل الإرجاع بنجاح. يمكنك إنشاء الإيصال لاحقاً من شاشة المعاملات."}
            </ThemedText>
            <ThemedView style={styles.retryModalButtons}>
              <TouchableOpacity
                style={styles.retryModalSecondary}
                onPress={() => {
                  setRetryModalVisible(false);
                  router.replace("/(protected)/(tabs)/transactions");
                }}
              >
                <ThemedText style={styles.retryModalSecondaryText}>
                  عرض المعاملات
                </ThemedText>
              </TouchableOpacity>
              {!generateRetryExpired && (
                <TouchableOpacity
                  style={styles.retryModalPrimary}
                  onPress={async () => {
                    setRetryModalVisible(false);
                    if (pendingReturnOrderId)
                      await generateReturnReceipt(pendingReturnOrderId);
                  }}
                >
                  <ThemedText style={styles.retryModalPrimaryText}>
                    إعادة المحاولة
                  </ThemedText>
                </TouchableOpacity>
              )}
            </ThemedView>
          </Card>
        </ThemedView>
      </Modal>

      {/* Payment Retry Modal — Fawry refund failed but return order exists */}
      <Modal
        visible={paymentRetryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <ThemedView style={styles.modalOverlay}>
          <Card style={styles.retryModalCard}>
            <ThemedText style={[styles.retryModalTitle, { color: "#d97706" }]}>
              💳 فشل استرداد البطاقة
            </ThemedText>
            <ThemedText style={styles.retryModalMessage}>
              {paymentRetryError}
            </ThemedText>
            <ThemedText style={styles.retryModalHint}>
              طلب الإرجاع تم إنشاؤه. يمكنك إعادة محاولة الاسترداد أو إلغاء
              الإرجاع.
            </ThemedText>
            <ThemedView style={styles.retryModalButtons}>
              <TouchableOpacity
                style={styles.paymentRetryCancel}
                onPress={cancelPendingReturn}
              >
                <ThemedText style={styles.paymentRetryCancelText}>
                  إلغاء الإرجاع
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.paymentRetryPrimary}
                onPress={retryFawryRefund}
              >
                <ThemedText style={styles.retryModalPrimaryText}>
                  إعادة الاسترداد
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </Card>
        </ThemedView>
      </Modal>

      {/* Compact Header */}
      <ThemedView style={styles.header}>
        <ThemedView>
          <ThemedText type="title">إرجاع طلب #{document.id}</ThemedText>
          <ThemedText style={styles.subtitle}>
            {document.customerName || document.customerCode}
          </ThemedText>
        </ThemedView>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={styles.backText}>رجوع ←</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Compact Info Card */}
        <Card style={styles.infoCard}>
          <ThemedView style={styles.infoGrid}>
            <ThemedView style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>المرجع</ThemedText>
              <ThemedText style={styles.infoValue} numberOfLines={1}>
                {document.referenceNumber}
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>الإجمالي الأصلي</ThemedText>
              <ThemedText style={styles.infoValue}>
                {document.totalAmount.toFixed(2)} ج.م
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </Card>

        {/* Compact Actions Bar */}
        <ThemedView style={styles.actionsBar}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={selectAllItems}
          >
            <ThemedText style={styles.actionButtonText}>تحديد الكل</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearButton} onPress={clearAllItems}>
            <ThemedText style={styles.clearButtonText}>
              إلغاء التحديد
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Compact Items Card */}
        <Card style={styles.itemsCard}>
          <ThemedText style={styles.sectionTitle}>المنتجات</ThemedText>

          {returnItems.map((item, index) => (
            <ThemedView key={index} style={styles.itemContainer}>
              {/* Item Header */}
              <ThemedView style={styles.itemHeader}>
                <ThemedText style={styles.itemName} numberOfLines={1}>
                  {item.productName}
                </ThemedText>
                <ThemedText style={styles.itemPrice}>
                  {item.unitPrice.toFixed(2)} ج.م
                </ThemedText>
              </ThemedView>

              {/* Item Meta */}
              <ThemedView style={styles.itemMeta}>
                <ThemedText style={styles.itemMetaText}>
                  الكمية الأصلية: {item.originalQuantity}
                </ThemedText>
                <ThemedText style={styles.itemMetaText}>
                  الإجمالي:{" "}
                  {(item.unitPrice * item.originalQuantity).toFixed(2)}
                </ThemedText>
              </ThemedView>

              {/* Quantity Control - Compact */}
              <ThemedView style={styles.quantityControl}>
                <ThemedText style={styles.quantityLabel}>
                  كمية الإرجاع:
                </ThemedText>
                <ThemedView style={styles.quantityInputContainer}>
                  <TouchableOpacity
                    onPress={() =>
                      updateReturnQuantity(
                        index,
                        (item.returnQuantity - 1).toString(),
                      )
                    }
                    style={styles.quantityButton}
                  >
                    <ThemedText style={styles.quantityButtonText}>-</ThemedText>
                  </TouchableOpacity>
                  <TextInput
                    value={item.returnQuantity.toString()}
                    onChangeText={(text) => updateReturnQuantity(index, text)}
                    keyboardType="numeric"
                    style={styles.quantityInput}
                  />
                  <TouchableOpacity
                    onPress={() =>
                      updateReturnQuantity(
                        index,
                        (item.returnQuantity + 1).toString(),
                      )
                    }
                    style={styles.quantityButton}
                  >
                    <ThemedText style={styles.quantityButtonText}>+</ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              </ThemedView>

              {/* Return Total Badge */}
              {item.returnQuantity > 0 && (
                <ThemedView style={styles.returnTotalBadge}>
                  <ThemedText style={styles.returnTotalText}>
                    إجمالي الإرجاع:{" "}
                    {(
                      item.unitPrice * item.returnQuantity +
                      (item.taxAmount / (item.originalQuantity || 1)) *
                        item.returnQuantity
                    ).toFixed(2)}{" "}
                    ج.م
                  </ThemedText>
                </ThemedView>
              )}
            </ThemedView>
          ))}
        </Card>

        {/* Compact Notes Card */}
        <Card style={styles.notesCard}>
          <ThemedText style={styles.notesLabel}>
            ملاحظات الإرجاع (اختياري)
          </ThemedText>
          <TextInput
            value={returnNotes}
            onChangeText={setReturnNotes}
            placeholder="سبب الإرجاع..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            style={styles.notesInput}
          />
        </Card>

        {/* Compact Summary Card */}
        {hasItemsToReturn() && (
          <Card style={styles.summaryCard}>
            <ThemedText style={styles.sectionTitle}>ملخص الإرجاع</ThemedText>
            <ThemedView style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>
                المجموع الفرعي:
              </ThemedText>
              <ThemedText style={styles.summaryValue}>
                {getReturnSubtotal().toFixed(2)} ج.م
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>الضريبة:</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {getReturnTax().toFixed(2)} ج.م
              </ThemedText>
            </ThemedView>
            <ThemedView style={[styles.summaryRow, styles.totalRow]}>
              <ThemedText style={styles.totalLabel}>إجمالي الإرجاع:</ThemedText>
              <ThemedText style={styles.totalValue}>
                {getReturnTotal().toFixed(2)} ج.م
              </ThemedText>
            </ThemedView>
          </Card>
        )}

        {/* Bottom Spacer */}
        <ThemedView style={{ height: 100 }} />
      </ScrollView>

      {/* Compact Bottom Bar */}
      <ThemedView style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            !hasItemsToReturn() && styles.disabledButton,
          ]}
          onPress={handleSubmitReturn}
          disabled={!hasItemsToReturn()}
        >
          <ThemedText type="subtitle" style={styles.submitButtonText}>
            تأكيد الإرجاع - {getReturnTotal().toFixed(2)} ج.م
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, direction: "rtl", backgroundColor: "#f8f9fa" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  processingText: { marginTop: 16, fontSize: 15, opacity: 0.7 },

  // Compact Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e8eaed",
  },
  subtitle: { opacity: 0.6, marginTop: 2, fontSize: 12 },
  backText: { color: "#007AFF", fontWeight: "600", fontSize: 14 },

  content: { flex: 1, padding: 12 },

  // Compact Info Card
  infoCard: {
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8eaed",
  },
  infoGrid: { flexDirection: "row", gap: 8 },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 11, opacity: 0.6, marginBottom: 3 },
  infoValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1f2937",
    fontFamily: "monospace",
  },

  // Compact Actions Bar
  actionsBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.light.primary,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  actionButtonText: { color: "#ffffff", fontWeight: "600", fontSize: 13 },
  clearButton: {
    flex: 1,
    backgroundColor: "#96979bff",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  clearButtonText: { color: "#ffffff", fontWeight: "600", fontSize: 13 },

  // Compact Items Card
  itemsCard: {
    padding: 12,
    marginBottom: 10,
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
  itemContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  itemName: { fontWeight: "600", fontSize: 13, flex: 1, color: "#1f2937" },
  itemPrice: { fontWeight: "600", color: "#007AFF", fontSize: 13 },
  itemMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  itemMetaText: { fontSize: 11, opacity: 0.6 },

  // Compact Quantity Control
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  quantityLabel: { fontSize: 12, fontWeight: "600", color: "#1f2937" },
  quantityInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    backgroundColor: "#007AFF",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityButtonText: { color: "#ffffff", fontSize: 18, fontWeight: "700" },
  quantityInput: {
    width: 50,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 6,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
    color: "#1f2937",
  },

  // Return Total Badge
  returnTotalBadge: {
    backgroundColor: "#d1fae5",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  returnTotalText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
    textAlign: "center",
  },

  // Compact Notes Card
  notesCard: {
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8eaed",
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    color: "#1f2937",
  },
  notesInput: {
    height: 60,
    textAlignVertical: "top",
    textAlign: "right",
    fontSize: 13,
    padding: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    color: "#1f2937",
  },

  // Compact Summary Card
  summaryCard: {
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8eaed",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  summaryLabel: { fontSize: 12, color: "#6b7280" },
  summaryValue: { fontSize: 12, fontWeight: "500", color: "#1f2937" },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#fbbf24",
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: { fontSize: 14, fontWeight: "700", color: "#1f2937" },
  totalValue: { fontSize: 15, fontWeight: "700", color: "#dc2626" },

  // Compact Bottom Bar
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  submitButton: {
    backgroundColor: "#dc2626",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  disabledButton: { backgroundColor: "#9ca3af", opacity: 0.5 },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 14,
  },

  // Center Content
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
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

  // Retry Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  retryModalCard: {
    width: "100%",
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#ffffff",
  },
  retryModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#dc2626",
    textAlign: "center",
    marginBottom: 10,
  },
  retryModalMessage: {
    fontSize: 13,
    color: "#374151",
    textAlign: "center",
    marginBottom: 8,
  },
  retryModalHint: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
  },
  retryModalButtons: {
    flexDirection: "row",
    gap: 10,
  },
  retryModalSecondary: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
  },
  retryModalSecondaryText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
  },
  retryModalPrimary: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#dc2626",
    alignItems: "center",
  },
  retryModalPrimaryText: { fontSize: 13, color: "#ffffff", fontWeight: "700" },
  paymentRetryPrimary: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  paymentRetryCancel: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
    alignItems: "center",
  },
  paymentRetryCancelText: { fontSize: 13, color: "#dc2626", fontWeight: "600" },
});
