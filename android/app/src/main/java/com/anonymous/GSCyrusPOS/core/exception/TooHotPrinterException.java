package com.anonymous.GSCyrusPOS.core.exception;

public class TooHotPrinterException extends PrinterException{

    public TooHotPrinterException() {
    }

    public TooHotPrinterException(String message) {
        super(message);
    }

    public TooHotPrinterException(String message, Throwable cause) {
        super(message, cause);
    }

    public TooHotPrinterException(Throwable cause) {
        super(cause);
    }
}
