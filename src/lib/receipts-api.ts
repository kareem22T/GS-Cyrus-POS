import apiClient from "@/api/client";

export interface ReceiptLine {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  netTotal: number;
  taxAmount: number;
  total: number;
}

export interface PosReceipt {
  id: number;
  receiptNumber: string; // SR-YYYYMMDD-XXXX or RR-YYYYMMDD-XXXX
  receiptType?: "SR" | "RR"; // may be absent in some responses
  documentType?: number; // 3 = SR (sale), 4 = RR (return)
  orderNumber: string;
  orderType: "Sale" | "Return";
  paymentMethod: "Cash" | "Visa";
  paymentReference: string | null;
  customerName: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  extraDiscount: number;
  currency: string;
  notes: string | null;
  receiptDate: string;
  lines: ReceiptLine[];
}

/** Resolve the receipt type string from either receiptType or documentType */
export function resolveReceiptType(receipt: PosReceipt): "SR" | "RR" {
  if (receipt.receiptType) return receipt.receiptType;
  if (receipt.documentType === 3) return "SR";
  if (receipt.documentType === 4) return "RR";
  // fallback: infer from receiptNumber prefix
  if (receipt.receiptNumber?.startsWith("RR")) return "RR";
  return "SR";
}

export async function fetchReceipts({
  pageNumber = 1,
  pageSize = 10,
  searchTerm,
  receiptType,
  from,
  to,
}: {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  receiptType?: "SR" | "RR" | "";
  from?: string;
  to?: string;
}) {
  const res = await apiClient.get("/api/pos/receipts", {
    params: {
      PageNumber: pageNumber,
      PageSize: pageSize,
      SearchTerm: searchTerm || undefined,
      ReceiptType: receiptType || undefined,
      From: from || undefined,
      To: to || undefined,
    },
  });

  const body = res.data || {};
  return {
    receipts: (body.data ?? []) as PosReceipt[],
    pagination: body.pagination ?? null,
  };
}

export async function fetchReceiptById(id: number): Promise<PosReceipt | null> {
  const res = await apiClient.get(`/api/pos/receipts/${id}`);
  return res.data?.data ?? null;
}

// ─── Label helpers ────────────────────────────────────────────────────────────

export function getReceiptTypeLabel(type: string): string {
  switch (type) {
    case "SR":
      return "إيصال بيع";
    case "RR":
      return "إيصال إرجاع";
    default:
      return type;
  }
}

export function getReceiptTypeBg(type: string): string {
  switch (type) {
    case "SR":
      return "#dbeafe";
    case "RR":
      return "#fee2e2";
    default:
      return "#f3f4f6";
  }
}

export function getReceiptTypeColor(type: string): string {
  switch (type) {
    case "SR":
      return "#1e40af";
    case "RR":
      return "#dc2626";
    default:
      return "#374151";
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
