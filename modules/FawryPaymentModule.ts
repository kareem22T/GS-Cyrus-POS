// FawryNativeModule.ts

import { NativeEventEmitter, NativeModules } from "react-native";
import type {
    ConnectionResponse,
    ConnectionStatus,
    InquiryRequest,
    InquiryResponse,
    PaymentRequest,
    PaymentResponse,
    RefundResponse,
    VoidResponse,
} from "../types/fawry.types";

interface FawryPaymentNativeModule {
  connect(username: string, password: string): Promise<ConnectionResponse>;
  disconnect(): Promise<string>;
  isConnected(): Promise<boolean>;
  getConnectionInfo(): Promise<ConnectionStatus>;
  checkConnectionStatus(): Promise<ConnectionStatus>;

  // Payment methods
  initiateCardPayment(paymentData: PaymentRequest): Promise<PaymentResponse>;
  initiateCashPayment(paymentData: PaymentRequest): Promise<PaymentResponse>;

  // Transaction management
  voidTransaction(fcrn: string): Promise<VoidResponse>;
  refundTransaction(
    fcrn: string,
    amount: number,
    orderId: string,
  ): Promise<RefundResponse>;
  transactionInquiry(inquiryData: InquiryRequest): Promise<InquiryResponse>;
}
const { FawryPayment } = NativeModules;

if (!FawryPayment) {
  throw new Error("FawryPayment native module not found");
}
export const FawryPaymentModule = FawryPayment as FawryPaymentNativeModule;

// Event Emitter for Fawry events
export const FawryEventEmitter = new NativeEventEmitter(FawryPayment);
