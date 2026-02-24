package com.anonymous.GSCyrusPOS

import android.util.Log
import com.fawry.pos.retailer.connect.FawryConnect
import com.fawry.pos.retailer.connect.model.payment.PaymentOptionType
import com.fawry.pos.retailer.modelBuilder.`void`.CardVoid

object VoidHelper {

    private const val TAG = "VoidHelper"

    /**
     * Request a void builder from FawryConnect via reflection because "requestVoid"
     * lives in a package named "void" which is a reserved keyword in Java.
     * Kotlin allows it via backticks in the import above.
     */
    @JvmStatic
    fun createVoidBuilder(fawryConnect: FawryConnect): Any? {
        return try {
            val method = fawryConnect.javaClass.getMethod(
                "requestVoid",
                PaymentOptionType::class.java
            )
            method.invoke(fawryConnect, PaymentOptionType.CARD)
        } catch (e: Exception) {
            Log.e(TAG, "createVoidBuilder failed: ${e.message}", e)
            null
        }
    }

    /**
     * Configure and send the void request.
     * Casts the builder to CardVoid.Builder and calls send() directly
     * — same pattern as CardRefund.Builder.send() which works without reflection.
     */
    @JvmStatic
    fun configureAndSendVoid(
        builder: Any,
        fcrn: String,
        orderId: String,
        callback: FawryConnect.OnTransactionCallBack
    ) {
        val voidBuilder = builder as CardVoid.Builder
        voidBuilder
            .setTransactionFCRN(fcrn)
            .setOrderID(orderId)
            .setPrintReceipt(true)
            .setDisplayInvoice(true)
            .send(callback)
    }
}