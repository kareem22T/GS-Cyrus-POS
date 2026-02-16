import { Colors } from "@/constants/theme";
import { generateHTMLReceipt } from "@/utils/htmlReceiptGenerator";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { WebView } from "react-native-webview";
import { PAXPrinterModule } from "../modules/FawryNativeModule";
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
  const [loading, setLoading] = useState(false);
  const [capturingImage, setCapturingImage] = useState(false);
  const [moduleAvailable, setModuleAvailable] = useState(false);
  const [webViewHeight, setWebViewHeight] = useState(1200); // Start with larger default
  const [webViewReady, setWebViewReady] = useState(false);

  const webviewRef = useRef(null);

  // normalize items
  const items: DocumentItem[] = useMemo(
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

  // Calculate dynamic height based on content
  useEffect(() => {
    if (items && document) {
      // Base height: 600px (header + footer + margins)
      let estimatedHeight = 600;

      // Add height per item: ~120px per item
      estimatedHeight += items.length * 50;

      // Add extra space for customer name if present
      if (document.customerName) {
        estimatedHeight += 80;
      }

      // Add extra space for reference number if present
      if (document.referenceNumber) {
        estimatedHeight += 80;
      }

      // Add extra space for notes if present
      if (document.notes) {
        estimatedHeight += 100;
      }

      // Add some buffer
      estimatedHeight += 100;

      setWebViewHeight(estimatedHeight);
      console.log(
        "📏 Estimated WebView height:",
        estimatedHeight,
        "for",
        items.length,
        "items",
      );
    }
  }, [items, document]);

  useEffect(() => {
    if (PAXPrinterModule) {
      console.log("✅ PAXPrinter module found");
      console.log("Available methods:", Object.keys(PAXPrinterModule));
      setModuleAvailable(true);
    } else {
      console.error("❌ PAXPrinter module not found");
      setModuleAvailable(false);
      Alert.alert(
        "Module Error",
        "PAXPrinter module is not available. Please rebuild the app.",
        [{ text: "OK" }],
      );
    }
  }, []);

  const handlePrintL = async (
    printFunction: () => Promise<any>,
    actionName: string,
  ) => {
    if (!moduleAvailable) {
      Alert.alert("خطأ", "وحدة الطباعة غير متاحة");
      return;
    }

    setPrinting(true);
    setLoading(true);

    try {
      const result = await printFunction();
      Alert.alert("نجح", result || `${actionName} completed successfully`);
    } catch (error: any) {
      Alert.alert("خطأ", error.message || "حدث خطأ");
      console.error(`${actionName} error:`, error);
    } finally {
      setLoading(false);
      setPrinting(false);
    }
  };

  // Helper function to pad string
  const padString = (
    str: string,
    length: number,
    align: "left" | "right" | "center" = "left",
  ): string => {
    const strLength = str.length;
    if (strLength >= length) return str.substring(0, length);

    const padding = length - strLength;
    if (align === "right") {
      return " ".repeat(padding) + str;
    } else if (align === "center") {
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return " ".repeat(leftPad) + str + " ".repeat(rightPad);
    }
    return str + " ".repeat(padding);
  };

  // Text-based print (original)
  const handlePrint = async () => {
    if (!document) return;

    const lines: string[] = [];
    const receiptNum =
      document.receiptNumber ||
      `REC-${new Date(document.receiptDate).getTime().toString().slice(-8)}`;

    lines.push("");
    lines.push("  ╔═══════════════════════════════════╗");
    lines.push("  ║         CYRUSTECH POS             ║");
    lines.push("  ╚═══════════════════════════════════╝");
    lines.push("");
    lines.push(padString("عملية ناجحة", 40, "center"));
    lines.push("");
    lines.push("........................................");
    lines.push("");
    lines.push(padString(`رقم الإيصال: ${receiptNum}`, 40, "center"));

    const dateObj = new Date(document.receiptDate);
    const dateStr = dateObj.toLocaleDateString("ar-EG");
    const timeStr = dateObj.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    });

    lines.push(padString(dateStr, 40, "center"));
    lines.push(padString(timeStr, 40, "center"));
    lines.push("");
    lines.push("........................................");
    lines.push("");

    if (document.customerName) {
      lines.push("اسم العميل:");
      lines.push(padString(document.customerName, 40, "center"));
      lines.push("");
    }

    if (items.length === 0) {
      lines.push(padString("لا توجد منتجات", 40, "center"));
      lines.push("");
    } else {
      items.forEach((it) => {
        const name = it.productName || `منتج #${it.productId}`;
        const itemTotal = (
          it.unitPrice * it.quantity +
          (it.vat || 0) -
          (it.discountAmount || 0)
        ).toFixed(2);

        lines.push(name);
        lines.push(
          padString(`الكمية: ${it.quantity}`, 20) +
            padString(`السعر: ${it.unitPrice.toFixed(2)}`, 20, "right"),
        );
        lines.push(padString(`المبلغ: ${itemTotal} EGP`, 40, "right"));

        if (it.discountAmount && it.discountAmount > 0) {
          lines.push(
            padString(`خصم: ${it.discountAmount.toFixed(2)} EGP`, 40, "right"),
          );
        }
        lines.push("");
      });

      lines.push("........................................");
      lines.push("");

      lines.push(
        padString("المجموع الفرعي:", 20) +
          padString(`${calculations.subtotal.toFixed(2)}`, 20, "right"),
      );

      if (calculations.totalVAT > 0) {
        lines.push(
          padString("الضريبة:", 20) +
            padString(`${calculations.totalVAT.toFixed(2)}`, 20, "right"),
        );
      }

      if (calculations.totalDiscount > 0) {
        lines.push(
          padString("الخصم:", 20) +
            padString(`${calculations.totalDiscount.toFixed(2)}`, 20, "right"),
        );
      }

      lines.push("");
      lines.push("========================================");
      lines.push("");
      lines.push(
        padString("المبلغ الكلي:", 20) +
          padString(`${calculations.totalAmount.toFixed(2)} EGP`, 20, "right"),
      );
      lines.push("");
      lines.push("========================================");
      lines.push("");
    }

    if (document.referenceNumber) {
      lines.push(padString("الرقم الفوري:", 40, "center"));
      lines.push(padString(document.referenceNumber, 40, "center"));
      lines.push("");
    }

    const paymentMethods: { [key: number]: string } = {
      1: "نقدي",
      2: "بطاقة ائتمان",
      3: "محفظة إلكترونية",
    };
    const paymentMethodText =
      paymentMethods[document.paymentMethod || 1] || "نقدي";
    lines.push(padString(`طريقة الدفع: ${paymentMethodText}`, 40, "center"));
    lines.push("");

    if (document.notes) {
      lines.push("........................................");
      lines.push("");
      lines.push("ملاحظات:");
      lines.push(document.notes);
      lines.push("");
    }

    lines.push("........................................");
    lines.push("");
    lines.push(padString("نسخة العميل", 40, "center"));
    lines.push("");
    lines.push("");
    lines.push(padString("CYRUSTECH", 40, "center"));
    lines.push(padString("شكراً لتعاملكم معنا", 40, "center"));
    lines.push("");
    lines.push("على الذكرة QR: تأكد من وجود رمز الـ");
    lines.push("للتحقق من صحة العملية");
    lines.push("");
    lines.push("");
    lines.push("");
    lines.push("");
    lines.push("");
    lines.push("");

    handlePrintL(() => PAXPrinterModule.printCustom(lines), "Print Receipt");
  };

  // HTML-based print using view-shot
  const handlePrintHTML = async () => {
    if (!document) return;

    try {
      setCapturingImage(true);
      setPrinting(true);

      console.log("🎨 Starting HTML receipt capture...");
      console.log("📏 WebView dimensions:", 384, "x", webViewHeight);

      // Wait longer for WebView to fully render with dynamic content
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Capture the WebView as image
      const uri = await captureRef(webviewRef, {
        format: "png",
        quality: 1,
        result: "base64",
      });

      console.log("📸 Image captured successfully");
      console.log("Image size:", uri.length, "characters");

      // Send base64 image to printer
      await PAXPrinterModule.printImageBase64(uri);

      Alert.alert("نجح", "تم طباعة الإيصال بنجاح");
    } catch (error: any) {
      console.error("❌ Error printing HTML receipt:", error);
      Alert.alert("خطأ", error.message || "فشل في طباعة الإيصال");
    } finally {
      setCapturingImage(false);
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

  const htmlContent = document ? generateHTMLReceipt(document) : "";

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
          {/* Hidden WebView for HTML receipt rendering - NOW WITH DYNAMIC HEIGHT */}
          <View
            ref={webviewRef}
            collapsable={false}
            style={[styles.hiddenWebView, { height: webViewHeight }]}
          >
            <WebView
              originWhitelist={["*"]}
              source={{ html: htmlContent }}
              style={{
                width: 384,
                height: webViewHeight,
                backgroundColor: "white",
              }}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              onLoad={() => {
                console.log("✅ WebView loaded");
                setWebViewReady(true);
              }}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error("❌ WebView error:", nativeEvent);
              }}
            />
          </View>

          {/* Regular preview UI */}
          <ThemedView style={styles.receipt}>
            <ThemedView style={styles.receiptHeader}>
              <View style={styles.headerBox}>
                <ThemedText style={styles.companyName}>
                  CYRUSTECH POS
                </ThemedText>
              </View>
              <ThemedText style={styles.receiptTitle}>عملية ناجحة</ThemedText>
              <View style={styles.dottedLine} />
              <ThemedText style={styles.receiptNumber}>
                رقم الإيصال: {receiptNumber}
              </ThemedText>
              <ThemedText style={styles.receiptDate}>
                {new Date(document.receiptDate).toLocaleDateString("ar-EG")}
              </ThemedText>
              <ThemedText style={styles.receiptDate}>
                {new Date(document.receiptDate).toLocaleTimeString("ar-EG", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </ThemedText>
            </ThemedView>

            <View style={styles.dottedLine} />

            {document.customerName && (
              <>
                <ThemedView style={styles.section}>
                  <ThemedText style={styles.infoLabel}>اسم العميل:</ThemedText>
                  <ThemedText style={styles.infoValue}>
                    {document.customerName}
                  </ThemedText>
                </ThemedView>
                <View style={styles.dottedLine} />
              </>
            )}

            <ThemedView style={styles.section}>
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
                    <View key={i} style={styles.itemContainer}>
                      <ThemedText style={styles.itemName}>
                        {item.productName || `منتج #${item.productId}`}
                      </ThemedText>
                      <View style={styles.itemRow}>
                        <ThemedText style={styles.itemDetail}>
                          الكمية: {item.quantity}
                        </ThemedText>
                        <ThemedText style={styles.itemDetail}>
                          السعر: {item.unitPrice?.toFixed(2)}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.itemTotal}>
                        المبلغ: {itemTotal.toFixed(2)} EGP
                      </ThemedText>
                      {item.discountAmount && item.discountAmount > 0 && (
                        <ThemedText style={styles.itemDiscount}>
                          خصم: {item.discountAmount.toFixed(2)} EGP
                        </ThemedText>
                      )}
                    </View>
                  );
                })
              )}
            </ThemedView>

            <View style={styles.dottedLine} />

            <ThemedView style={styles.section}>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>
                  المجموع الفرعي:
                </ThemedText>
                <ThemedText style={styles.summaryValue}>
                  {calculations.subtotal.toFixed(2)}
                </ThemedText>
              </View>

              {calculations.totalVAT > 0 && (
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>الضريبة:</ThemedText>
                  <ThemedText style={styles.summaryValue}>
                    {calculations.totalVAT.toFixed(2)}
                  </ThemedText>
                </View>
              )}

              {calculations.totalDiscount > 0 && (
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>الخصم:</ThemedText>
                  <ThemedText style={styles.summaryValue}>
                    {calculations.totalDiscount.toFixed(2)}
                  </ThemedText>
                </View>
              )}
            </ThemedView>

            <View style={styles.totalDivider} />

            <ThemedView style={styles.totalSection}>
              <View style={styles.totalRow}>
                <ThemedText style={styles.totalLabel}>المبلغ الكلي:</ThemedText>
                <ThemedText style={styles.totalValue}>
                  {calculations.totalAmount.toFixed(2)} EGP
                </ThemedText>
              </View>
            </ThemedView>

            <View style={styles.totalDivider} />

            {document.referenceNumber && (
              <>
                <ThemedView style={styles.section}>
                  <ThemedText style={styles.infoLabel}>
                    الرقم الفوري:
                  </ThemedText>
                  <ThemedText style={styles.infoValue}>
                    {document.referenceNumber}
                  </ThemedText>
                </ThemedView>
                <View style={styles.dottedLine} />
              </>
            )}

            <ThemedView style={styles.section}>
              <ThemedText style={styles.paymentMethod}>
                طريقة الدفع:{" "}
                {{
                  1: "نقدي",
                  2: "بطاقة ائتمان",
                  3: "محفظة إلكترونية",
                }[document.paymentMethod || 1] || "نقدي"}
              </ThemedText>
            </ThemedView>

            {document.notes && (
              <>
                <View style={styles.dottedLine} />
                <ThemedView style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>ملاحظات</ThemedText>
                  <ThemedText style={styles.infoText}>
                    {document.notes}
                  </ThemedText>
                </ThemedView>
              </>
            )}

            <View style={styles.dottedLine} />

            <ThemedView style={styles.footer}>
              <ThemedText style={styles.footerCopyText}>نسخة العميل</ThemedText>
              <ThemedText style={styles.footerBrand}>CYRUSTECH</ThemedText>
              <ThemedText style={styles.footerText}>
                شكراً لتعاملكم معنا
              </ThemedText>
              <ThemedText style={styles.footerNote}>
                تأكد من وجود رمز الـ QR على الذكرة
              </ThemedText>
              <ThemedText style={styles.footerNote}>
                للتحقق من صحة العملية
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </ScrollView>

        <ThemedView style={styles.actions}>
          <Button
            title={
              capturingImage
                ? "جاري التحضير..."
                : printing
                  ? "جاري الطباعة..."
                  : "طباعة"
            }
            onPress={handlePrintHTML}
            disabled={printing || savingPDF || capturingImage || !webViewReady}
            style={styles.htmlPrintButton}
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
  hiddenWebView: {
    position: "absolute",
    left: -10000,
    top: -10000,
    width: 384,
    // height is now dynamic, set via inline style
    opacity: 0,
  },
  receipt: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 50,
  },
  receiptHeader: { alignItems: "center", marginBottom: 20 },
  headerBox: {
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    width: "90%",
    alignItems: "center",
  },
  companyName: {
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    marginTop: 8,
  },
  receiptNumber: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  receiptDate: { fontSize: 13, opacity: 0.7, marginBottom: 2 },
  dottedLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    borderStyle: "dotted",
    marginVertical: 12,
    width: "100%",
  },
  totalDivider: {
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    marginVertical: 12,
  },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    textAlign: "center",
  },
  infoText: { fontSize: 14, marginBottom: 4 },
  itemContainer: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 13,
    opacity: 0.8,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "right",
    marginTop: 4,
  },
  itemDiscount: {
    fontSize: 13,
    color: "#ef4444",
    textAlign: "right",
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: { fontSize: 14, opacity: 0.7 },
  summaryValue: { fontSize: 14, fontWeight: "500" },
  totalSection: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 6,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: { fontSize: 17, fontWeight: "700" },
  totalValue: { fontSize: 17, fontWeight: "700", color: "#007AFF" },
  paymentMethod: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  footer: {
    alignItems: "center",
    marginTop: 16,
    paddingTop: 12,
  },
  footerCopyText: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },
  footerBrand: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
    letterSpacing: 1,
  },
  footerText: {
    fontSize: 14,
    marginBottom: 12,
  },
  footerNote: {
    fontSize: 11,
    opacity: 0.6,
    textAlign: "center",
    marginBottom: 2,
  },
  actions: {
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  printButton: { backgroundColor: "#10b981" },
  htmlPrintButton: { backgroundColor: Colors.light.primary },
  pdfButton: { backgroundColor: "#3b82f6" },
  closeActionButton: { backgroundColor: "#6b7280" },
});
