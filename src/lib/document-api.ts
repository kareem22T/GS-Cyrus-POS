import apiClient from "@/api/client";

export async function fetchDocuments({
  pageNumber = 1,
  pageSize = 10,
  deviceId,
  dateFrom,
  dateTo,
}: {
  pageNumber?: number;
  pageSize?: number;
  deviceId?: string | null;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
}) {
  const res = await apiClient.get("/api/receipts", {
    params: {
      PageNumber: pageNumber,
      PageSize: pageSize,
      deviceSerial: deviceId || undefined,
      DateFrom: dateFrom || undefined,
      DateTo: dateTo || undefined,
    },
  });

  const body = res.data || {};
  return {
    documents: body.data ?? [],
    pagination: body.pagination ?? null,
  };
}

export async function fetchDocumentById(id: number) {
  const res = await apiClient.get(`/api/receipts/${id}`);
  return res.data?.data ?? null;
}

export function getPaymentMethodLabel(code: number) {
  switch (code) {
    case 0:
      return "نقدي";
    case 1:
      return "فيزا";
    default:
      return "أخرى";
  }
}

export function getDocumentTypeLabel(code: number) {
  // 3 = Sales Receipt (SR), 4 = Return Receipt (RR) — map to friendly Arabic labels
  switch (code) {
    case 3:
      return "إيصال بيع";
    case 4:
      return "إيصال إرجاع";
    default:
      return `نوع: ${code}`;
  }
}
