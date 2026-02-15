import { Colors } from "@/constants/theme";
import { useCartStore } from "@/store/slices/cart.slice";
import { FontAwesome } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../../components/ui/card";
import { ThemedText } from "../../../components/ui/themed-text";
import { ThemedView } from "../../../components/ui/themed-view";

export default function CartScreen() {
  const cart = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.getSubtotal)();
  const tax = useCartStore((s) => s.getTax)();
  const total = useCartStore((s) => s.getTotal)();
  const removeItem = useCartStore((s) => s.removeItem);

  const handleCheckout = () => {
    router.push("./checkout");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedView>
          <ThemedText type="title">سلة التسوق</ThemedText>
          <ThemedText style={styles.subtitle}>راجع طلبك</ThemedText>
        </ThemedView>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={styles.backText}>رجوع ←</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cart Items */}
        {cart.map((item: any, index: number) => (
          <Card key={index} style={styles.cartItem}>
            <ThemedView style={styles.itemRow}>
              {/* Green Cart Icon */}
              <ThemedView style={styles.iconContainer}>
                <ThemedText style={styles.icon}>🛒</ThemedText>
              </ThemedView>

              {/* Item Details */}
              <ThemedView style={styles.itemInfo}>
                <ThemedText style={styles.productName}>
                  {item.product.name}
                </ThemedText>
                <ThemedText type="subtitle" style={styles.priceText}>
                  {(item.product.price * item.quantity).toFixed(2)} جنيه
                </ThemedText>
                <ThemedView style={styles.metadata}>
                  <ThemedText style={styles.metaText}>
                    الكمية: {item.quantity}
                  </ThemedText>
                  {item.product.isTaxable && (
                    <ThemedText style={styles.taxBadge}>
                      ضريبة 20%:{" "}
                      {(item.product.price * item.quantity * 0.2).toFixed(2)}{" "}
                      جنيه
                    </ThemedText>
                  )}
                </ThemedView>
              </ThemedView>

              {/* Remove Button */}
              <TouchableOpacity
                onPress={() => removeItem(item.product.id)}
                style={styles.removeButton}
              >
                <ThemedText style={styles.removeText}>
                  <FontAwesome name="trash-o" color={"#ef4444"} size={22} />
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </Card>
        ))}

        {/* Summary Card - Compact */}
        <Card style={styles.summaryCard}>
          <ThemedView style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>المجموع الفرعي:</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {subtotal.toFixed(2)} جنيه
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>الضريبة (14%):</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {tax.toFixed(2)} جنيه
            </ThemedText>
          </ThemedView>
          <ThemedView style={[styles.summaryRow, styles.totalRow]}>
            <ThemedText type="subtitle" style={styles.totalLabel}>
              الإجمالي:
            </ThemedText>
            <ThemedText type="subtitle" style={styles.totalValue}>
              {total.toFixed(2)} جنيه
            </ThemedText>
          </ThemedView>
        </Card>

        {/* Bottom Spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Checkout Button */}
      <ThemedView style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
        >
          <ThemedText type="title" style={styles.checkoutText}>
            إتمام الطلب - {total.toFixed(2)} جنيه
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    direction: "rtl",
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 12,
  },
  subtitle: {
    opacity: 0.6,
    marginTop: 2,
    fontSize: 13,
  },
  backText: {
    color: "#007AFF",
    fontWeight: "600",
    fontSize: 15,
  },
  content: {
    flex: 1,
    padding: 16,
  },

  // Cart Item - Compact Layout
  cartItem: {
    marginBottom: 10,
    padding: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8eaed",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#f2f2f2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 24,
  },
  itemInfo: {
    flex: 1,
    gap: 3,
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  priceText: {
    fontSize: 16,
    color: Colors.light.primary,
  },
  metadata: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    opacity: 0.6,
  },
  taxBadge: {
    fontSize: 11,
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  removeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeText: {
    color: "#ef4444",
    fontWeight: "600",
    fontSize: 13,
  },

  // Summary Card - Compact
  summaryCard: {
    marginTop: 12,
    padding: 14,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8eaed",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
    marginTop: 6,
  },
  totalLabel: {
    fontSize: 16,
    color: "#1f2937",
  },
  totalValue: {
    fontSize: 17,
    color: Colors.light.primary,
  },

  // Bottom Checkout Bar
  bottomBar: {
    padding: 10,
    paddingHorizontal: 16,
  },
  checkoutButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  checkoutText: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 25,
  },
});
