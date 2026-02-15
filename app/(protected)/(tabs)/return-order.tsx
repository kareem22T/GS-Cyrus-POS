"use client";

import apiClient from "@/api/client";
import { Colors } from "@/constants/theme";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../../components/ui/card";
import { ThemedText } from "../../../components/ui/themed-text";
import { ThemedView } from "../../../components/ui/themed-view";

export default function ReturnOrderScreen() {
  const { orderData } = useLocalSearchParams<{ orderData: string }>();
  const document = orderData ? JSON.parse(orderData) : null;

  const [deviceId, setDeviceId] = useState<string>("");
  useEffect(() => {
    async function loadId() {
      const androidId = "2034082646";
      setDeviceId(androidId ?? "");
    }
    loadId();
  }, []);

  const [returnItems, setReturnItems] = useState<any[]>([]);
  useEffect(() => {
    if (document) {
      setReturnItems(
        (document.receiptItems || []).map((item: any) => ({
          lineId: item.id,
          productId: item.productId,
          productName: item.productName,
          originalQuantity: item.quantity,
          returnQuantity: 0,
          unitPrice: item.unitPrice,
          vat: item.vat,
          discountAmount: item.discountAmount,
          notes: item.notes || "",
        })),
      );
    }
  }, [orderData]);

  const [returnNotes, setReturnNotes] = useState("");
  const [processing, setProcessing] = useState(false);

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
      (s, it) => s + (it.vat / (it.originalQuantity || 1)) * it.returnQuantity,
      0,
    );
  const getReturnTotal = () => getReturnSubtotal() + getReturnTax();
  const hasItemsToReturn = () => returnItems.some((i) => i.returnQuantity > 0);

  const handleSubmitReturn = async () => {
    if (!hasItemsToReturn()) {
      Alert.alert("تنبيه", "الرجاء تحديد المنتجات المراد إرجاعها");
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
            setProcessing(true);
            try {
              const itemsPayload = returnItems
                .filter((it) => it.returnQuantity > 0)
                .map((it) => ({
                  originalDocumentLineId: it.lineId,
                  returnedQuantity: it.returnQuantity,
                }));

              const payload = {
                originalReceiptId: document.id,
                items: itemsPayload,
                notes: returnNotes || `إرجاع للطلب #${document.id}`,
                deviceSerial: deviceId || document.deviceSerial,
              };

              const res = await apiClient.post(
                "/api/receipts/returns",
                payload,
              );
              setProcessing(false);

              if (res.data?.succeeded) {
                Alert.alert(
                  "تم الإرجاع بنجاح",
                  res.data?.messages?.[0] || "تمت عملية الإرجاع",
                );
                router.push("/(protected)/(tabs)/orders");
              } else {
                console.warn("return failed", res.data);
                Alert.alert(
                  "فشل الإرجاع",
                  res.data?.messages?.[0] || "فشل في معالجة الإرجاع",
                );
              }
            } catch (err: any) {
              setProcessing(false);
              console.error("Return error", err?.response?.data ?? err);
              const serverMsg =
                err?.response?.data?.messages?.[0] ||
                err?.message ||
                "حدث خطأ أثناء الإرجاع";
              Alert.alert("فشل الإرجاع", serverMsg);
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

  if (processing) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={styles.processingText}>
          جاري معالجة الإرجاع...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
                      (item.vat / item.originalQuantity) * item.returnQuantity
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
          <ThemedText style={styles.submitButtonText}>
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
    fontWeight: "700",
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
});
