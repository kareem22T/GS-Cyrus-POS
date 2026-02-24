package com.anonymous.GSCyrusPOS.core.exception;

public class CannotConnectPrinterException extends PrinterException{

    public CannotConnectPrinterException() {
    }

    public CannotConnectPrinterException(String message) {
        super(message);
    }

    public CannotConnectPrinterException(String message, Throwable cause) {
        super(message, cause);
    }

    public CannotConnectPrinterException(Throwable cause) {
        super(cause);
    }
}
