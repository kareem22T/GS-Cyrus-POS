// useFawryPayment.ts

import { useCallback, useEffect, useState } from "react";
import {
  FawryEventEmitter,
  FawryPaymentModule,
} from "../../modules/FawryPaymentModule";
import type {
  ConnectionResponse,
  InquiryRequest,
  InquiryResponse,
  PaymentRequest,
  PaymentResponse,
  RefundResponse,
  VoidResponse,
} from "../../types/fawry.types";

interface UseFawryPaymentReturn {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connect: (username: string, password: string) => Promise<ConnectionResponse>;
  disconnect: () => Promise<void>;
  checkConnection: () => Promise<boolean>;

  // Payment methods
  processCardPayment: (
    amount: number,
    orderId: string,
    btc?: string,
  ) => Promise<PaymentResponse>;
  processCashPayment: (
    amount: number,
    orderId: string,
    btc?: string,
  ) => Promise<PaymentResponse>;

  // Transaction management
  voidTransaction: (fcrn: string) => Promise<VoidResponse>;
  refundTransaction: (fcrn: string, amount: number) => Promise<RefundResponse>;
  inquireTransaction: (inquiryData: InquiryRequest) => Promise<InquiryResponse>;
}

export const useFawryPayment = (): UseFawryPaymentReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for disconnect events
    const subscription = FawryEventEmitter.addListener(
      "onFawryDisconnect",
      (status: string) => {
        console.log("Fawry disconnected:", status);
        setIsConnected(false);
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const connect = useCallback(
    async (username: string, password: string): Promise<ConnectionResponse> => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await FawryPaymentModule.connect(username, password);

        console.log("Connection response:", response);

        if (response === "CONNECTED") {
          setIsConnected(true);
        }

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Connection failed";
        setError(errorMessage);
        console.error("Connection error:", err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      await FawryPaymentModule.disconnect();
      setIsConnected(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Disconnect failed";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const status = await FawryPaymentModule.checkConnectionStatus();
      setIsConnected(status.isConnected);
      return status.isConnected;
    } catch (err) {
      console.error("Connection check error:", err);
      return false;
    }
  }, []);

  const processCardPayment = useCallback(
    async (
      amount: number,
      orderId: string,
      btc: string = "999",
    ): Promise<PaymentResponse> => {
      try {
        setIsLoading(true);
        setError(null);

        const paymentRequest: PaymentRequest = {
          amount,
          orderId,
          btc,
        };

        const response =
          await FawryPaymentModule.initiateCardPayment(paymentRequest);

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Card payment failed";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const processCashPayment = useCallback(
    async (
      amount: number,
      orderId: string,
      btc: string = "121",
    ): Promise<PaymentResponse> => {
      try {
        setIsLoading(true);
        setError(null);

        const paymentRequest: PaymentRequest = {
          amount,
          orderId,
          btc,
        };

        const response =
          await FawryPaymentModule.initiateCashPayment(paymentRequest);

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Cash payment failed";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const voidTransaction = useCallback(
    async (fcrn: string): Promise<VoidResponse> => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await FawryPaymentModule.voidTransaction(fcrn);

        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Void failed";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const refundTransaction = useCallback(
    async (fcrn: string, amount: number): Promise<RefundResponse> => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await FawryPaymentModule.refundTransaction(
          fcrn,
          amount,
          "ORD-1769685480484-hihtw3kqr",
        );

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Refund failed";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const inquireTransaction = useCallback(
    async (inquiryData: InquiryRequest): Promise<InquiryResponse> => {
      try {
        setIsLoading(true);
        setError(null);

        const response =
          await FawryPaymentModule.transactionInquiry(inquiryData);

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Inquiry failed";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return {
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
    checkConnection,
    processCardPayment,
    processCashPayment,
    voidTransaction,
    refundTransaction,
    inquireTransaction,
  };
};
