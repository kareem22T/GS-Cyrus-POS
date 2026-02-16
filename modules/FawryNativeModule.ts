// PrinterNativeModule.ts
import { NativeModules } from "react-native";
import type { ReceiptData } from "../types/fawry.types";

interface PAXPrinterNativeModule {
  printReceipt(receiptData: ReceiptData): Promise<string>;
  testPrint(): Promise<string>;
  printCustom(lines: string[]): Promise<string>;
  closePrinter(): Promise<string>;
  printImageBase64(str: string): Promise<string>;
}

const { PAXPrinter } = NativeModules;

if (!PAXPrinter) {
  throw new Error("PAXPrinter native module not found");
}

export const PAXPrinterModule = PAXPrinter as PAXPrinterNativeModule;
