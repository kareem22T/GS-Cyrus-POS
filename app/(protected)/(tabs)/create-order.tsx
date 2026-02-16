"use client";

import apiClient from "@/api/client";
import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "../../../components/ui/themed-text";
import { ThemedView } from "../../../components/ui/themed-view";

// New UI + store
import { Colors } from "@/constants/theme";
import { useCartStore } from "@/store/slices/cart.slice";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProductCard } from "../../../components/ui/product-card";

const PAGE_SIZE = 10;

export default function CreateOrderScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const cart = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.getSubtotal)();
  const taxAmount = useCartStore((s) => s.getTax)();
  const total = useCartStore((s) => s.getTotal)();
  const addOrUpdateItem = useCartStore((s) => s.addOrUpdateItem);
  const removeItem = useCartStore((s) => s.removeItem);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [quantityInput, setQuantityInput] = useState("1");
  const [inputMode, setInputMode] = useState<"quantity" | "price">("price");
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (showQuantityModal) {
      const t = setTimeout(() => {
        inputRef.current?.focus();
        Keyboard.dismiss();
        setTimeout(() => inputRef.current?.focus(), 100);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [showQuantityModal, inputMode]);

  const loadProducts = async (page = 1, append = false) => {
    try {
      setError(null);
      if (append) setLoadingMore(true);
      const res = await apiClient.get("/api/pos/products", {
        params: { PageNumber: page, PageSize: PAGE_SIZE },
      });

      const data = res.data?.data ?? [];
      const pagination = res.data?.pagination ?? null;

      if (append) setProducts((p) => [...p, ...data]);
      else setProducts(data);

      setPagination(pagination);
      setCurrentPage(page);
    } catch (err: any) {
      console.error("loadProducts error", err);
      setError(err?.message || "فشل تحميل المنتجات");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadProducts(1);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts(1, false);
  };

  const isProductInCart = (productId: string) =>
    cart.some((i) => `${i.product.id}` === `${productId}`);

  const calculateQuantity = () => {
    if (!editingProduct) return 0;
    const value = parseFloat(quantityInput);
    if (isNaN(value) || value < 0) return 0;
    return inputMode === "quantity" ? value : value / editingProduct.price;
  };

  const calculatePrice = () => {
    if (!editingProduct) return 0;
    const value = parseFloat(quantityInput);
    if (isNaN(value) || value < 0) return 0;
    return inputMode === "price" ? value : value * editingProduct.price;
  };

  const handleQuantitySubmit = () => {
    if (!editingProduct) return;
    const qty = calculateQuantity();
    const price = calculatePrice();

    if (isNaN(qty) || qty < 0) {
      Alert.alert("قيمة غير صحيحة", "يرجى إدخال قيمة صحيحة");
      return;
    }

    // Use store action to add/update or remove
    if (qty === 0) {
      removeItem(editingProduct.id);
    } else {
      addOrUpdateItem(editingProduct, qty, price);
    }

    setShowQuantityModal(false);
    setEditingProduct(null);
  };

  const toggleInputMode = () => {
    if (!editingProduct) return;
    const currentValue = parseFloat(quantityInput);
    if (!isNaN(currentValue) && currentValue > 0) {
      if (inputMode === "quantity")
        setQuantityInput((currentValue * editingProduct.price).toString());
      else setQuantityInput((currentValue / editingProduct.price).toString());
      setInputMode(inputMode === "quantity" ? "price" : "quantity");
    } else {
      setInputMode(inputMode === "quantity" ? "price" : "quantity");
    }
  };

  const goToCart = () => router.push("./cart");

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <ThemedText style={styles.loadingText}>
            جارٍ تحميل المنتجات...
          </ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.centerContent}>
          <ThemedText style={styles.errorText}>خطأ: {error}</ThemedText>
          <TouchableOpacity
            onPress={() => loadProducts(1)}
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
      <ThemedView style={styles.header}>
        <ThemedView>
          <ThemedText type="title">انشاء طلب</ThemedText>
          <ThemedText style={styles.subtitle}>
            أضف منتجات إلى السلة ثم راجعها
          </ThemedText>
        </ThemedView>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={styles.backText}>رجوع ←</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {products.length === 0 ? (
          <ThemedView style={styles.centerContent}>
            <ThemedText style={styles.emptyText}>
              لا توجد منتجات متاحة
            </ThemedText>
          </ThemedView>
        ) : (
          <ThemedView style={styles.productsGrid}>
            {products.map((product) => {
              const inCart = isProductInCart(product.id);
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  isInCart={inCart}
                  onAddToCart={(p: any, qty: number) => addOrUpdateItem(p, qty)}
                />
              );
            })}

            {/* Pagination: page info + load more */}
            {pagination && (
              <ThemedView style={styles.paginationContainer}>
                <ThemedText style={styles.paginationInfo}>
                  {`صفحة ${pagination.currentPage} من ${pagination.totalPages}`}
                </ThemedText>

                {pagination.hasNext && (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={() => loadProducts(currentPage + 1, true)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <ThemedText style={styles.loadMoreButtonText}>
                        تحميل المزيد
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                )}
              </ThemedView>
            )}
          </ThemedView>
        )}
      </ScrollView>

      {cart.length > 0 && (
        <ThemedView style={styles.bottomBar}>
          <ThemedView style={styles.cartSummary}>
            <ThemedText style={styles.cartInfo}>{cart.length} منتج</ThemedText>
            <ThemedText style={styles.cartTotal} type="subtitle">
              {total.toFixed(2)} جنيه
            </ThemedText>
            <ThemedText style={{ fontSize: 12, color: "#6b7280" }}>
              {`السعر قبل الضريبة: ${subtotal.toFixed(2)} جنيه`}
            </ThemedText>
            <ThemedText style={styles.cartTaxHint}>
              {`شامل ضريبة: ${taxAmount.toFixed(2)} جنيه`}
            </ThemedText>
          </ThemedView>
          <TouchableOpacity style={styles.checkoutButton} onPress={goToCart}>
            <ThemedText type="title" style={styles.checkoutButtonText}>
              عرض السلة
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      )}

      {/* Quantity Modal */}
      <Modal
        visible={showQuantityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuantityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle} type="title">
              {editingProduct?.name}
            </ThemedText>
            <ThemedText style={styles.modalPrice}>
              {editingProduct?.price?.toFixed(2)} جنيه / لتر
            </ThemedText>

            <ThemedView style={styles.toggleContainer}>
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
            </ThemedView>

            <ThemedView style={styles.quantityContainer}>
              <ThemedText style={styles.quantityLabel}>
                {inputMode === "quantity" ? "الكمية (لتر):" : "السعر (جنيه):"}
              </ThemedText>
              <TextInput
                placeholder={
                  inputMode === "quantity" ? "أدخل الكمية" : "أدخل السعر"
                }
                value={quantityInput}
                onChangeText={setQuantityInput}
                keyboardType="decimal-pad"
                style={styles.quantityInput}
                autoFocus
                ref={inputRef}
                selectTextOnFocus
              />

              {parseFloat(quantityInput) > 0 && (
                <>
                  <ThemedView style={styles.conversionContainer}>
                    <MaterialCommunityIcons
                      name="arrow-left-right"
                      size={16}
                      color="#007AFF"
                    />
                    <ThemedText style={styles.conversionText}>
                      {inputMode === "quantity"
                        ? `${calculateQuantity().toFixed(2)} لتر = ${calculatePrice().toFixed(2)} جنيه`
                        : `${calculatePrice().toFixed(2)} جنيه = ${calculateQuantity().toFixed(2)} لتر`}
                    </ThemedText>
                  </ThemedView>

                  {editingProduct?.isTaxable &&
                    editingProduct?.taxRate !== undefined && (
                      <ThemedView style={styles.taxRow}>
                        <ThemedText style={styles.taxText}>
                          {`ضريبة ${editingProduct.taxRate}%: ${(
                            calculatePrice() *
                            (editingProduct.taxRate / 100)
                          ).toFixed(2)} جنيه`}
                        </ThemedText>

                        <ThemedText style={styles.totalWithTaxText}>
                          {`المجموع شامل الضريبة: ${(
                            calculatePrice() +
                            calculatePrice() * (editingProduct.taxRate / 100)
                          ).toFixed(2)} جنيه`}
                        </ThemedText>
                      </ThemedView>
                    )}
                </>
              )}
            </ThemedView>

            <ThemedView style={styles.modalButtons}>
              {isProductInCart(editingProduct?.id || "") && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.removeButton]}
                  onPress={() => {
                    if (editingProduct) removeItem(editingProduct.id);
                    setShowQuantityModal(false);
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                  <ThemedText style={styles.removeButtonText}>حذف</ThemedText>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowQuantityModal(false)}
              >
                <ThemedText style={styles.cancelButtonText}>إلغاء</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleQuantitySubmit}
              >
                <ThemedText style={styles.confirmButtonText}>تأكيد</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, direction: "rtl", backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 0,
  },
  subtitle: { opacity: 0.7, marginTop: 4 },
  backText: { color: "#007AFF", fontWeight: "600" },
  content: { flex: 1, padding: 20 },
  productsGrid: { gap: 12 },
  productCard: {
    padding: 8,
    paddingHorizontal: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  productCardInCart: { borderColor: "#10b981", backgroundColor: "#f0fdf4" },
  productContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, marginBottom: 4 },
  price: { color: "#007AFF", fontSize: 15 },
  quantityBadge: {
    marginTop: 4,
    fontSize: 13,
    color: "#10b981",
    fontWeight: "600",
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: "#e5e5e5",
    borderBottomColor: "#e5e5e5",
    backgroundColor: "#ffffff",
    gap: 12,
  },
  cartSummary: { flex: 1 },
  cartInfo: { fontWeight: "600", fontSize: 14 },
  cartTotal: { fontSize: 18, color: "#007AFF" },
  checkoutButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  checkoutButtonText: { color: "#fff", fontSize: 12, lineHeight: 20 },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  loadingText: { marginTop: 16, opacity: 0.7 },
  errorText: { color: "#ef4444", textAlign: "center", marginBottom: 16 },
  retryButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: { color: "#ffffff", fontWeight: "600" },
  emptyText: { opacity: 0.7, textAlign: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 420,
  },
  modalTitle: { fontSize: 20, marginBottom: 8, textAlign: "center" },
  modalPrice: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 20,
    textAlign: "center",
    color: "#007AFF",
  },
  toggleContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    backgroundColor: "#f3f4f6",
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
    fontSize: 18,
    backgroundColor: "#f9fafb",
    textAlign: "left",
    direction: "ltr",
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontWeight: "600",
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

  /* pagination */
  paginationContainer: {
    marginTop: 12,
    alignItems: "center",
    marginBottom: 50,
  },
  paginationInfo: { fontSize: 13, color: "#6b7280", marginBottom: 8 },
  loadMoreButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  loadMoreButtonText: { color: "#fff", fontWeight: "600" },

  /* cart / tax hint */
  cartTaxHint: { fontSize: 12, color: "#6b7280", marginTop: 4 },

  /* tax details in modal */
  taxRow: {
    marginTop: 12,
    padding: 12,
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
  modalButtons: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  modalButton: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  removeButton: {
    backgroundColor: "#ef4444",
    flexDirection: "row",
    gap: 6,
    flex: 0,
  },
  removeButtonText: { color: "#fff", fontWeight: "600" },
  cancelButton: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cancelButtonText: { color: "#374151", fontWeight: "600" },
  confirmButton: { backgroundColor: "#10b981" },
  confirmButtonText: { color: "#fff", fontWeight: "600" },
});
