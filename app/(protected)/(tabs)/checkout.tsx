import apiClient from "@/api/client";
import { Colors } from "@/constants/theme";
import { useFawryPayment } from "@/hooks/useFawryPayment";
import { useAuthStore } from "@/store/slices/auth.slice";
import { useCartStore } from "@/store/slices/cart.slice";
import { useFawryStore } from "@/store/slices/fawry.slice";
import { router } from "expo-router";
import React, { useState } from "react";
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
import { BTC_CODES } from "../../../types/fawry.types";

// ─── Step labels ──────────────────────────────────────────────────────────────
type Step =
  | "idle"
  | "creating_order"
  | "fawry_payment"
  | "reporting_payment"
  | "generating_receipt"
  | "done";

function getStepLabel(
  step: Step,
  paymentMethod: "cash" | "visa" | null,
): string {
  switch (step) {
    case "creating_order":
      return "جاري إنشاء الطلب...";
    case "fawry_payment":
      return "جاري الدفع بالبطاقة...";
    case "reporting_payment":
      return "جاري تأكيد الدفع...";
    case "generating_receipt":
      return "جاري إنشاء الإيصال...";
    default:
      return paymentMethod === "visa"
        ? "إتمام الطلب بالبطاقة"
        : "إتمام الطلب ومعاينة الإيصال";
  }
}

// ─── Error message helpers ────────────────────────────────────────────────────
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
export default function CheckoutScreen() {
  const cart = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.getSubtotal)();
  const tax = useCartStore((s) => s.getTax)();
  const total = useCartStore((s) => s.getTotal)();
  const clearCart = useCartStore((s) => s.clearCart);

  const deviceSerial = useAuthStore((s) => s.user?.deviceSerial ?? "");

  const [selectedPayment, setSelectedPayment] = useState<
    "cash" | "visa" | null
  >(null);
  const [step, setStep] = useState<Step>("idle");
  const [showPreview, setShowPreview] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [extraDiscount, setExtraDiscount] = useState("0");

  // Retry modal for generate-receipt failures
  const [retryModalVisible, setRetryModalVisible] = useState(false);
  const [retryError, setRetryError] = useState("");
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
  const [generateRetryExpired, setGenerateRetryExpired] = useState(false);

  // Retry modal for Fawry payment failures (order exists but payment failed)
  const [paymentRetryModalVisible, setPaymentRetryModalVisible] =
    useState(false);
  const [paymentRetryError, setPaymentRetryError] = useState("");
  const [pendingVisaOrderId, setPendingVisaOrderId] = useState<number | null>(
    null,
  );
  const [pendingVisaOrderNumber, setPendingVisaOrderNumber] =
    useState<string>("");
  const [pendingVisaAmount, setPendingVisaAmount] = useState<number>(0);

  const isFawryConnected = useFawryStore((s) => s.isConnected);
  const { processCardPayment } = useFawryPayment();

  const isProcessing = step !== "idle" && step !== "done";

  // ─── Step 3: Generate receipt ───────────────────────────────────────────────
  const generateReceipt = async (orderId: number): Promise<boolean> => {
    setStep("generating_receipt");
    setGenerateRetryExpired(false);
    try {
      const res = await apiClient.post(
        `/api/pos/orders/${orderId}/generate-receipt`,
      );
      if (res.data?.succeeded) {
        setCreatedOrder(res.data.data);
        setStep("done");
        setShowPreview(true);
        return true;
      }
      const msg = res.data?.messages?.[0] || "فشل في إنشاء الإيصال";
      setPendingOrderId(orderId);
      setRetryError(msg);
      setRetryModalVisible(true);
      setStep("idle");
      return false;
    } catch (err: any) {
      const httpStatus = err?.response?.status;
      if (httpStatus === 409) {
        Alert.alert("تنبيه", "تم إنشاء هذا الإيصال مسبقاً");
        setStep("idle");
        return true;
      }
      // 422 = order expired or wrong status — no retry possible
      const isExpired = httpStatus === 422;
      const msg = isExpired
        ? "انتهت صلاحية الطلب — لا يمكن إنشاء الإيصال بعد الآن."
        : parseApiError(err);
      setPendingOrderId(orderId);
      setRetryError(msg);
      setGenerateRetryExpired(isExpired);
      setRetryModalVisible(true);
      setStep("idle");
      return false;
    }
  };

  // ─── Main payment handler ───────────────────────────────────────────────────
  const handlePayment = async () => {
    if (!selectedPayment) {
      Alert.alert("طريقة الدفع مطلوبة", "الرجاء اختيار طريقة الدفع");
      return;
    }
    if (selectedPayment === "visa" && !isFawryConnected) {
      Alert.alert(
        "جهاز فوري غير متصل",
        "يرجى الاتصال بجهاز فوري أولاً من إعدادات الجهاز قبل الدفع بالبطاقة.",
      );
      return;
    }

    const extraDiscountNum = parseFloat(extraDiscount) || 0;
    if (extraDiscountNum < 0) {
      Alert.alert("خطأ", "قيمة الخصم الإضافي يجب أن تكون صفراً أو أكبر");
      return;
    }

    // ─── Step 1: Create order ─────────────────────────────────────────────────
    setStep("creating_order");
    let orderId: number;
    let orderNumber: string;

    try {
      const payload = {
        items: cart.map((item: any) => ({
          productId: parseInt(item.product.id, 10),
          quantity: item.quantity,
          discountAmount: 0,
        })),
        paymentMethod: selectedPayment === "cash" ? "Cash" : "Visa",
        customerName: customerName.trim() || "WALK-IN",
        extraDiscount: extraDiscountNum,
        notes: "",
      };

      const res = await apiClient.post("/api/pos/orders", payload);

      if (!res.data?.succeeded || !res.data?.data) {
        const msg = res.data?.messages?.[0] || "فشل في إنشاء الطلب";
        Alert.alert("فشل إنشاء الطلب", msg);
        setStep("idle");
        return;
      }

      orderId = res.data.data.id;
      orderNumber = res.data.data.orderNumber;
    } catch (err: any) {
      Alert.alert("فشل إنشاء الطلب", parseApiError(err));
      setStep("idle");
      return;
    }

    // ─── Cash flow ────────────────────────────────────────────────────────────
    if (selectedPayment === "cash") {
      await generateReceipt(orderId);
      return;
    }

    // ─── Visa flow ─────────────────────────────────────────────────────────────
    setStep("fawry_payment");
    let fcrn: string | undefined;
    let rawResponse: string;
    let paymentStatus: "Success" | "Failed" = "Failed";

    try {
      const fawryResponse = await processCardPayment(
        parseFloat(String(total)),
        orderNumber,
        BTC_CODES.CARD_PAYMENT,
      );
      rawResponse = JSON.stringify(fawryResponse);
      paymentStatus = fawryResponse.status === "success" ? "Success" : "Failed";
      fcrn = JSON.parse(fawryResponse.response)?.body?.fawryReference;
    } catch (fawryErr: any) {
      rawResponse = JSON.stringify({ error: fawryErr?.message ?? "unknown" });
      paymentStatus = "Failed";
    }

    // ─── Payment failed → show retry modal (order stays PendingPayment) ────────
    if (paymentStatus === "Failed") {
      setPendingVisaOrderId(orderId);
      setPendingVisaOrderNumber(orderNumber);
      setPendingVisaAmount(parseFloat(String(total)));
      setPaymentRetryError(
        "فشلت عملية الدفع بالبطاقة. يمكنك إعادة المحاولة أو إلغاء الطلب.",
      );
      setPaymentRetryModalVisible(true);
      setStep("idle");
      return;
    }

    // ─── Payment succeeded → report Success to backend ─────────────────────────
    setStep("reporting_payment");
    try {
      const resultRes = await apiClient.post(
        `/api/pos/orders/${orderId}/payment-result`,
        {
          status: "Success",
          externalReference: fcrn ?? `FAWRY-${Date.now()}`,
          rawResponse,
        },
      );
      const resultStatus: string = resultRes.data?.data?.status ?? "";
      if (resultStatus === "Failed") {
        // Backend unexpectedly rejected the confirmation — allow retry
        setPendingVisaOrderId(orderId);
        setPendingVisaOrderNumber(orderNumber);
        setPendingVisaAmount(parseFloat(String(total)));
        setPaymentRetryError(
          resultRes.data?.messages?.[0] ||
            "رفض الخادم تأكيد الدفع. يمكنك إعادة المحاولة.",
        );
        setPaymentRetryModalVisible(true);
        setStep("idle");
        return;
      }
    } catch (err: any) {
      const httpStatus = err?.response?.status;
      if (httpStatus !== 409) {
        // 409 = reference already used but payment recorded → still proceed to generate
        setPendingVisaOrderId(orderId);
        setPendingVisaOrderNumber(orderNumber);
        setPendingVisaAmount(parseFloat(String(total)));
        setPaymentRetryError(parseApiError(err));
        setPaymentRetryModalVisible(true);
        setStep("idle");
        return;
      }
    }

    await generateReceipt(orderId);
  };

  const handleRetry = async () => {
    if (!pendingOrderId) return;
    setRetryModalVisible(false);
    await generateReceipt(pendingOrderId);
  };

  // ─── Retry Fawry payment on the existing pending order ──────────────────────
  const retryFawryPayment = async () => {
    if (!pendingVisaOrderId || !pendingVisaOrderNumber) return;
    setPaymentRetryModalVisible(false);
    setStep("fawry_payment");

    let fcrn: string | undefined;
    let rawResponse: string;
    let paymentStatus: "Success" | "Failed" = "Failed";

    try {
      const fawryResponse = await processCardPayment(
        pendingVisaAmount,
        pendingVisaOrderNumber,
        BTC_CODES.CARD_PAYMENT,
      );
      rawResponse = JSON.stringify(fawryResponse);
      paymentStatus = fawryResponse.status === "success" ? "Success" : "Failed";
      fcrn = JSON.parse(fawryResponse.response)?.body?.fawryReference;
    } catch (fawryErr: any) {
      rawResponse = JSON.stringify({ error: fawryErr?.message ?? "unknown" });
      paymentStatus = "Failed";
    }

    if (paymentStatus === "Failed") {
      setPaymentRetryError(
        "فشلت عملية الدفع مجدداً. تأكد من اتصال الجهاز وصلاحية البطاقة.",
      );
      setPaymentRetryModalVisible(true);
      setStep("idle");
      return;
    }

    // Payment succeeded — report to backend
    setStep("reporting_payment");
    const orderIdToGenerate = pendingVisaOrderId;
    try {
      const resultRes = await apiClient.post(
        `/api/pos/orders/${pendingVisaOrderId}/payment-result`,
        {
          status: "Success",
          externalReference: fcrn ?? `FAWRY-${Date.now()}`,
          rawResponse,
        },
      );
      const resultStatus: string = resultRes.data?.data?.status ?? "";
      if (resultStatus === "Failed") {
        setPaymentRetryError(
          resultRes.data?.messages?.[0] ||
            "رفض الخادم تأكيد الدفع. يمكنك إعادة المحاولة.",
        );
        setPaymentRetryModalVisible(true);
        setStep("idle");
        return;
      }
    } catch (err: any) {
      if (err?.response?.status !== 409) {
        setPaymentRetryError(parseApiError(err));
        setPaymentRetryModalVisible(true);
        setStep("idle");
        return;
      }
      // 409 = already recorded → proceed to generate
    }

    // Clear pending visa state then generate receipt
    setPendingVisaOrderId(null);
    setPendingVisaOrderNumber("");
    await generateReceipt(orderIdToGenerate);
  };

  // ─── Cancel pending payment: report Failed to backend and navigate away ─────
  const cancelPendingPayment = async () => {
    if (pendingVisaOrderId) {
      try {
        await apiClient.post(
          `/api/pos/orders/${pendingVisaOrderId}/payment-result`,
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
    setPendingVisaOrderId(null);
    setPendingVisaOrderNumber("");
    setStep("idle");
    router.replace("/(protected)/(tabs)/transactions");
  };

  const handlePreviewComplete = () => {
    setShowPreview(false);
    clearCart();
    Alert.alert("تم إتمام الطلب بنجاح!", "ماذا تريد أن تفعل الآن؟", [
      {
        text: "طلب جديد",
        onPress: () => router.replace("/(protected)/(tabs)/create-order"),
      },
      {
        text: "الإيصالات",
        onPress: () => router.replace("/(protected)/(tabs)/receipts"),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedView>
          <ThemedText type="title">الدفع</ThemedText>
          <ThemedText style={styles.subtitle}>أكمل عملية الدفع</ThemedText>
        </ThemedView>
        <TouchableOpacity onPress={() => router.back()} disabled={isProcessing}>
          <ThemedText
            style={[styles.backText, isProcessing && { opacity: 0.4 }]}
          >
            رجوع ←
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <Card style={styles.summaryCard}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            ملخص الطلب
          </ThemedText>
          <ThemedView style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>المجموع الفرعي:</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {subtotal ?? "0.00"} ج.م
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>الضريبة:</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {tax ?? "0.00"} ج.م
            </ThemedText>
          </ThemedView>
          <ThemedView style={[styles.summaryRow, styles.totalRow]}>
            <ThemedText type="subtitle" style={styles.totalLabel}>
              الإجمالي:
            </ThemedText>
            <ThemedText type="subtitle" style={styles.totalValue}>
              {total ?? "0.00"} ج.م
            </ThemedText>
          </ThemedView>
        </Card>

        {/* Payment Methods */}
        <Card style={styles.paymentCard}>
          <ThemedText style={styles.cardTitle}>طريقة الدفع</ThemedText>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              selectedPayment === "cash" && styles.selectedPayment,
            ]}
            onPress={() => setSelectedPayment("cash")}
            disabled={isProcessing}
          >
            <ThemedView style={styles.paymentContent}>
              <ThemedView style={styles.paymentIcon}>
                <ThemedText style={styles.iconText}>💵</ThemedText>
              </ThemedView>
              <ThemedView style={styles.paymentInfo}>
                <ThemedText style={styles.paymentMethodText}>
                  الدفع النقدي
                </ThemedText>
                <ThemedText style={styles.paymentDescription}>
                  نقداً عند الاستلام
                </ThemedText>
              </ThemedView>
            </ThemedView>
            {selectedPayment === "cash" && (
              <ThemedView style={styles.checkmarkContainer}>
                <ThemedText style={styles.checkmark}>✓</ThemedText>
              </ThemedView>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              selectedPayment === "visa" && styles.selectedPayment,
            ]}
            onPress={() => setSelectedPayment("visa")}
            disabled={isProcessing}
          >
            <ThemedView style={styles.paymentContent}>
              <ThemedView style={styles.paymentIcon}>
                <ThemedText style={styles.iconText}>💳</ThemedText>
              </ThemedView>
              <ThemedView style={styles.paymentInfo}>
                <ThemedText style={styles.paymentMethodText}>بطاقة</ThemedText>
                <ThemedText style={styles.paymentDescription}>
                  {isFawryConnected
                    ? "جهاز فوري متصل ✓"
                    : "يتطلب جهاز فوري POS"}
                </ThemedText>
              </ThemedView>
            </ThemedView>
            {selectedPayment === "visa" && (
              <ThemedView style={styles.checkmarkContainer}>
                <ThemedText style={styles.checkmark}>✓</ThemedText>
              </ThemedView>
            )}
          </TouchableOpacity>

          {selectedPayment === "visa" && !isFawryConnected && (
            <ThemedView style={styles.fawryWarning}>
              <ThemedText style={styles.fawryWarningText}>
                ⚠️ جهاز فوري غير متصل. يرجى الاتصال من إعدادات الجهاز قبل
                المتابعة.
              </ThemedText>
            </ThemedView>
          )}
        </Card>

        {/* Customer Info & Extra Discount */}
        <Card style={styles.customerCard}>
          <ThemedText style={styles.cardTitle}>معلومات العميل</ThemedText>
          <TextInput
            placeholder="اسم العميل (اختياري — سيُستخدم WALK-IN إذا تُرك فارغاً)"
            placeholderTextColor="#9ca3af"
            value={customerName}
            onChangeText={setCustomerName}
            style={styles.input}
            editable={!isProcessing}
          />
          <ThemedText style={styles.cardTitle}>خصم إضافي (ج.م)</ThemedText>
          <TextInput
            placeholder="0"
            placeholderTextColor="#9ca3af"
            value={extraDiscount}
            onChangeText={setExtraDiscount}
            keyboardType="numeric"
            style={styles.input}
            editable={!isProcessing}
          />
        </Card>

        <ThemedView style={{ height: 100 }} />
      </ScrollView>

      {/* Checkout Button */}
      <ThemedView style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.checkoutButton,
            isProcessing && styles.checkoutButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ThemedView style={styles.processingRow}>
              <ActivityIndicator size="small" color="#ffffff" />
              <ThemedText type="subtitle" style={styles.checkoutText}>
                {getStepLabel(step, selectedPayment)}
              </ThemedText>
            </ThemedView>
          ) : (
            <ThemedText type="subtitle" style={styles.checkoutText}>
              {getStepLabel(step, selectedPayment)}
            </ThemedText>
          )}
        </TouchableOpacity>
      </ThemedView>

      {createdOrder && (
        <ReceiptPreviewModal
          visible={showPreview}
          document={createdOrder}
          onClose={() => setShowPreview(false)}
          onComplete={handlePreviewComplete}
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
          <ThemedView style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>
              {generateRetryExpired
                ? "⏰ انتهت صلاحية الطلب"
                : "⚠️ فشل إنشاء الإيصال"}
            </ThemedText>
            <ThemedText style={styles.modalMessage}>{retryError}</ThemedText>
            <ThemedText style={styles.modalHint}>
              {generateRetryExpired
                ? "تم الدفع بنجاح لكن انتهت صلاحية الطلب. يرجى مراجعة المعاملات أو التواصل مع الدعم."
                : "الطلب تم إنشاؤه وتسجيل الدفع بنجاح. يمكنك إعادة المحاولة لإنشاء الإيصال."}
            </ThemedText>
            <ThemedView style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.supportButton]}
                onPress={() => {
                  setRetryModalVisible(false);
                  setStep("idle");
                  router.replace("/(protected)/(tabs)/transactions");
                }}
              >
                <ThemedText style={styles.supportButtonText}>
                  عرض المعاملات
                </ThemedText>
              </TouchableOpacity>
              {!generateRetryExpired && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.retryButton]}
                  onPress={handleRetry}
                >
                  <ThemedText style={styles.retryButtonText}>
                    إعادة المحاولة
                  </ThemedText>
                </TouchableOpacity>
              )}
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </Modal>

      {/* Payment Retry Modal — Fawry payment failed but order exists */}
      <Modal
        visible={paymentRetryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <ThemedView style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>
              💳 فشل الدفع بالبطاقة
            </ThemedText>
            <ThemedText style={styles.modalMessage}>
              {paymentRetryError}
            </ThemedText>
            {pendingVisaOrderNumber ? (
              <ThemedText style={styles.modalHint}>
                {`الطلب #${pendingVisaOrderNumber} تم إنشاؤه وهو في انتظار الدفع. يمكنك إعادة محاولة الدفع أو إلغاء الطلب.`}
              </ThemedText>
            ) : null}
            <ThemedView style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelPaymentButton]}
                onPress={cancelPendingPayment}
              >
                <ThemedText style={styles.cancelPaymentButtonText}>
                  إلغاء الطلب
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.retryButton]}
                onPress={retryFawryPayment}
              >
                <ThemedText style={styles.retryButtonText}>
                  إعادة الدفع
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
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  subtitle: { opacity: 0.6, marginTop: 2, fontSize: 13 },
  backText: { color: "#007AFF", fontWeight: "600", fontSize: 15 },
  content: { flex: 1, padding: 16 },
  summaryCard: {
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8eaed",
  },
  paymentCard: {
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8eaed",
  },
  customerCard: {
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8eaed",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#1f2937",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  summaryLabel: { fontSize: 14, color: "#6b7280" },
  summaryValue: { fontSize: 14, fontWeight: "500", color: "#1f2937" },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
    marginTop: 6,
  },
  totalLabel: { fontSize: 16, color: "#1f2937" },
  totalValue: { color: Colors.light.primary, fontSize: 17 },
  paymentOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#fafafa",
  },
  selectedPayment: { borderColor: "#007AFF", backgroundColor: "#e7f3ff" },
  paymentContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  paymentIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 20 },
  paymentInfo: { flex: 1 },
  paymentMethodText: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
    color: "#1f2937",
  },
  paymentDescription: { opacity: 0.6, fontSize: 12, color: "#6b7280" },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: { color: "#ffffff", fontSize: 14, fontWeight: "bold" },
  fawryWarning: {
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  fawryWarningText: { fontSize: 12, color: "#c2410c", textAlign: "right" },
  input: {
    marginBottom: 10,
    textAlign: "right",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    fontSize: 14,
    backgroundColor: "#fafafa",
    color: "#1f2937",
  },
  bottomBar: { padding: 16 },
  checkoutButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  checkoutButtonDisabled: { backgroundColor: "#93c5fd", opacity: 0.8 },
  checkoutText: { color: "#fff", fontSize: 15 },
  processingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  // Retry modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 20,
    width: "100%",
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
    color: "#1f2937",
  },
  modalMessage: {
    fontSize: 14,
    color: "#dc2626",
    textAlign: "center",
    marginBottom: 10,
  },
  modalHint: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 18,
  },
  modalButtons: { flexDirection: "row", gap: 10 },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  supportButton: { backgroundColor: "#f3f4f6" },
  supportButtonText: { color: "#374151", fontWeight: "600", fontSize: 14 },
  retryButton: { backgroundColor: "#007AFF" },
  retryButtonText: { color: "#ffffff", fontWeight: "600", fontSize: 14 },
  cancelPaymentButton: { backgroundColor: "#fee2e2" },
  cancelPaymentButtonText: {
    color: "#dc2626",
    fontWeight: "600",
    fontSize: 14,
  },
});
