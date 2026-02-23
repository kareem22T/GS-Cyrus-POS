"use client";

import {
  fetchReceiptById,
  getPaymentMethodLabel,
  getReceiptTypeBg,
  getReceiptTypeColor,
  getReceiptTypeLabel,
  PosReceipt,
  resolveReceiptType,
} from "@/lib/receipts-api";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ReceiptPreviewModal } from "../../../components/receipt-preview-modal";
import { Card } from "../../../components/ui/card";
import { ThemedText } from "../../../components/ui/themed-text";
import { ThemedView } from "../../../components/ui/themed-view";

function parseApiDate(dateString: string): Date {
  const normalized = dateString
    ?.replace(/(\.\d{3})\d+/, "$1")
    ?.replace(/(?<![Z]|[+-]\d{2}:?\d{2})$/, "Z");
  return new Date(normalized);
}

export default function ReceiptDetailsScreen() {
  const { receiptId } = useLocalSearchParams<{ receiptId: string }>();
  const [receipt, setReceipt] = useState<PosReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // determine whether this sale receipt has any items left that can be returned
  const hasReturnableItems = React.useMemo(() => {
    if (!receipt) return false;
    if (resolveReceiptType(receipt) !== "SR") return false;
    const lines = (receipt.lines as any[]) || (receipt as any).receiptItems;
    if (!Array.isArray(lines)) return false;
    return lines.some((l) => (l.remainingQuantity ?? 0) > 0);
  }, [receipt]);

  useEffect(() => {
    loadReceipt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiptId]);

  const loadReceipt = async () => {
    if (!receiptId) {
      setError("معرف الإيصال غير موجود");
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await fetchReceiptById(parseInt(receiptId, 10));
      if (!data) throw new Error("لم يتم العثور على الإيصال");
      setReceipt(data);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "فشل تحميل تفاصيل الإيصال");
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = () => {
    if (!receipt) return;
    router.push({
      pathname: "/(protected)/(tabs)/return-order",
      params: {
        receiptId: receipt.id.toString(),
        orderData: JSON.stringify(receipt),
      },
    });
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

  if (error || !receipt) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.centerContent}>
          <ThemedText style={styles.errorText}>
            {error || "لم يتم العثور على الإيصال"}
          </ThemedText>
          <TouchableOpacity onPress={loadReceipt} style={styles.retryButton}>
            <ThemedText style={styles.retryButtonText}>
              إعادة المحاولة
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedView style={styles.headerContent}>
          <ThemedView style={styles.headerTop}>
            <ThemedText type="subtitle">{receipt.receiptNumber}</ThemedText>
            <ThemedView
              style={[
                styles.typeBadge,
                {
                  backgroundColor: getReceiptTypeBg(
                    resolveReceiptType(receipt),
                  ),
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.typeBadgeText,
                  { color: getReceiptTypeColor(resolveReceiptType(receipt)) },
                ]}
              >
                {getReceiptTypeLabel(resolveReceiptType(receipt))}
              </ThemedText>
            </ThemedView>
          </ThemedView>
          <ThemedText style={styles.subtitle}>
            {formatDate(receipt.receiptDate)}
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
                {receipt.orderNumber}
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>العميلة</ThemedText>
              <ThemedText style={styles.infoValue} numberOfLines={1}>
                {receipt.customerName}
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.divider} />

          <ThemedView style={styles.detailsGrid}>
            <ThemedView style={styles.detailItem}>
              <ThemedText style={styles.detailLabel}>طريقة الدفع</ThemedText>
              <ThemedText style={styles.detailValue}>
                {getPaymentMethodLabel(receipt.paymentMethod)}
              </ThemedText>
            </ThemedView>
            {receipt.paymentReference && (
              <ThemedView style={styles.detailItem}>
                <ThemedText style={styles.detailLabel}>مرجع الدفع</ThemedText>
                <ThemedText style={styles.detailValue} numberOfLines={1}>
                  {receipt.paymentReference}
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>

          {receipt.notes && (
            <>
              <ThemedView style={styles.divider} />
              <ThemedText style={styles.notesLabel}>ملاحظات:</ThemedText>
              <ThemedText style={styles.notesValue}>{receipt.notes}</ThemedText>
            </>
          )}
        </Card>

        {/* Lines Card */}
        <Card style={styles.itemsCard}>
          <ThemedText style={styles.sectionTitle}>المنتجات</ThemedText>
          {receipt.lines?.map((line, i) => (
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
              {receipt.subtotal.toFixed(2)} ج.م
            </ThemedText>
          </ThemedView>
          {receipt.extraDiscount > 0 && (
            <ThemedView style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>خصم إضافي:</ThemedText>
              <ThemedText style={[styles.summaryValue, { color: "#059669" }]}>
                -{receipt.extraDiscount.toFixed(2)} ج.م
              </ThemedText>
            </ThemedView>
          )}
          <ThemedView style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>الضريبة:</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {receipt.taxAmount.toFixed(2)} ج.م
            </ThemedText>
          </ThemedView>
          <ThemedView style={[styles.summaryRow, styles.totalRow]}>
            <ThemedText type="subtitle" style={styles.totalLabel}>
              الإجمالي:
            </ThemedText>
            <ThemedText type="subtitle" style={styles.totalValue}>
              {receipt.totalAmount.toFixed(2)} ج.م
            </ThemedText>
          </ThemedView>
        </Card>

        {/* Actions */}
        <ThemedView style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.printButton}
            onPress={() => setShowPreview(true)}
          >
            <ThemedText style={styles.buttonText}>
              معاينة وطباعة الإيصال
            </ThemedText>
          </TouchableOpacity>

          {hasReturnableItems && (
            <TouchableOpacity
              style={styles.returnButton}
              onPress={handleReturn}
            >
              <ThemedText style={styles.buttonText}>إرجاع الطلب</ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>
      </ScrollView>

      <ReceiptPreviewModal
        visible={showPreview}
        document={receipt as any}
        onClose={() => setShowPreview(false)}
      />
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
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: "600" },
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
  printButton: {
    backgroundColor: "#10b981",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  returnButton: {
    backgroundColor: "#dc2626",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },

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
});
