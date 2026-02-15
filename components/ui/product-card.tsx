import { Colors } from "@/constants/theme";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

// Lightweight Product shape (avoid adding new global types)
interface Product {
  id: string | number;
  name: string;
  price: number;
  isTaxable?: boolean;
  taxRate?: number; // percent (e.g. 14)
  taxGroupName?: string;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
  isInCart?: boolean;
}

export function ProductCard({
  product,
  onAddToCart,
  isInCart = false,
}: ProductCardProps) {
  const [inputValue, setInputValue] = useState("1");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputMode, setInputMode] = useState<"quantity" | "price">("quantity");
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isModalOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [isModalOpen]);

  const calculateValues = () => {
    const value = Number.parseFloat(inputValue);
    if (isNaN(value) || value <= 0) return { quantity: 0, price: 0 };
    if (inputMode === "quantity")
      return { quantity: value, price: value * product.price };
    return { quantity: value / product.price, price: value };
  };

  const { quantity: calculatedQuantity, price: calculatedPrice } =
    calculateValues();

  const calculatedTax =
    product.isTaxable && product.taxRate
      ? calculatedPrice * (product.taxRate / 100)
      : 0;
  const calculatedTotalWithTax = calculatedPrice + calculatedTax;

  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        Keyboard.dismiss();
        setTimeout(() => inputRef.current?.focus(), 100);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen]);

  const handleAddToCart = () => {
    if (isNaN(calculatedQuantity) || calculatedQuantity <= 0) {
      Alert.alert("قيمة غير صحيحة", "يرجى إدخال قيمة صحيحة");
      return;
    }
    const formattedQuantity = parseFloat(calculatedQuantity.toFixed(2));
    onAddToCart(product, formattedQuantity);
    setIsModalOpen(false);
    setInputValue("1");
    setInputMode("quantity");
  };

  const toggleInputMode = () => {
    const currentValue = Number.parseFloat(inputValue);
    if (!isNaN(currentValue) && currentValue > 0) {
      if (inputMode === "quantity")
        setInputValue((currentValue * product.price).toFixed(2));
      else setInputValue((currentValue / product.price).toFixed(2));
      setInputMode(inputMode === "quantity" ? "price" : "quantity");
    } else {
      setInputMode(inputMode === "quantity" ? "price" : "quantity");
    }
  };

  return (
    <View style={[styles.card, isInCart && { borderColor: "#143191ff" }]}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.content}>
          <ThemedView style={styles.productInfo}>
            <ThemedText type="subtitle" style={styles.productName}>
              {product.name}
            </ThemedText>
            {product.isTaxable && product.taxRate !== undefined ? (
              <ThemedText style={styles.price} type="subtitle">
                {(product.price * (1 + product.taxRate / 100)).toFixed(2)} جنيه
              </ThemedText>
            ) : (
              <ThemedText style={styles.price} type="subtitle">
                {product.price.toFixed(2)} جنيه
              </ThemedText>
            )}

            {product.isTaxable && product.taxRate !== undefined ? (
              <ThemedText style={styles.taxHint}>
                {`ضريبة ${product.taxRate}%: ${(product.price * (product.taxRate / 100)).toFixed(2)} جنيه`}
              </ThemedText>
            ) : null}
          </ThemedView>

          <TouchableOpacity
            style={[styles.addButton]}
            onPress={() => setIsModalOpen(true)}
          >
            <MaterialCommunityIcons name="cart-plus" size={24} color="white" />
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>

      <Modal
        visible={isModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle} type="title">
              إضافة للسلة
            </ThemedText>

            <ThemedView style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  inputMode === "quantity" && styles.toggleButtonActive,
                ]}
                onPress={() => inputMode !== "quantity" && toggleInputMode()}
              >
                <MaterialCommunityIcons
                  name="gas-station"
                  size={20}
                  color={inputMode === "quantity" ? "#fff" : "#666"}
                />
                <ThemedText
                  style={[
                    styles.toggleText,
                    inputMode === "quantity" && styles.toggleTextActive,
                  ]}
                >
                  باللتر
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  inputMode === "price" && styles.toggleButtonActive,
                ]}
                onPress={() => inputMode !== "price" && toggleInputMode()}
              >
                <MaterialCommunityIcons
                  name="cash"
                  size={20}
                  color={inputMode === "price" ? "#fff" : "#666"}
                />
                <ThemedText
                  style={[
                    styles.toggleText,
                    inputMode === "price" && styles.toggleTextActive,
                  ]}
                >
                  بالسعر
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>

            <ThemedView style={styles.quantityContainer}>
              <ThemedText style={styles.quantityLabel}>
                {inputMode === "quantity" ? "الكمية (لتر):" : "السعر (جنيه):"}
              </ThemedText>
              <TextInput
                placeholder={
                  inputMode === "quantity" ? "أدخل الكمية" : "أدخل السعر"
                }
                value={inputValue}
                onChangeText={setInputValue}
                keyboardType="decimal-pad"
                style={styles.quantityInput}
                ref={inputRef}
                autoFocus
                selectTextOnFocus
              />

              {calculatedQuantity > 0 && (
                <>
                  <ThemedView style={styles.conversionContainer}>
                    <MaterialCommunityIcons
                      name="arrow-left-right"
                      size={16}
                      color="#007AFF"
                    />
                    <ThemedText style={styles.conversionText}>
                      {inputMode === "quantity"
                        ? `${calculatedQuantity.toFixed(2)} لتر = ${calculatedPrice.toFixed(2)} جنيه`
                        : `${calculatedPrice.toFixed(2)} جنيه = ${calculatedQuantity.toFixed(2)} لتر`}
                    </ThemedText>
                  </ThemedView>

                  {product.isTaxable && product.taxRate !== undefined && (
                    <ThemedView style={styles.taxRow}>
                      <ThemedText style={styles.taxText}>
                        {`ضريبة ${product.taxRate}%: ${calculatedTax.toFixed(2)} جنيه`}
                      </ThemedText>
                      <ThemedText style={styles.totalWithTaxText}>
                        {`المجموع شامل الضريبة: ${calculatedTotalWithTax.toFixed(2)} جنيه`}
                      </ThemedText>
                    </ThemedView>
                  )}
                </>
              )}
            </ThemedView>

            <ThemedView style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsModalOpen(false)}
              >
                <ThemedText style={styles.cancelButtonText}>إلغاء</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.addButton, { height: 50 }]}
                onPress={handleAddToCart}
              >
                <ThemedText style={styles.addButtonText}>
                  إضافة للسلة
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderColor: "#e0e0e0ff",
    borderWidth: 1,
  },
  container: { flexDirection: "row", alignItems: "center", gap: 16 },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  productInfo: { flex: 1, alignItems: "flex-start" },
  productName: { fontSize: 16 },
  price: { color: "#007AFF", fontSize: 16, marginBottom: 4 },
  taxHint: { fontSize: 12, color: "#6b7280", marginBottom: 6 },
  taxRow: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
  },
  taxText: { fontSize: 13, color: "#374151" },
  totalWithTaxText: {
    fontSize: 13,
    color: "#10b981",
    fontWeight: "700",
    marginTop: 6,
  },
  addButton: {
    borderRadius: 10,
    backgroundColor: "#28c056ff",
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: { fontSize: 20, marginBottom: 8, textAlign: "center" },
  toggleContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  toggleButtonActive: { backgroundColor: Colors.light.primary },
  toggleText: { fontSize: 14, fontWeight: "600", color: "#666" },
  toggleTextActive: { color: "#fff" },
  quantityContainer: { marginBottom: 24 },
  quantityLabel: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  quantityInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: "#f9fafb",
    textAlign: "left",
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 16,
    direction: "ltr",
  },
  conversionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#f0f9ff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  conversionText: { fontSize: 14, color: "#007AFF", fontWeight: "500" },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    minHeight: 42,
    borderColor: "#e5e7eb",
  },
  cancelButtonText: { color: "#374151", fontWeight: "600" },
  addButtonText: { color: "#fff", fontWeight: "600" },
});
