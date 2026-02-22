import apiClient from "@/api/client";
import { Colors } from "@/constants/theme";
import { useFawryPayment } from "@/hooks/useFawryPayment";
import { useCartStore } from "@/store/slices/cart.slice";
import { useFawryStore } from "@/store/slices/fawry.slice";
import { AxiosError } from "axios";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  I18nManager,
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

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function CheckoutScreen() {
  const cart = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.getSubtotal)();
  const tax = useCartStore((s) => s.getTax)();
  const total = useCartStore((s) => s.getTotal)();
  const clearCart = useCartStore((s) => s.clearCart);

  const [selectedPayment, setSelectedPayment] = useState<
    "cash" | "visa" | null
  >(null);
  const [processing, setProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [createdDocument, setCreatedDocument] = useState<any | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [deviceId] = useState<string>("2034082646");

  // ✅ Read connection state from the global Zustand store — same instance as FawryAutoConnect & Settings
  const isFawryConnected = useFawryStore((s) => s.isConnected);

  // useFawryPayment is only used here for its processCardPayment method
  const { isLoading: isFawryLoading, processCardPayment } = useFawryPayment();

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

    setProcessing(true);

    try {
      // 1️⃣ Create the order in the backend
      const now = new Date();
      const pad = (v: number, len = 2) => String(v).padStart(len, "0");
      const receiptDateLocal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${String(now.getMilliseconds()).padStart(3, "0")}`;

      const payload: any = {
        deviceSerial: deviceId,
        receiptDate: receiptDateLocal,
        customerName: customerName || "WALK-IN",
        items: cart.map((item: any) => ({
          productId: parseInt(item.product.id, 10),
          quantity: item.quantity,
          unitPrice: item.product.price,
          lineDiscount: 0,
        })),
        extraDiscount: 0,
        paymentMethod: selectedPayment === "cash" ? 0 : 1,
      };

      const res = await apiClient.post("/api/receipts", payload);

      if (!res.data?.succeeded || !res.data?.data) {
        console.warn("create receipt failed", res.data);
        Alert.alert("خطأ", "فشل في إنشاء الطلب");
        setProcessing(false);
        return;
      }

      const document = res.data.data;
      const receiptNumber: string = String(
        document?.receiptNumber || document?.id || `ORD-${Date.now()}`,
      );
      setCreatedDocument(document);

      // 2️⃣ If visa: trigger Fawry card payment using receipt number as order ref
      if (selectedPayment === "visa") {
        try {
          const fawryResponse = await processCardPayment(
            parseFloat(String(total)),
            receiptNumber,
            BTC_CODES.CARD_PAYMENT,
          );

          if (fawryResponse.status === "success") {
            const fcrn = fawryResponse.fcrn
              ? `\nFCRN: ${fawryResponse.fcrn}`
              : "";
            Alert.alert(
              "تم الدفع بالبطاقة",
              `تم الدفع بنجاح!\nرقم الإيصال: ${receiptNumber}${fcrn}`,
            );
          } else {
            Alert.alert(
              "تحذير",
              "تم إنشاء الطلب لكن فشلت عملية الدفع بالبطاقة. يرجى التحقق من جهاز فوري.",
            );
          }
        } catch (fawryErr: any) {
          Alert.alert(
            "تحذير",
            `تم إنشاء الطلب لكن فشلت عملية الدفع بالبطاقة:\n${fawryErr?.message || "خطأ غير معروف"}`,
          );
        }
      } else {
        const msg = res.data?.messages?.[0] || "تم إنشاء الإيصال";
        Alert.alert("تم إنشاء الإيصال", `${msg}\nرقم: ${receiptNumber}`);
      }

      setProcessing(false);
      setShowPreview(true);
    } catch (err: any) {
      setProcessing(false);

      const axiosErr = err as AxiosError;
      const status = axiosErr?.response?.status;
      const raw = axiosErr?.response?.data as any;
      const serverMessage =
        raw?.message ||
        (Array.isArray(raw?.messages) && raw.messages[0]) ||
        raw?.error ||
        (typeof raw === "string" ? raw : undefined) ||
        axiosErr?.message ||
        "حدث خطأ أثناء معالجة الطلب";

      console.error("Checkout error", {
        status,
        data: raw,
        serverMessage,
        err,
      });
      Alert.alert("فشل في إتمام الطلب", serverMessage);
    }
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
        text: "لوحة التحكم",
        onPress: () => router.replace("/(protected)/(tabs)/pos"),
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
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={styles.backText}>رجوع ←</ThemedText>
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
            <ThemedText style={styles.summaryLabel}>الضريبة (14%):</ThemedText>
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
          >
            <ThemedView style={styles.paymentContent}>
              <ThemedView style={styles.paymentIcon}>
                <ThemedText style={styles.iconText}>💳</ThemedText>
              </ThemedView>
              <ThemedView style={styles.paymentInfo}>
                <ThemedText style={styles.paymentMethodText}>
                  بطاقة فيزا
                </ThemedText>
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

        {/* Customer Info */}
        <Card style={styles.customerCard}>
          <ThemedText style={styles.cardTitle}>معلومات العميل</ThemedText>
          <TextInput
            placeholder="اسم العميل"
            placeholderTextColor="#9ca3af"
            value={customerName}
            onChangeText={setCustomerName}
            style={styles.input}
          />
          <ThemedText style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
            يمكنك ترك الاسم فارغًا لاستخدام WALK-IN
          </ThemedText>
        </Card>

        <ThemedView style={{ height: 100 }} />
      </ScrollView>

      {/* Checkout Button */}
      <ThemedView style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.checkoutButton,
            (processing || isFawryLoading) && styles.checkoutButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={processing || isFawryLoading}
        >
          <ThemedText type="subtitle" style={styles.checkoutText}>
            {processing
              ? selectedPayment === "visa"
                ? "جارٍ الدفع بالبطاقة..."
                : "جاري المعالجة..."
              : "إتمام الطلب ومعاينة الإيصال"}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {createdDocument && (
        <ReceiptPreviewModal
          visible={showPreview}
          document={createdDocument as any}
          onClose={() => setShowPreview(false)}
          onComplete={handlePreviewComplete}
        />
      )}
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
  cardTitle: { fontSize: 16, marginBottom: 8, color: "#1f2937" },
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
  checkoutButtonDisabled: { backgroundColor: "#93c5fd", opacity: 0.7 },
  checkoutText: { color: "#fff", fontSize: 15 },
});
