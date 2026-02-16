// printer.types.ts

export interface ReceiptData {
  type: string;
  amount: string;
  transactionId: string;
  fcrn?: string;
  timestamp: string;
}
