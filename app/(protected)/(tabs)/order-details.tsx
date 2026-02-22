"use client";

import {
  fetchDocumentById,
  getDocumentTypeLabel,
  getPaymentMethodLabel,
} from "@/lib/document-api";
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

export default function OrderDetailsScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [document, setDocument] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
    if (!orderId) {
      setError("معرف الطلب غير موجود");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await fetchDocumentById(parseInt(orderId, 10));
      setDocument(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل تفاصيل الطلب");
    } finally {
      setLoading(false);
    }
  };

  const handleShowReceipt = () => setShowPreview(true);

  const handleReturnOrder = () => {
    if (!document) return;
    router.push({
      pathname: "/(protected)/(tabs)/return-order",
      params: {
        orderId: document.id.toString(),
        orderData: JSON.stringify(document),
      },
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

  if (error || !document) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.centerContent}>
          <ThemedText style={styles.errorText}>
            خطأ: {error || "لم يتم العثور على الطلب"}
          </ThemedText>
          <TouchableOpacity
            onPress={loadOrderDetails}
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
    <SafeAreaView style={styles.container}>
      {/* Compact Header */}
      <ThemedView style={styles.header}>
        <ThemedView style={styles.headerContent}>
          <ThemedView style={styles.headerTop}>
            <ThemedText type="title">طلب #{document.id}</ThemedText>
            <ThemedView style={styles.typeBadge}>
              <ThemedText style={styles.typeBadgeText}>
                {getDocumentTypeLabel(document.documentType)}
              </ThemedText>
            </ThemedView>
          </ThemedView>
          <ThemedText style={styles.subtitle}>
            {formatDate(document.receiptDate)}
          </ThemedText>
        </ThemedView>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={styles.backText}>رجوع ←</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Compact Info Card */}
        <Card style={styles.infoCard}>
          <ThemedView style={styles.infoGrid}>
            <ThemedView style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>رقم الإيصال</ThemedText>
              <ThemedText style={styles.infoValue}>
                {document.receiptNumber}
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>المرجع</ThemedText>
              <ThemedText style={styles.infoValue} numberOfLines={1}>
                {document.referenceNumber}
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.divider} />

          <ThemedView style={styles.detailsGrid}>
            <ThemedView style={styles.detailItem}>
              <ThemedText style={styles.detailLabel}>العميل</ThemedText>
              <ThemedText style={styles.detailValue} numberOfLines={1}>
                {document.customerName || document.customerCode}
              </ThemedText>
            </ThemedView>

            {document.customerPhone && (
              <ThemedView style={styles.detailItem}>
                <ThemedText style={styles.detailLabel}>الهاتف</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {document.customerPhone}
                </ThemedText>
              </ThemedView>
            )}

            <ThemedView style={styles.detailItem}>
              <ThemedText style={styles.detailLabel}>الدفع</ThemedText>
              <ThemedText style={styles.detailValue}>
                {getPaymentMethodLabel(document.paymentMethod)}
              </ThemedText>
            </ThemedView>
          </ThemedView>

          {document.notes && (
            <>
              <ThemedView style={styles.divider} />
              <ThemedView style={styles.notesSection}>
                <ThemedText style={styles.notesLabel}>ملاحظات:</ThemedText>
                <ThemedText style={styles.notesValue}>
                  {document.notes}
                </ThemedText>
              </ThemedView>
            </>
          )}
        </Card>

        {/* Compact Items Card */}
        <Card style={styles.itemsCard}>
          <ThemedText style={styles.sectionTitle}>المنتجات</ThemedText>

          {document.receiptItems?.map((item: any, index: number) => (
            <ThemedView key={index} style={styles.itemRow}>
              <ThemedView style={styles.itemMain}>
                <ThemedText style={styles.itemName} numberOfLines={1}>
                  {item.productName}
                </ThemedText>
                <ThemedView style={styles.itemMetaRow}>
                  <ThemedText style={styles.itemMeta}>
                    {item.quantity} × {item.unitPrice.toFixed(2)}
                  </ThemedText>
                  {item.vat > 0 && (
                    <ThemedText style={styles.itemVat}>
                      ض: {item.vat.toFixed(2)}
                    </ThemedText>
                  )}
                  {item.discountAmount > 0 && (
                    <ThemedText style={styles.itemDiscount}>
                      خصم: {item.discountAmount.toFixed(2)}
                    </ThemedText>
                  )}
                </ThemedView>
                {item.notes && (
                  <ThemedText style={styles.itemNotes} numberOfLines={1}>
                    {item.notes}
                  </ThemedText>
                )}
              </ThemedView>
              <ThemedText style={styles.itemTotal}>
                {(
                  item.unitPrice * item.quantity +
                  item.vat -
                  item.discountAmount
                ).toFixed(2)}
              </ThemedText>
            </ThemedView>
          ))}
        </Card>

        {/* Compact Summary Card */}
        <Card style={styles.summaryCard}>
          <ThemedText style={styles.sectionTitle}>ملخص المبلغ</ThemedText>

          <ThemedView style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>المجموع الفرعي:</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {document.subtotal.toFixed(2)} ج.م
            </ThemedText>
          </ThemedView>

          {document.totalDiscount > 0 && (
            <ThemedView style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>الخصم:</ThemedText>
              <ThemedText style={[styles.summaryValue, styles.discountValue]}>
                -{document.totalDiscount.toFixed(2)} ج.م
              </ThemedText>
            </ThemedView>
          )}

          <ThemedView style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>الضريبة (14%):</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {document.totalVAT.toFixed(2)} ج.م
            </ThemedText>
          </ThemedView>

          <ThemedView style={[styles.summaryRow, styles.totalRow]}>
            <ThemedText type="subtitle" style={styles.totalLabel}>
              الإجمالي:
            </ThemedText>
            <ThemedText type="subtitle" style={styles.totalValue}>
              {document.totalAmount.toFixed(2)} ج.م
            </ThemedText>
          </ThemedView>
        </Card>

        {/* Compact Action Buttons */}
        <ThemedView style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.printButton}
            onPress={handleShowReceipt}
          >
            <ThemedText type="subtitle" style={styles.buttonText}>
              معاينة الإيصال
            </ThemedText>
          </TouchableOpacity>

          {document.documentType === 3 && (
            <TouchableOpacity
              style={styles.returnButton}
              onPress={handleReturnOrder}
            >
              <ThemedText type="subtitle" style={styles.buttonText}>
                إرجاع الطلب
              </ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>
      </ScrollView>

      <ReceiptPreviewModal
        visible={showPreview}
        document={document as any}
        onClose={() => setShowPreview(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, direction: "rtl", backgroundColor: "#f8f9fa" },

  // Compact Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 0,
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
  typeBadge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: { color: "#1e40af", fontSize: 11, fontWeight: "600" },
  subtitle: { opacity: 0.6, fontSize: 12, marginTop: 2 },
  backText: { color: "#007AFF", fontWeight: "600", fontSize: 14 },

  content: { flex: 1, padding: 12 },

  // Compact Info Card
  infoCard: {
    marginBottom: 10,
    padding: 12,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8eaed",
  },
  infoGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 11, opacity: 0.6, marginBottom: 3 },
  infoValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1f2937",
    fontFamily: "monospace",
  },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 10 },

  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  detailItem: { flex: 1, minWidth: "45%" },
  detailLabel: { fontSize: 11, opacity: 0.6, marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: "500", color: "#1f2937" },

  notesSection: { gap: 4 },
  notesLabel: { fontSize: 11, opacity: 0.6, fontWeight: "600" },
  notesValue: {
    fontSize: 12,
    opacity: 0.7,
    fontStyle: "italic",
    lineHeight: 16,
  },

  // Compact Items Card
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
  itemVat: {
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
  itemNotes: {
    fontSize: 11,
    fontStyle: "italic",
    opacity: 0.5,
    marginTop: 2,
  },
  itemTotal: {
    fontWeight: "700",
    fontSize: 14,
    color: "#007AFF",
    minWidth: 60,
    textAlign: "left",
  },

  // Compact Summary Card
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
  discountValue: { color: "#059669" },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: { fontSize: 15, color: "#1f2937" },
  totalValue: { fontSize: 16, color: "#007AFF" },

  // Compact Action Buttons
  actionsContainer: {
    gap: 8,
    marginBottom: 10,
  },
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
  buttonText: {
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
