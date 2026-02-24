package com.anonymous.GSCyrusPOS.core.exception;

public class TextPrintingFailurePrinterException extends PrinterException{

    public TextPrintingFailurePrinterException() {
    }

    public TextPrintingFailurePrinterException(String message) {
        super(message);
    }

    public TextPrintingFailurePrinterException(String message, Throwable cause) {
        super(message, cause);
    }

    public TextPrintingFailurePrinterException(Throwable cause) {
        super(cause);
    }
}
