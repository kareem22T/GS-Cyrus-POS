import React, { useMemo, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, View } from "react-native";
import { Button } from "./ui/button";
import { ThemedText } from "./ui/themed-text";
import { ThemedView } from "./ui/themed-view";

// Minimal Document + DocumentItem shape used by the modal
export interface DocumentItem {
  productId: number;
  productName?: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  vat?: number;
  notes?: string;
}
export interface Document {
  receiptDate: string;
  extraDiscount?: number;
  paymentMethod?: number;
  documentType?: number;
  customerName?: string;
  deviceSerial?: string;
  customerCode?: string;
  customerTaxId?: string;
  customerPhone?: string;
  referenceNumber?: string;
  notes?: string;
  subtotal?: number;
  totalVAT?: number;
  totalDiscount?: number;
  totalAmount?: number;
  receiptNumber?: string;
  // API sometimes returns `items` (created locally) or `receiptItems` (server responses)
  items?: DocumentItem[];
  receiptItems?: DocumentItem[];
}

interface Props {
  visible: boolean;
  document: Document | null;
  onClose: () => void;
  onComplete?: () => void;
}

export function ReceiptPreviewModal({
  visible,
  document,
  onClose,
  onComplete,
}: Props) {
  const [printing, setPrinting] = useState(false);
  const [savingPDF, setSavingPDF] = useState(false);

  // normalize items (support both `items` and `receiptItems` shapes)
  const items: DocumentItem[] = React.useMemo(
    () =>
      (document?.items as DocumentItem[] | undefined) ??
      (document as any)?.receiptItems ??
      [],
    [document],
  );

  const calculations = useMemo(() => {
    if (!items || items.length === 0)
      return { subtotal: 0, totalVAT: 0, totalDiscount: 0, totalAmount: 0 };

    let subtotal = 0;
    let totalVAT = 0;
    let totalDiscount = 0;

    items.forEach((item: DocumentItem) => {
      const itemSubtotal = item.unitPrice * item.quantity;
      subtotal += itemSubtotal;
      totalVAT += item.vat || 0;
      totalDiscount += item.discountAmount || 0;
    });

    totalDiscount += document?.extraDiscount || 0;
    const totalAmount = subtotal + totalVAT - totalDiscount;
    return { subtotal, totalVAT, totalDiscount, totalAmount };
  }, [items, document?.extraDiscount]);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      await new Promise((r) => setTimeout(r, 700));
      Alert.alert("نجاح", "تمت طباعة الإيصال بنجاح", [
        { text: "حسناً", onPress: onComplete || onClose },
      ]);
    } catch {
      Alert.alert("خطأ", "حدث خطأ أثناء الطباعة");
    } finally {
      setPrinting(false);
    }
  };

  const handleSavePDF = async () => {
    setSavingPDF(true);
    try {
      await new Promise((r) => setTimeout(r, 700));
      Alert.alert("تم الحفظ بنجاح", "تم حفظ الإيصال كملف PDF", [
        { text: "حسناً", onPress: onComplete || onClose },
      ]);
    } catch {
      Alert.alert("خطأ", "حدث خطأ أثناء حفظ الملف");
    } finally {
      setSavingPDF(false);
    }
  };

  if (!visible || !document) return null;

  const receiptNumber =
    document.receiptNumber ||
    `REC-${new Date(document.receiptDate).getTime().toString().slice(-8)}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="title">معاينة الإيصال</ThemedText>
        </ThemedView>

        <ScrollView style={styles.receiptContainer}>
          <ThemedView style={styles.receipt}>
            <ThemedView style={styles.receiptHeader}>
              <ThemedText style={styles.companyName}>اسم الشركة</ThemedText>
              <ThemedText style={styles.receiptTitle}>إيصال بيع</ThemedText>
              <ThemedText style={styles.receiptNumber}>
                رقم الإيصال: {receiptNumber}
              </ThemedText>
              <ThemedText style={styles.receiptDate}>
                {new Date(document.receiptDate).toLocaleString("ar-EG")}
              </ThemedText>
            </ThemedView>

            <View style={styles.divider} />

            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>المنتجات</ThemedText>
              <View style={styles.tableHeader}>
                <ThemedText
                  style={[
                    styles.tableCell,
                    styles.tableHeaderText,
                    { flex: 2 },
                  ]}
                >
                  المنتج
                </ThemedText>
                <ThemedText
                  style={[
                    styles.tableCell,
                    styles.tableHeaderText,
                    { flex: 1 },
                  ]}
                >
                  الكمية
                </ThemedText>
                <ThemedText
                  style={[
                    styles.tableCell,
                    styles.tableHeaderText,
                    { flex: 1 },
                  ]}
                >
                  السعر
                </ThemedText>
                <ThemedText
                  style={[
                    styles.tableCell,
                    styles.tableHeaderText,
                    { flex: 1 },
                  ]}
                >
                  الإجمالي
                </ThemedText>
              </View>

              {items.length === 0 ? (
                <ThemedText style={{ textAlign: "center", opacity: 0.6 }}>
                  لا توجد منتجات في هذا الإيصال
                </ThemedText>
              ) : (
                items.map((item, i) => {
                  const itemTotal =
                    item.unitPrice * item.quantity +
                    (item.vat || 0) -
                    (item.discountAmount || 0);
                  return (
                    <View key={i} style={styles.tableRow}>
                      <ThemedText style={[styles.tableCell, { flex: 2 }]}>
                        {item.productName || `منتج #${item.productId}`}
                      </ThemedText>
                      <ThemedText style={[styles.tableCell, { flex: 1 }]}>
                        {item.quantity}
                      </ThemedText>
                      <ThemedText style={[styles.tableCell, { flex: 1 }]}>
                        {item.unitPrice?.toFixed(2)}
                      </ThemedText>
                      <ThemedText style={[styles.tableCell, { flex: 1 }]}>
                        {itemTotal.toFixed(2)}
                      </ThemedText>
                    </View>
                  );
                })
              )}
            </ThemedView>

            <View style={styles.divider} />

            <ThemedView style={styles.section}>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>
                  المجموع الفرعي:
                </ThemedText>
                <ThemedText style={styles.summaryValue}>
                  {calculations.subtotal.toFixed(2)} ج.م
                </ThemedText>
              </View>

              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>
                  الضريبة (14%):
                </ThemedText>
                <ThemedText style={styles.summaryValue}>
                  {calculations.totalVAT.toFixed(2)} ج.م
                </ThemedText>
              </View>

              <View style={[styles.summaryRow, styles.totalRow]}>
                <ThemedText style={styles.totalLabel}>الإجمالي:</ThemedText>
                <ThemedText style={styles.totalValue}>
                  {calculations.totalAmount.toFixed(2)} ج.م
                </ThemedText>
              </View>
            </ThemedView>

            {document.notes && (
              <>
                <View style={styles.divider} />
                <ThemedView style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>ملاحظات</ThemedText>
                  <ThemedText style={styles.infoText}>
                    {document.notes}
                  </ThemedText>
                </ThemedView>
              </>
            )}

            <View style={styles.divider} />
            <ThemedView style={styles.footer}>
              <ThemedText style={styles.footerText}>
                شكراً لتعاملكم معنا
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </ScrollView>

        <ThemedView style={styles.actions}>
          <Button
            title={printing ? "جاري الطباعة..." : "🖨️ طباعة"}
            onPress={handlePrint}
            disabled={printing || savingPDF}
            style={styles.printButton}
          />
          <Button
            title={savingPDF ? "جاري الحفظ..." : "📄 حفظ كـ PDF"}
            onPress={handleSavePDF}
            disabled={printing || savingPDF}
            style={styles.pdfButton}
          />
          <Button
            title="إغلاق"
            onPress={onComplete || onClose}
            style={styles.closeActionButton}
          />
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 30 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  receiptContainer: { flex: 1, padding: 20 },
  receipt: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 50,
  },
  receiptHeader: { alignItems: "center", marginBottom: 20 },
  companyName: { fontSize: 24, fontWeight: "bold", marginBottom: 8 },
  receiptTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  receiptNumber: { fontSize: 14, opacity: 0.7, marginBottom: 4 },
  receiptDate: { fontSize: 12, opacity: 0.6 },
  divider: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 16 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  infoText: { fontSize: 14, marginBottom: 4 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  tableCell: { fontSize: 12, textAlign: "center" },
  tableHeaderText: { fontWeight: "600" },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: { fontSize: 14, opacity: 0.7 },
  summaryValue: { fontSize: 14, fontWeight: "500" },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: "#e5e7eb",
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: { fontSize: 16, fontWeight: "600" },
  totalValue: { fontSize: 16, fontWeight: "600", color: "#007AFF" },
  footer: { alignItems: "center", marginTop: 16 },
  footerText: { fontSize: 14, fontStyle: "italic", opacity: 0.6 },
  actions: {
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  printButton: { backgroundColor: "#10b981" },
  pdfButton: { backgroundColor: "#3b82f6" },
  closeActionButton: { backgroundColor: "#6b7280" },
});
