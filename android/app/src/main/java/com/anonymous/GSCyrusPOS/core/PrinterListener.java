package com.anonymous.GSCyrusPOS.core;

import android.app.Activity;

/**
 * Methods need to run on ui thread!
 */
public interface PrinterListener {

    void printingWillStart();

    void printingFailWithException(Throwable throwable);

    void onFinishDocumentPrinting();

    Activity getActivity();

}
