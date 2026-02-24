package com.anonymous.GSCyrusPOS;

import android.app.Activity;
import android.content.Context;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.UiThreadUtil;

// Import Fawry SDK classes
import com.fawry.pos.retailer.connect.FawryConnect;
import com.fawry.pos.retailer.ipc.IPCConnectivity;
import com.fawry.pos.retailer.connect.model.connection.ConnectionType;
import com.fawry.pos.retailer.connect.model.messages.user.UserData;
import com.fawry.pos.retailer.connect.model.messages.user.UserType;
import com.fawry.pos.retailer.connect.model.payment.PaymentOptionType;
import com.fawry.pos.retailer.modelBuilder.sale.CardSale;
import com.fawry.pos.retailer.modelBuilder.sale.CashSale;
import com.fawry.pos.retailer.modelBuilder.inquiry.Inquiry;
import com.fawry.pos.retailer.modelBuilder.refund.CardRefund;
// import com.fawry.pos.retailer.modelBuilder.*;
import com.fawry.pos.retailer.connect.model.payment.inquiry.IdType;
import com.fawry.pos.retailer.connect.model.ErrorCode;

import android.util.Log;
import kotlin.Unit;

public class FawryPaymentModule extends ReactContextBaseJavaModule {
    private static final String TAG = "FawryPaymentModule";
    private FawryConnect fawryConnect;
    private ReactApplicationContext reactContext;

    public FawryPaymentModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "FawryPayment";
    }

    /**
     * Get a valid context for Fawry SDK.
     * Tries to get current Activity first, falls back to Application context.
     * 
     * @return Context or null if neither is available
     */
    @Nullable
    private Context getValidContext() {
        Activity activity = getCurrentActivity();
        if (activity != null) {
            return activity;
        }
        return reactContext.getApplicationContext();
    }

    @ReactMethod
    public void connect(String username, String password, Promise promise) {
        Log.d(TAG, "========================================");
        Log.d(TAG, "CONNECT METHOD CALLED");
        Log.d(TAG, "Username: " + username);
        Log.d(TAG, "========================================");
        
        UiThreadUtil.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    Context context = getValidContext();
                    
                    if (context == null) {
                        Log.e(TAG, "ERROR: Context is null!");
                        promise.reject("NO_CONTEXT", "Context is null - cannot connect to Fawry");
                        return;
                    }

                    Log.d(TAG, "Using context: " + context.getClass().getSimpleName());
                    Log.d(TAG, "Context type: " + (context instanceof Activity ? "Activity" : "Application"));

                    UserData userData = new UserData(
                            username,
                            password,
                            UserType.MCC
                    );
                    
                    Log.d(TAG, "UserData created successfully");
                    Log.d(TAG, "UserType: " + UserType.MCC);

                    FawryConnect.OnConnectionCallBack connectionCallback = new FawryConnect.OnConnectionCallBack(
                            new Unit[]{},
                            () -> {
                                Log.d(TAG, "========================================");
                                Log.d(TAG, "✓ FAWRY CONNECTED SUCCESSFULLY (IPC)");
                                Log.d(TAG, "========================================");
                                promise.resolve("CONNECTED");
                                return Unit.INSTANCE;
                            },
                            () -> {
                                Log.w(TAG, "========================================");
                                Log.w(TAG, "⚠ Fawry disconnected");
                                Log.w(TAG, "========================================");
                                return Unit.INSTANCE;
                            },
                            (errorCode, cause) -> {
                                Log.e(TAG, "========================================");
                                Log.e(TAG, "✗ CONNECTION FAILED");
                                Log.e(TAG, "Error Code: " + errorCode);
                                Log.e(TAG, "Error Message: " + (cause != null ? cause.getMessage() : "Unknown"));
                                Log.e(TAG, "========================================", cause);
                                promise.reject("CONNECTION_FAILED", errorCode != null ? errorCode.toString() : "Unknown error", cause);
                                return Unit.INSTANCE;
                            }
                    );
                    
                    Log.d(TAG, "Connection callback created");
                    Log.d(TAG, "Calling FawryConnect.setup()...");

                    IPCConnectivity.Builder builder = FawryConnect.setup(
                            ConnectionType.IPC,
                            userData,
                            context
                    );
                    
                    Log.d(TAG, "Builder created successfully");
                    Log.d(TAG, "Configuring builder...");

                    fawryConnect = builder
                            .setContext(context)
                            .setConnectionCallBack(connectionCallback)
                            .connect();
                    
                    Log.d(TAG, "Connect() method called on builder");
                    Log.d(TAG, "Waiting for connection callback...");

                } catch (Exception e) {
                    Log.e(TAG, "========================================");
                    Log.e(TAG, "✗ EXCEPTION IN CONNECT METHOD");
                    Log.e(TAG, "Exception type: " + e.getClass().getName());
                    Log.e(TAG, "Exception message: " + e.getMessage());
                    Log.e(TAG, "========================================", e);
                    promise.reject("CONNECT_ERROR", e.getMessage(), e);
                }
            }
        });
    }

    @ReactMethod
    public void initiateCardPayment(ReadableMap paymentData, Promise promise) {
        UiThreadUtil.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (fawryConnect == null) {
                        promise.reject("NOT_CONNECTED", "Please connect to Fawry first");
                        return;
                    }

                    if (!fawryConnect.isConnected()) {
                        promise.reject("NOT_CONNECTED", "Fawry connection lost. Please reconnect.");
                        return;
                    }

                    double amount = paymentData.getDouble("amount");
                    String orderId = paymentData.getString("orderId");
                    String btcString = paymentData.getString("btc");
                    long btc = Long.parseLong(btcString);

                    Log.d(TAG, "========================================");
                    Log.d(TAG, "INITIATING CARD PAYMENT");
                    Log.d(TAG, "Amount: " + amount);
                    Log.d(TAG, "Order ID: " + orderId);
                    Log.d(TAG, "BTC: " + btc);
                    Log.d(TAG, "========================================");

                    Context context = getValidContext();
                    if (context == null) {
                        Log.e(TAG, "ERROR: Context is null!");
                        promise.reject("NO_CONTEXT", "Context is null - cannot process payment");
                        return;
                    }

                    Log.d(TAG, "Creating CardSale.Builder...");
                    CardSale.Builder saleBuilder = fawryConnect.requestSale(PaymentOptionType.CARD);
                    
                    if (saleBuilder == null) {
                        Log.e(TAG, "ERROR: Builder is null!");
                        promise.reject("BUILDER_ERROR", "Failed to create sale builder");
                        return;
                    }
                    
                    Log.d(TAG, "Builder created, setting parameters...");
                    saleBuilder
                        // .setContext(context)
                        .setAmount(amount)
                        .setCurrency("EGP")
                        .setOrderID(orderId)
                        .setGroupReferenceNumber(orderId)
                        .setPrintReceipt(true)
                        .setDisplayInvoice(true);
                        
                    Log.d(TAG, "Parameters set, creating callback...");
                    FawryConnect.OnTransactionCallBack callback = new FawryConnect.OnTransactionCallBack(
                        new Unit[]{},
                        (response) -> {
                            Log.d(TAG, "========================================");
                            Log.d(TAG, "✓ CARD PAYMENT SUCCESSFUL");
                            Log.d(TAG, "Response: " + response);
                            Log.d(TAG, "========================================");
                            
                            WritableMap result = Arguments.createMap();
                            result.putString("status", "success");
                            result.putString("response", response);
                            
                            promise.resolve(result);
                            return Unit.INSTANCE;
                        },
                        (errorCode, cause) -> {
                            Log.e(TAG, "========================================");
                            Log.e(TAG, "✗ CARD PAYMENT FAILED");
                            Log.e(TAG, "Error Code: " + errorCode);
                            if (errorCode != null) {
                                Log.e(TAG, "Error Code Name: " + errorCode.name());
                            }
                            Log.e(TAG, "Error: " + (cause != null ? cause.getMessage() : "Unknown"));
                            Log.e(TAG, "========================================", cause);
                            
                            promise.reject(
                                "PAYMENT_FAILED", 
                                errorCode != null ? errorCode.toString() : "Unknown error", 
                                cause
                            );
                            return Unit.INSTANCE;
                        }
                    );
                    
                    Log.d(TAG, "Callback created, calling send with BTC: " + btc);
                    saleBuilder.send(btc, callback);

                    Log.d(TAG, "Card payment request sent, waiting for response...");

                } catch (NumberFormatException e) {
                    Log.e(TAG, "Invalid BTC format", e);
                    promise.reject("INVALID_BTC", "BTC must be a valid number", e);
                } catch (Exception e) {
                    Log.e(TAG, "========================================");
                    Log.e(TAG, "✗ CARD PAYMENT EXCEPTION");
                    Log.e(TAG, "Exception: " + e.getMessage());
                    Log.e(TAG, "========================================", e);
                    promise.reject("PAYMENT_ERROR", e.getMessage(), e);
                }
            }
        });
    }

    @ReactMethod
    public void initiateCashPayment(ReadableMap paymentData, Promise promise) {
        UiThreadUtil.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (fawryConnect == null) {
                        promise.reject("NOT_CONNECTED", "Please connect to Fawry first");
                        return;
                    }

                    if (!fawryConnect.isConnected()) {
                        promise.reject("NOT_CONNECTED", "Fawry connection lost. Please reconnect.");
                        return;
                    }

                    double amount = paymentData.getDouble("amount");
                    String orderId = paymentData.getString("orderId");
                    String btcString = paymentData.getString("btc");
                    long btc = Long.parseLong(btcString);

                    Log.d(TAG, "========================================");
                    Log.d(TAG, "INITIATING CASH PAYMENT");
                    Log.d(TAG, "Amount: " + amount);
                    Log.d(TAG, "Order ID: " + orderId);
                    Log.d(TAG, "BTC: " + btc);
                    Log.d(TAG, "========================================");

                    Context context = getValidContext();
                    if (context == null) {
                        Log.e(TAG, "ERROR: Context is null!");
                        promise.reject("NO_CONTEXT", "Context is null - cannot process payment");
                        return;
                    }

                    Log.d(TAG, "Creating CashSale.Builder...");
                    CashSale.Builder saleBuilder = fawryConnect.requestSale(PaymentOptionType.CASH);
                    
                    if (saleBuilder == null) {
                        Log.e(TAG, "ERROR: Builder is null!");
                        promise.reject("BUILDER_ERROR", "Failed to create sale builder");
                        return;
                    }
                    
                    Log.d(TAG, "Builder created, setting parameters...");
                    saleBuilder
                        // .setContext(context)  // ← CRITICAL: Added this line
                        .setAmount(amount)
                        .setCurrency("EGP")
                        .setOrderID(orderId)
                        .setGroupReferenceNumber(orderId)
                        .setPrintReceipt(true)
                        .setDisplayInvoice(true);
                        
                    Log.d(TAG, "Parameters set, creating callback...");
                    FawryConnect.OnTransactionCallBack callback = new FawryConnect.OnTransactionCallBack(
                        new Unit[]{},
                        (response) -> {
                            Log.d(TAG, "========================================");
                            Log.d(TAG, "✓ CASH PAYMENT SUCCESSFUL");
                            Log.d(TAG, "Response: " + response);
                            Log.d(TAG, "========================================");
                            
                            WritableMap result = Arguments.createMap();
                            result.putString("status", "success");
                            result.putString("response", response);
                            
                            promise.resolve(result);
                            return Unit.INSTANCE;
                        },
                        (errorCode, cause) -> {
                            Log.e(TAG, "========================================");
                            Log.e(TAG, "✗ CASH PAYMENT FAILED");
                            Log.e(TAG, "Error Code: " + errorCode);
                            if (errorCode != null) {
                                Log.e(TAG, "Error Code Name: " + errorCode.name());
                            }
                            Log.e(TAG, "Error: " + (cause != null ? cause.getMessage() : "Unknown"));
                            Log.e(TAG, "========================================", cause);
                            
                            promise.reject(
                                "PAYMENT_FAILED", 
                                errorCode != null ? errorCode.toString() : "Unknown error", 
                                cause
                            );
                            return Unit.INSTANCE;
                        }
                    );
                    
                    Log.d(TAG, "Callback created, calling send with BTC: " + btc);
                    saleBuilder.send(btc, callback);

                    Log.d(TAG, "Cash payment request sent, waiting for response...");

                } catch (NumberFormatException e) {
                    Log.e(TAG, "Invalid BTC format", e);
                    promise.reject("INVALID_BTC", "BTC must be a valid number", e);
                } catch (Exception e) {
                    Log.e(TAG, "========================================");
                    Log.e(TAG, "✗ CASH PAYMENT EXCEPTION");
                    Log.e(TAG, "Exception: " + e.getMessage());
                    Log.e(TAG, "========================================", e);
                    promise.reject("PAYMENT_ERROR", e.getMessage(), e);
                }
            }
        });
    }

    @ReactMethod
    public void voidTransaction(String fcrn, String orderId, Promise promise) {
        UiThreadUtil.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (fawryConnect == null) {
                        Log.e(TAG, "Cannot perform void - not connected");
                        promise.reject("NOT_CONNECTED", "Please connect to Fawry first");
                        return;
                    }

                    if (!fawryConnect.isConnected()) {
                        promise.reject("NOT_CONNECTED", "Fawry connection lost. Please reconnect.");
                        return;
                    }

                    Log.d(TAG, "========================================");
                    Log.d(TAG, "INITIATING VOID TRANSACTION");
                    Log.d(TAG, "FCRN: " + fcrn);
                    Log.d(TAG, "Order ID: " + orderId);
                    Log.d(TAG, "========================================");

                    Log.d(TAG, "Creating void builder via VoidHelper...");
                    Object voidBuilder = VoidHelper.createVoidBuilder(fawryConnect);

                    if (voidBuilder == null) {
                        Log.e(TAG, "ERROR: Void builder is null!");
                        promise.reject("BUILDER_ERROR", "Failed to create void builder");
                        return;
                    }

                    Log.d(TAG, "Void builder created successfully");

                    FawryConnect.OnTransactionCallBack callback = new FawryConnect.OnTransactionCallBack(
                            new Unit[]{},
                            (response) -> {
                                Log.d(TAG, "========================================");
                                Log.d(TAG, "✓ VOID TRANSACTION SUCCESSFUL");
                                Log.d(TAG, "Response: " + response);
                                Log.d(TAG, "========================================");

                                WritableMap result = Arguments.createMap();
                                result.putString("status", "success");
                                result.putString("response", response);
                                result.putString("fcrn", fcrn);

                                promise.resolve(result);
                                return Unit.INSTANCE;
                            },
                            (errorCode, cause) -> {
                                Log.e(TAG, "========================================");
                                Log.e(TAG, "✗ VOID TRANSACTION FAILED");
                                Log.e(TAG, "Error Code: " + errorCode);
                                if (errorCode != null) {
                                    Log.e(TAG, "Error Code Name: " + errorCode.name());
                                }
                                Log.e(TAG, "Error: " + (cause != null ? cause.getMessage() : "Unknown"));
                                Log.e(TAG, "========================================", cause);

                                promise.reject(
                                        "VOID_FAILED",
                                        errorCode != null ? errorCode.toString() : "Unknown error",
                                        cause
                                );
                                return Unit.INSTANCE;
                            }
                    );

                    Log.d(TAG, "Configuring and sending void request with FCRN, orderId...");
                    VoidHelper.configureAndSendVoid(voidBuilder, fcrn, orderId, callback);

                    Log.d(TAG, "Void request sent, waiting for response...");

                } catch (Exception e) {
                    Log.e(TAG, "========================================");
                    Log.e(TAG, "✗ VOID TRANSACTION EXCEPTION");
                    Log.e(TAG, "Exception type: " + e.getClass().getName());
                    Log.e(TAG, "Exception message: " + e.getMessage());
                    Log.e(TAG, "========================================", e);
                    promise.reject("VOID_ERROR", e.getMessage(), e);
                }
            }
        });
    }

    @ReactMethod
    public void refundTransaction(String fcrn, double amount, String orderId, Promise promise) {
        UiThreadUtil.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (fawryConnect == null) {
                        Log.e(TAG, "Cannot perform refund - not connected");
                        promise.reject("NOT_CONNECTED", "Please connect to Fawry first");
                        return;
                    }

                    if (!fawryConnect.isConnected()) {
                        promise.reject("NOT_CONNECTED", "Fawry connection lost. Please reconnect.");
                        return;
                    }

                    Log.d(TAG, "========================================");
                    Log.d(TAG, "INITIATING REFUND TRANSACTION BY ORDER ID");
                    Log.d(TAG, "Amount: " + amount);
                    Log.d(TAG, "Order ID: " + orderId);
                    Log.d(TAG, "========================================");

                    Context context = getValidContext();
                    if (context == null) {
                        Log.e(TAG, "ERROR: Context is null!");
                        promise.reject("NO_CONTEXT", "Context is null - cannot process refund");
                        return;
                    }

                    Log.d(TAG, "Creating CardRefund.Builder...");
                    CardRefund.Builder refundBuilder = fawryConnect.requestRefund(PaymentOptionType.CARD);

                    if (refundBuilder == null) {
                        Log.e(TAG, "ERROR: Refund builder is null!");
                        promise.reject("BUILDER_ERROR", "Failed to create refund builder");
                        return;
                    }

                    Log.d(TAG, "Builder created, setting parameters...");
                    Log.d(TAG, "FCRN: " + fcrn);
                    // Prefer FCRN (Fawry's own reference) — most reliable lookup.
                    // Fall back to orderID if FCRN was not captured during the original sale.
                    if (fcrn != null && !fcrn.isEmpty()) {
                        Log.d(TAG, "Using FCRN for refund lookup");
                        refundBuilder
                                .setTransactionFCRN(fcrn)
                                .setAmount(amount)
                                .setPrintReceipt(true)
                                .setDisplayInvoice(true);
                    } else {
                        Log.d(TAG, "No FCRN — falling back to orderID lookup");
                        refundBuilder
                                .setAmount(amount)
                                .setOrderID(orderId)
                                .setPrintReceipt(true)
                                .setDisplayInvoice(true);
                    }

                    Log.d(TAG, "Parameters set, creating callback...");
                    FawryConnect.OnTransactionCallBack callback = new FawryConnect.OnTransactionCallBack(
                            new Unit[]{},
                            (response) -> {
                                Log.d(TAG, "========================================");
                                Log.d(TAG, "✓ REFUND TRANSACTION SUCCESSFUL");
                                Log.d(TAG, "Response: " + response);
                                Log.d(TAG, "========================================");

                                WritableMap result = Arguments.createMap();
                                result.putString("status", "success");
                                result.putString("response", response);
                                result.putString("orderId", orderId);
                                result.putDouble("amount", amount);

                                promise.resolve(result);
                                return Unit.INSTANCE;
                            },
                            (errorCode, cause) -> {
                                Log.e(TAG, "========================================");
                                Log.e(TAG, "✗ REFUND TRANSACTION FAILED");
                                Log.e(TAG, "Error Code: " + errorCode);
                                if (errorCode != null) {
                                    Log.e(TAG, "Error Code Name: " + errorCode.name());
                                }
                                Log.e(TAG, "Error: " + (cause != null ? cause.getMessage() : "Unknown"));
                                Log.e(TAG, "========================================", cause);

                                promise.reject(
                                        "REFUND_FAILED",
                                        errorCode != null ? errorCode.toString() : "Unknown error",
                                        cause
                                );
                                return Unit.INSTANCE;
                            }
                    );

                    Log.d(TAG, "Callback created, calling send with BTC: 123");
                    refundBuilder.send(123L, callback); // BTC for Card Refund is 123

                    Log.d(TAG, "Refund request sent, waiting for response...");

                } catch (Exception e) {
                    Log.e(TAG, "========================================");
                    Log.e(TAG, "✗ REFUND TRANSACTION EXCEPTION");
                    Log.e(TAG, "Exception: " + e.getMessage());
                    Log.e(TAG, "========================================", e);
                    promise.reject("REFUND_ERROR", e.getMessage(), e);
                }
            }
        });
    }

    @ReactMethod
    public void transactionInquiry(ReadableMap inquiryData, Promise promise) {
        UiThreadUtil.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (fawryConnect == null) {
                        Log.e(TAG, "Cannot perform inquiry - not connected");
                        promise.reject("NOT_CONNECTED", "Please connect to Fawry first");
                        return;
                    }

                    if (!fawryConnect.isConnected()) {
                        promise.reject("NOT_CONNECTED", "Fawry connection lost. Please reconnect.");
                        return;
                    }

                    String transactionId = inquiryData.getString("transactionId");
                    String idType = inquiryData.hasKey("idType") ? inquiryData.getString("idType") : "FCRN";
                    String fromDate = inquiryData.getString("fromDate");
                    String toDate = inquiryData.getString("toDate");
                    boolean printReceipt = inquiryData.hasKey("printReceipt") ? inquiryData.getBoolean("printReceipt") : false;

                    Log.d(TAG, "========================================");
                    Log.d(TAG, "TRANSACTION INQUIRY");
                    Log.d(TAG, "Transaction ID: " + transactionId);
                    Log.d(TAG, "ID Type: " + idType);
                    Log.d(TAG, "From Date: " + fromDate);
                    Log.d(TAG, "To Date: " + toDate);
                    Log.d(TAG, "Print Receipt: " + printReceipt);
                    Log.d(TAG, "========================================");

                    Context context = getValidContext();
                    if (context == null) {
                        Log.e(TAG, "ERROR: Context is null!");
                        promise.reject("NO_CONTEXT", "Context is null - cannot perform inquiry");
                        return;
                    }

                    Inquiry.Builder inquiryBuilder = fawryConnect.requestInquiry();
                    
                    if (inquiryBuilder == null) {
                        Log.e(TAG, "ERROR: Builder is null!");
                        promise.reject("BUILDER_ERROR", "Failed to create inquiry builder");
                        return;
                    }
                    
                    IdType idTypeEnum = idType.equals("ORDER_ID") ? IdType.ORDER_ID : IdType.FCRN;
                    
                    inquiryBuilder
                        // .setContext(context)
                        .setIdType(idTypeEnum)
                        .setTransactionId(transactionId)
                        .setFromDate(fromDate)
                        .setToDate(toDate)
                        .setPrintReceipt(printReceipt)
                        .send(new FawryConnect.OnTransactionCallBack(
                            new Unit[]{},
                            (response) -> {
                                Log.d(TAG, "========================================");
                                Log.d(TAG, "✓ INQUIRY SUCCESSFUL");
                                Log.d(TAG, "Response: " + response);
                                Log.d(TAG, "========================================");
                                
                                WritableMap result = Arguments.createMap();
                                result.putString("status", "success");
                                result.putString("response", response);
                                result.putString("transactionId", transactionId);
                                
                                promise.resolve(result);
                                return Unit.INSTANCE;
                            },
                            (errorCode, cause) -> {
                                Log.e(TAG, "========================================");
                                Log.e(TAG, "✗ INQUIRY FAILED");
                                Log.e(TAG, "Error Code: " + errorCode);
                                if (errorCode != null) {
                                    Log.e(TAG, "Error Code Name: " + errorCode.name());
                                }
                                Log.e(TAG, "Error: " + (cause != null ? cause.getMessage() : "Unknown"));
                                Log.e(TAG, "========================================", cause);
                                
                                promise.reject("INQUIRY_FAILED", errorCode != null ? errorCode.toString() : "Unknown error", cause);
                                return Unit.INSTANCE;
                            }
                        ));
                    
                    Log.d(TAG, "Inquiry request sent, waiting for response...");

                } catch (Exception e) {
                    Log.e(TAG, "========================================");
                    Log.e(TAG, "✗ INQUIRY EXCEPTION");
                    Log.e(TAG, "Exception: " + e.getMessage());
                    Log.e(TAG, "========================================", e);
                    promise.reject("INQUIRY_ERROR", e.getMessage(), e);
                }
            }
        });
    }

    @ReactMethod
    public void disconnect(Promise promise) {
        try {
            if (fawryConnect != null) {
                fawryConnect.disConnect();
                fawryConnect = null;
                promise.resolve("Disconnected successfully");
            } else {
                promise.resolve("Already disconnected");
            }
        } catch (Exception e) {
            promise.reject("DISCONNECT_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void isConnected(Promise promise) {
        try {
            Log.d(TAG, "Checking connection status...");
            
            if (fawryConnect != null) {
                boolean connected = fawryConnect.isConnected();
                Log.d(TAG, "FawryConnect instance exists");
                Log.d(TAG, "Connection status: " + (connected ? "CONNECTED" : "NOT CONNECTED"));
                promise.resolve(connected);
            } else {
                Log.w(TAG, "FawryConnect instance is null");
                promise.resolve(false);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking connection", e);
            promise.reject("CONNECTION_CHECK_ERROR", e.getMessage(), e);
        }
    }
    
    @ReactMethod
    public void getConnectionInfo(Promise promise) {
        try {
            WritableMap info = Arguments.createMap();
            
            boolean hasInstance = fawryConnect != null;
            boolean isConnected = hasInstance && fawryConnect.isConnected();
            
            info.putBoolean("hasInstance", hasInstance);
            info.putBoolean("isConnected", isConnected);
            info.putString("status", isConnected ? "CONNECTED" : "DISCONNECTED");
            
            Log.d(TAG, "Connection Info:");
            Log.d(TAG, "  - Has Instance: " + hasInstance);
            Log.d(TAG, "  - Is Connected: " + isConnected);
            
            promise.resolve(info);
        } catch (Exception e) {
            Log.e(TAG, "Error getting connection info", e);
            promise.reject("INFO_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void checkConnectionStatus(Promise promise) {
        try {
            WritableMap status = Arguments.createMap();
            
            if (fawryConnect == null) {
                status.putBoolean("instanceExists", false);
                status.putBoolean("isConnected", false);
                status.putString("message", "FawryConnect instance is null");
            } else {
                boolean connected = fawryConnect.isConnected();
                status.putBoolean("instanceExists", true);
                status.putBoolean("isConnected", connected);
                status.putString("message", connected ? "Connected to IPC" : "Not connected to IPC");
            }
            
            Log.d(TAG, "Connection Status: " + status.toString());
            promise.resolve(status);
        } catch (Exception e) {
            promise.reject("STATUS_ERROR", e.getMessage(), e);
        }
    }
}