package com.anonymous.GSCyrusPOS;

import android.app.Activity;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.UiThreadUtil;

import com.anonymous.GSCyrusPOS.core.PaxA930Printer;
import com.anonymous.GSCyrusPOS.core.Printer;
import com.anonymous.GSCyrusPOS.core.PrinterListener;

public class PAXPrinterModule extends ReactContextBaseJavaModule implements PrinterListener {
    private static final String TAG = "PAXPrinterModule";
    private final ReactApplicationContext reactContext;
    private PaxA930Printer printer;
    private Promise printPromise;

    public PAXPrinterModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "PAXPrinter";
    }

    /**
     * Initialize the printer
     */
    private void ensurePrinterInitialized() throws Exception {
        if (printer == null) {
            Activity activity = getCurrentActivity();
            if (activity == null) {
                activity = reactContext.getCurrentActivity();
            }

            if (activity == null) {
                throw new Exception("Activity is null - cannot initialize printer");
            }

            Log.d(TAG, "Initializing PAX printer...");
            printer = new PaxA930Printer(activity, this);
            
            try {
                printer.openConnection();
                Log.d(TAG, "Printer initialized successfully");
            } catch (Throwable e) {
                throw new Exception("Failed to open printer connection: " + e.getMessage(), e);
            }
        }
    }

    /**
     * Print image from base64 string
     */
    @ReactMethod
    public void printImageBase64(String base64Image, Promise promise) {
        this.printPromise = promise;

        UiThreadUtil.runOnUiThread(() -> {
            try {
                ensurePrinterInitialized();

                Log.d(TAG, "========================================");
                Log.d(TAG, "PRINTING IMAGE FROM BASE64");
                Log.d(TAG, "========================================");

                // Remove data URL prefix if present
                String base64Data = base64Image;
                if (base64Image.contains(",")) {
                    base64Data = base64Image.split(",")[1];
                }

                // Decode base64 to bitmap
                byte[] decodedBytes = Base64.decode(base64Data, Base64.DEFAULT);
                Bitmap bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);

                if (bitmap == null) {
                    throw new Exception("Failed to decode base64 image");
                }

                Log.d(TAG, "Image decoded: " + bitmap.getWidth() + "x" + bitmap.getHeight());

                // Clear printer and print the bitmap
                printer.clearData();
                printer.setAlignment(Printer.Alignment.CENTER);
                printer.printImage(bitmap);
                
                // Add minimal spacing at the end for cutting
                printer.printText(" ", false);
                printer.printText(" ", false);
                
                printer.addToPrint(true);
                
                Log.d(TAG, "Image sent to printer successfully");

            } catch (Throwable e) {
                Log.e(TAG, "Error printing image from base64", e);
                if (printPromise != null) {
                    printPromise.reject("PRINT_ERROR", "Failed to print image: " + e.getMessage(), e);
                    printPromise = null;
                }
            }
        });
    }

    /**
     * Print a custom receipt with receipt data (Fawry style)
     */
    @ReactMethod
    public void printReceipt(ReadableMap receiptData, Promise promise) {
        this.printPromise = promise;

        UiThreadUtil.runOnUiThread(() -> {
            try {
                ensurePrinterInitialized();

                String type = receiptData.hasKey("type") ? receiptData.getString("type") : "Receipt";
                String amount = receiptData.hasKey("amount") ? receiptData.getString("amount") : "0.00";
                String transactionId = receiptData.hasKey("transactionId") ? receiptData.getString("transactionId") : "N/A";
                String fcrn = receiptData.hasKey("fcrn") ? receiptData.getString("fcrn") : "N/A";
                String timestamp = receiptData.hasKey("timestamp") ? receiptData.getString("timestamp") : "";

                Log.d(TAG, "========================================");
                Log.d(TAG, "PRINTING FAWRY-STYLE RECEIPT");
                Log.d(TAG, "Type: " + type);
                Log.d(TAG, "Amount: " + amount);
                Log.d(TAG, "Transaction ID: " + transactionId);
                Log.d(TAG, "FCRN: " + fcrn);
                Log.d(TAG, "========================================");

                printer.clearData();
                printer.printText(" ", false);

                printer.setAlignment(Printer.Alignment.CENTER);
                printer.printText("╔═══════════════════════════════════╗", false);
                printer.printText("║         CYRUSTECH POS             ║", true, 0x000000, PaxA930Printer.FontSize.LARGE);
                printer.printText("╚═══════════════════════════════════╝", false);
                printer.printText(" ", false);

                printer.printText("عملية ناجحة", true, 0x000000, PaxA930Printer.FontSize.LARGE);
                printer.printText(" ", false);

                printer.printText("........................................", false);
                printer.printText(" ", false);

                printer.printText("رقم الإيصال: " + transactionId, false, 0x000000, PaxA930Printer.FontSize.LARGE);
                printer.printText(" ", false);
                
                if (!timestamp.isEmpty()) {
                    printer.printText(timestamp, false, 0x000000, PaxA930Printer.FontSize.LARGE);
                    printer.printText(" ", false);
                }

                printer.printText("........................................", false);
                printer.printText(" ", false);

                printer.setAlignment(Printer.Alignment.LEFT);
                printer.printText("نوع العملية: " + type, false, 0x000000, PaxA930Printer.FontSize.LARGE);
                printer.printText(" ", false);

                printer.setAlignment(Printer.Alignment.CENTER);
                printer.printText("........................................", false);
                printer.printText(" ", false);

                printer.printText("المبلغ الكلي:", false, 0x000000, PaxA930Printer.FontSize.LARGE);
                printer.printText(amount + " EGP", true, 0x000000, PaxA930Printer.FontSize.LARGE);
                printer.printText(" ", false);

                printer.printText("========================================", false);
                printer.printText(" ", false);

                if (!fcrn.equals("N/A")) {
                    printer.printText("الرقم الفوري:", false, 0x000000, PaxA930Printer.FontSize.LARGE);
                    printer.printText(fcrn, true, 0x000000, PaxA930Printer.FontSize.LARGE);
                    printer.printText(" ", false);
                }

                printer.printText("طريقة الدفع: نقدي", false, 0x000000, PaxA930Printer.FontSize.LARGE);
                printer.printText(" ", false);

                printer.printText("........................................", false);
                printer.printText(" ", false);

                printer.printText("نسخة العميل", false, 0x000000, PaxA930Printer.FontSize.LARGE);
                printer.printText(" ", false);
                printer.printText(" ", false);

                printer.printText("CYRUSTECH", true, 0x000000, PaxA930Printer.FontSize.LARGE);
                printer.printText("شكراً لتعاملكم معنا", false, 0x000000, PaxA930Printer.FontSize.LARGE);
                printer.printText(" ", false);

                printer.printText("تأكد من وجود رمز الـ QR على الذكرة", false);
                printer.printText("للتحقق من صحة العملية", false);
                printer.printText(" ", false);

                printer.printText(" ", false);
                printer.printText(" ", false);
                printer.printText(" ", false);
                printer.printText(" ", false);
                printer.printText(" ", false);

                printer.addToPrint(true);

                Log.d(TAG, "Fawry-style receipt data sent to printer");

            } catch (Throwable e) {
                Log.e(TAG, "Error printing receipt", e);
                if (printPromise != null) {
                    printPromise.reject("PRINT_ERROR", "Failed to print receipt: " + e.getMessage(), e);
                    printPromise = null;
                }
            }
        });
    }

    /**
     * Print custom lines of text (used for detailed receipts)
     */
    @ReactMethod
    public void printCustom(ReadableArray lines, Promise promise) {
        this.printPromise = promise;

        UiThreadUtil.runOnUiThread(() -> {
            try {
                ensurePrinterInitialized();

                Log.d(TAG, "Printing custom lines: " + lines.size());

                printer.clearData();
                
                for (int i = 0; i < lines.size(); i++) {
                    String line = lines.getString(i);
                    
                    if (line.contains("╔") || line.contains("╗") || line.contains("║") ||
                        line.contains("عملية ناجحة") || line.contains("نسخة العميل") ||
                        line.contains("CYRUSTECH") || line.contains("شكراً") ||
                        line.contains("رقم الإيصال") || line.contains("الرقم الفوري") ||
                        line.contains("طريقة الدفع") || line.matches("^\\d{2}/\\d{2}/\\d{4}.*") ||
                        line.matches("^\\d{2}:\\d{2}.*")) {
                        printer.setAlignment(Printer.Alignment.CENTER);
                    } else {
                        printer.setAlignment(Printer.Alignment.LEFT);
                    }
                    
                    boolean isImportant = line.contains("عملية ناجحة") || 
                                         line.contains("CYRUSTECH") ||
                                         line.contains("المبلغ الكلي") ||
                                         line.contains("EGP") ||
                                         (line.contains("║") && !line.trim().equals("║"));
                    
                    boolean isBold = line.contains("عملية ناجحة") ||
                                   line.contains("CYRUSTECH") ||
                                   line.contains("المبلغ الكلي");
                    
                    PaxA930Printer.FontSize fontSize = isImportant ? 
                        PaxA930Printer.FontSize.LARGE : 
                        PaxA930Printer.FontSize.SMALL;
                    
                    printer.printText(line, isBold, 0x000000, fontSize);
                }

                printer.printText("", false);
                printer.printText("", false);
                printer.printText("", false);
                printer.printText("", false);
                printer.printText("", false);

                printer.addToPrint(true);

                Log.d(TAG, "Custom lines sent to printer");

            } catch (Throwable e) {
                Log.e(TAG, "Error printing custom lines", e);
                if (printPromise != null) {
                    printPromise.reject("PRINT_ERROR", "Failed to print: " + e.getMessage(), e);
                    printPromise = null;
                }
            }
        });
    }

    /**
     * Test print function
     */
    @ReactMethod
    public void testPrint(Promise promise) {
        this.printPromise = promise;

        UiThreadUtil.runOnUiThread(() -> {
            try {
                ensurePrinterInitialized();

                Log.d(TAG, "========================================");
                Log.d(TAG, "TEST PRINT STARTED");
                Log.d(TAG, "========================================");

                printer.clearData();

                printer.printText(" ", false);

                printer.setAlignment(Printer.Alignment.CENTER);
                printer.printText("╔═══════════════════════════════════╗", false);
                printer.printText("║      PAX A960 PRINTER TEST        ║", true, 0x000000, PaxA930Printer.FontSize.LARGE);
                printer.printText("╚═══════════════════════════════════╝", false);
                printer.printText(" ", false);

                printer.printText("عملية تجريبية", true, 0x000000, PaxA930Printer.FontSize.LARGE);
                printer.printText(" ", false);

                printer.printText("........................................", false);
                printer.printText(" ", false);

                printer.printText("Date: " + new java.text.SimpleDateFormat("yyyy-MM-dd").format(new java.util.Date()), false, 0x000000, PaxA930Printer.FontSize.LARGE);
                printer.printText("Time: " + new java.text.SimpleDateFormat("HH:mm:ss").format(new java.util.Date()), false, 0x000000, PaxA930Printer.FontSize.LARGE);
                printer.printText(" ", false);

                printer.printText("........................................", false);
                printer.printText(" ", false);

                printer.printText("نسخة تجريبية", false, 0x000000, PaxA930Printer.FontSize.LARGE);
                printer.printText(" ", false);
                printer.printText(" ", false);

                printer.printText("CYRUSTECH", true, 0x000000, PaxA930Printer.FontSize.LARGE);
                printer.printText("Test Successful!", false, 0x000000, PaxA930Printer.FontSize.LARGE);
                printer.printText(" ", false);

                printer.printText("", false);
                printer.printText("", false);
                printer.printText("", false);
                printer.printText("", false);
                printer.printText("", false);

                printer.addToPrint(true);

                Log.d(TAG, "Test print data sent to printer");

            } catch (Throwable e) {
                Log.e(TAG, "Error in test print", e);
                if (printPromise != null) {
                    printPromise.reject("PRINT_ERROR", "Test print failed: " + e.getMessage(), e);
                    printPromise = null;
                }
            }
        });
    }

    /**
     * Close printer connection
     */
    @ReactMethod
    public void closePrinter(Promise promise) {
        try {
            if (printer != null) {
                printer.close();
                printer = null;
                Log.d(TAG, "Printer connection closed");
            }
            promise.resolve("Printer closed");
        } catch (Throwable e) {
            Log.e(TAG, "Error closing printer", e);
            promise.reject("CLOSE_ERROR", "Failed to close printer: " + e.getMessage(), e);
        }
    }

    // PrinterListener implementation
    @Override
    public void printingWillStart() {
        Log.d(TAG, "📝 Printing will start...");
    }

    @Override
    public void printingFailWithException(Throwable throwable) {
        Log.e(TAG, "❌ Printing failed with exception", throwable);
        if (printPromise != null) {
            printPromise.reject("PRINT_FAILED", "Printing failed: " + throwable.getMessage(), throwable);
            printPromise = null;
        }
    }

    @Override
    public void onFinishDocumentPrinting() {
        Log.d(TAG, "✅ Document printing finished successfully");
        if (printPromise != null) {
            printPromise.resolve("Print completed successfully");
            printPromise = null;
        }
    }

    @Override
    public Activity getActivity() {
        Activity activity = getCurrentActivity();
        if (activity == null) {
            activity = reactContext.getCurrentActivity();
        }
        return activity;
    }
}