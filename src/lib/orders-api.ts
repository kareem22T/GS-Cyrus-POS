import apiClient from "@/api/client";

export interface PosOrderLine {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  netTotal: number;
  taxAmount: number;
  total: number;
}

export interface PosOrder {
  id: number;
  orderNumber: string;
  status: "Pending" | "PendingPayment" | "Paid" | "Failed" | "Expired";
  orderType: "Sale" | "Return";
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  paymentMethod: "Cash" | "Visa";
  paymentReference: string | null;
  customerName: string;
  extraDiscount: number;
  notes: string | null;
  isReceiptCreated: boolean;
  createdAt: string;
  expiresAt: string | null;
  lines: PosOrderLine[];
}

export async function fetchOrders({
  pageNumber = 1,
  pageSize = 10,
  searchTerm,
  status,
  orderType,
  from,
  to,
}: {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  status?: string;
  orderType?: string;
  from?: string;
  to?: string;
}) {
  const res = await apiClient.get("/api/pos/orders", {
    params: {
      PageNumber: pageNumber,
      PageSize: pageSize,
      SearchTerm: searchTerm || undefined,
      status: status || undefined,
      orderType: orderType || undefined,
      From: from || undefined,
      To: to || undefined,
    },
  });

  const body = res.data || {};
  return {
    orders: (body.data ?? []) as PosOrder[],
    pagination: body.pagination ?? null,
  };
}

export async function fetchOrderById(id: number): Promise<PosOrder | null> {
  const res = await apiClient.get(`/api/pos/orders/${id}`);
  return res.data?.data ?? null;
}

// ─── Label helpers ────────────────────────────────────────────────────────────

export function getPosOrderStatusLabel(status: string): string {
  switch (status) {
    case "Paid":
      return "مدفوع";
    case "Failed":
      return "فاشل";
    case "PendingPayment":
      return "في انتظار الدفع";
    case "Expired":
      return "منتهي الصلاحية";
    case "Pending":
      return "معلق";
    default:
      return status;
  }
}

export function getPosOrderStatusColor(status: string): string {
  switch (status) {
    case "Paid":
      return "#059669"; // green
    case "Failed":
      return "#dc2626"; // red
    case "PendingPayment":
      return "#d97706"; // amber
    case "Expired":
      return "#6b7280"; // gray
    case "Pending":
      return "#2563eb"; // blue
    default:
      return "#6b7280";
  }
}

export function getPosOrderStatusBg(status: string): string {
  switch (status) {
    case "Paid":
      return "#d1fae5";
    case "Failed":
      return "#fee2e2";
    case "PendingPayment":
      return "#fef3c7";
    case "Expired":
      return "#f3f4f6";
    case "Pending":
      return "#dbeafe";
    default:
      return "#f3f4f6";
  }
}

export function getOrderTypeLabel(type: string): string {
  switch (type) {
    case "Sale":
      return "بيع";
    case "Return":
      return "إرجاع";
    default:
      return type;
  }
}

export function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case "Cash":
      return "نقدي";
    case "Visa":
      return "فيزا";
    default:
      return method;
  }
}
