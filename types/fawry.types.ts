// printer.types.ts

export interface ReceiptData {
  type: string;
  amount: string;
  transactionId: string;
  fcrn?: string;
  timestamp: string;
}
// fawry.types.ts

export const BTC_CODES = {
  CARD_PAYMENT: "999",
  CASH_PAYMENT: "121",
  CARD_REFUND: "123",
  CARD_VOID: "999",
} as const;

export interface PaymentRequest {
  amount: number;
  orderId: string;
  btc: string;
}

export interface PaymentResponse {
  status: "success" | "failed";
  response: string;
  fcrn?: string;
}

export interface VoidResponse {
  status: "success" | "failed";
  response: string;
  fcrn: string;
}

export interface RefundResponse {
  status: "success" | "failed";
  response: string;
  fcrn: string;
  amount: number;
}

export interface InquiryRequest {
  transactionId: string;
  idType?: "FCRN" | "ORDER_ID";
  fromDate: string; // Format: "YYYYMMDD"
  toDate: string; // Format: "YYYYMMDD"
  printReceipt?: boolean;
}

export interface InquiryResponse {
  status: "success" | "failed";
  response: string;
  transactionId: string;
}

export interface ConnectionStatus {
  instanceExists: boolean;
  isConnected: boolean;
  message: string;
}

export type ConnectionResponse = "CONNECTED" | string;
